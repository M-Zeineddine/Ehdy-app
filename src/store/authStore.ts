import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types';
import { setAuthToken, setTokenExpiredHandler } from '../services/api';
import { refreshToken as callRefreshToken } from '../services/authService';

const TOKEN_KEY = 'ehdy_access_token';
const REFRESH_KEY = 'ehdy_refresh_token';
const USER_KEY = 'ehdy_user';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string, refreshToken: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

function registerRefreshHandler(get: () => AuthState) {
  setTokenExpiredHandler(async () => {
    const storedRefresh = get().refreshToken;
    if (!storedRefresh) return null;
    try {
      const newToken = await callRefreshToken(storedRefresh);
      setAuthToken(newToken);
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      get(); // trigger re-read
      useAuthStore.setState({ token: newToken });
      return newToken;
    } catch {
      await get().clearAuth();
      return null;
    }
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user, token, refreshToken) => {
    setAuthToken(token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user, token, refreshToken, isAuthenticated: true });
    registerRefreshHandler(get);
  },

  clearAuth: async () => {
    setAuthToken(null);
    setTokenExpiredHandler(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        setAuthToken(token);
        set({ user, token, refreshToken, isAuthenticated: true });
        registerRefreshHandler(get);
      }
    } catch {
      // corrupted storage — clear it
    } finally {
      set({ isLoading: false });
    }
  },
}));
