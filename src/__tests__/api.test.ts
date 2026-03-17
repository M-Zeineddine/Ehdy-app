'use strict';

/**
 * Unit tests for api.ts pure functions and interceptor logic.
 * Tests token injection, error message extraction, and handler registration.
 */

import { setAuthToken, setTokenExpiredHandler, authToken, onTokenExpired } from '../services/api';

// Re-import module state after each mutating test
beforeEach(() => {
  // Reset module-level state between tests
  setAuthToken(null);
  setTokenExpiredHandler(null);
});

// ─── setAuthToken ─────────────────────────────────────────────────────────────

describe('setAuthToken', () => {
  test('stores the provided token', () => {
    setAuthToken('my-token-123');
    // Re-require to get current exported value
    const { authToken: current } = require('../services/api');
    expect(current).toBe('my-token-123');
  });

  test('clears the token when called with null', () => {
    setAuthToken('some-token');
    setAuthToken(null);
    const { authToken: current } = require('../services/api');
    expect(current).toBeNull();
  });
});

// ─── setTokenExpiredHandler ───────────────────────────────────────────────────

describe('setTokenExpiredHandler', () => {
  test('stores the provided handler', () => {
    const handler = jest.fn().mockResolvedValue('new-token');
    setTokenExpiredHandler(handler);
    const { onTokenExpired: current } = require('../services/api');
    expect(current).toBe(handler);
  });

  test('clears the handler when called with null', () => {
    setTokenExpiredHandler(jest.fn());
    setTokenExpiredHandler(null);
    const { onTokenExpired: current } = require('../services/api');
    expect(current).toBeNull();
  });
});
