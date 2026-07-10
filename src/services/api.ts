import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.100:3000/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Token injection — populated by authStore
export let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

// Populated by authStore to allow the interceptor to trigger a refresh
export let onTokenExpired: (() => Promise<string | null>) | null = null;
export function setTokenExpiredHandler(handler: (() => Promise<string | null>) | null) {
  onTokenExpired = handler;
}

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

let isRefreshing = false;
let refreshQueue: ((token: string | null) => void)[] = [];

function processQueue(token: string | null) {
  refreshQueue.forEach((resolve) => resolve(token));
  refreshQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry && onTokenExpired) {
      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            } else {
              reject(err);
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      let newToken: string | null = null;
      try {
        newToken = await onTokenExpired();
      } catch {
        newToken = null;
      } finally {
        // Must flush exactly once per refresh cycle — a null token rejects the
        // queued requests; skipping this leaves them as promises that never settle.
        processQueue(newToken);
        isRefreshing = false;
      }
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }

    const message = err.response?.data?.error?.message ?? err.message;
    return Promise.reject(new Error(message));
  }
);
