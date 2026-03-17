'use strict';

/**
 * Unit tests for authStore (Zustand).
 * Tests state transitions: setAuth, clearAuth, loadFromStorage.
 */

// ── Mocks (inline factories — avoid hoisting / TDZ issues) ───────────────────

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/api', () => ({
  api: { post: jest.fn(), get: jest.fn() },
  setAuthToken: jest.fn(),
  setTokenExpiredHandler: jest.fn(),
  authToken: null,
  onTokenExpired: null,
}));

jest.mock('../services/authService', () => ({
  refreshToken: jest.fn(),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

// Pull mocked functions — they are jest.fn() due to the factory above
import { setAuthToken, setTokenExpiredHandler } from '../services/api';
const mockSetAuthToken = setAuthToken as jest.Mock;
const mockSetTokenExpiredHandler = setTokenExpiredHandler as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as jest.Mock;
const mockSetItem = SecureStore.setItemAsync as jest.Mock;
const mockDeleteItem = SecureStore.deleteItemAsync as jest.Mock;

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_USER: User = {
  id: 'user-1',
  email: 'alice@example.com',
  first_name: 'Alice',
  last_name: 'Smith',
  is_email_verified: true,
};

const MOCK_TOKEN = 'access-token-abc';
const MOCK_REFRESH = 'refresh-token-xyz';

function resetStore() {
  useAuthStore.setState({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Restore default resolved values after clearAllMocks resets them
  mockSetItem.mockResolvedValue(undefined);
  mockDeleteItem.mockResolvedValue(undefined);
  resetStore();
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe('initial state', () => {
  test('starts unauthenticated with isLoading=true', () => {
    resetStore();
    const { user, token, isAuthenticated, isLoading } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(token).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(isLoading).toBe(true);
  });
});

// ── setAuth ───────────────────────────────────────────────────────────────────

describe('setAuth', () => {
  test('sets user, token, refreshToken and isAuthenticated=true', async () => {
    await useAuthStore.getState().setAuth(MOCK_USER, MOCK_TOKEN, MOCK_REFRESH);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(MOCK_USER);
    expect(state.token).toBe(MOCK_TOKEN);
    expect(state.refreshToken).toBe(MOCK_REFRESH);
    expect(state.isAuthenticated).toBe(true);
  });

  test('calls setAuthToken with the access token', async () => {
    await useAuthStore.getState().setAuth(MOCK_USER, MOCK_TOKEN, MOCK_REFRESH);
    expect(mockSetAuthToken).toHaveBeenCalledWith(MOCK_TOKEN);
  });

  test('persists token and refresh token to SecureStore', async () => {
    await useAuthStore.getState().setAuth(MOCK_USER, MOCK_TOKEN, MOCK_REFRESH);

    expect(mockSetItem).toHaveBeenCalledWith('kado_access_token', MOCK_TOKEN);
    expect(mockSetItem).toHaveBeenCalledWith('kado_refresh_token', MOCK_REFRESH);
  });

  test('persists serialized user to SecureStore', async () => {
    await useAuthStore.getState().setAuth(MOCK_USER, MOCK_TOKEN, MOCK_REFRESH);

    expect(mockSetItem).toHaveBeenCalledWith('kado_user', JSON.stringify(MOCK_USER));
  });
});

// ── clearAuth ─────────────────────────────────────────────────────────────────

describe('clearAuth', () => {
  beforeEach(async () => {
    // Start each clearAuth test from an authenticated state
    await useAuthStore.getState().setAuth(MOCK_USER, MOCK_TOKEN, MOCK_REFRESH);
    jest.clearAllMocks();
    mockDeleteItem.mockResolvedValue(undefined);
  });

  test('clears user, token, and sets isAuthenticated=false', async () => {
    await useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  test('calls setAuthToken(null)', async () => {
    await useAuthStore.getState().clearAuth();
    expect(mockSetAuthToken).toHaveBeenCalledWith(null);
  });

  test('calls setTokenExpiredHandler(null)', async () => {
    await useAuthStore.getState().clearAuth();
    expect(mockSetTokenExpiredHandler).toHaveBeenCalledWith(null);
  });

  test('deletes all SecureStore keys', async () => {
    await useAuthStore.getState().clearAuth();

    expect(mockDeleteItem).toHaveBeenCalledWith('kado_access_token');
    expect(mockDeleteItem).toHaveBeenCalledWith('kado_refresh_token');
    expect(mockDeleteItem).toHaveBeenCalledWith('kado_user');
  });
});

// ── loadFromStorage ───────────────────────────────────────────────────────────

describe('loadFromStorage', () => {
  test('restores user and token when SecureStore has data', async () => {
    mockGetItem
      .mockResolvedValueOnce(MOCK_TOKEN)           // kado_access_token
      .mockResolvedValueOnce(MOCK_REFRESH)          // kado_refresh_token
      .mockResolvedValueOnce(JSON.stringify(MOCK_USER)); // kado_user

    await useAuthStore.getState().loadFromStorage();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(MOCK_USER);
    expect(state.token).toBe(MOCK_TOKEN);
    expect(state.isAuthenticated).toBe(true);
  });

  test('sets isLoading=false when storage has data', async () => {
    mockGetItem
      .mockResolvedValueOnce(MOCK_TOKEN)
      .mockResolvedValueOnce(MOCK_REFRESH)
      .mockResolvedValueOnce(JSON.stringify(MOCK_USER));

    await useAuthStore.getState().loadFromStorage();

    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  test('stays unauthenticated when no token in storage', async () => {
    mockGetItem.mockResolvedValue(null);

    await useAuthStore.getState().loadFromStorage();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  test('sets isLoading=false even when no token found (finally block)', async () => {
    mockGetItem.mockResolvedValue(null);

    await useAuthStore.getState().loadFromStorage();

    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  test('handles corrupted JSON in SecureStore gracefully — no throw, isLoading=false', async () => {
    mockGetItem
      .mockResolvedValueOnce(MOCK_TOKEN)
      .mockResolvedValueOnce(MOCK_REFRESH)
      .mockResolvedValueOnce('{not valid json!!!}');

    await expect(useAuthStore.getState().loadFromStorage()).resolves.not.toThrow();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  test('calls setAuthToken with the stored token', async () => {
    mockGetItem
      .mockResolvedValueOnce(MOCK_TOKEN)
      .mockResolvedValueOnce(MOCK_REFRESH)
      .mockResolvedValueOnce(JSON.stringify(MOCK_USER));

    await useAuthStore.getState().loadFromStorage();

    expect(mockSetAuthToken).toHaveBeenCalledWith(MOCK_TOKEN);
  });
});
