import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { queryClient } from '../lib/queryClient';

const TOKEN_KEY = 'ehdy_merchant_token';
const USER_KEY = 'ehdy_merchant_user';

export interface MerchantUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  merchant_id: string;
  merchant_name: string;
  role: 'owner' | 'manager' | 'staff';
  /** Branches this user is limited to; null = all branches */
  branch_ids: string[] | null;
}

interface MerchantAuthState {
  merchantUser: MerchantUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (merchantUser: MerchantUser, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

// Fire-and-forget re-fetch of the account after restoring a cached session, so
// a merchant user saved at login never goes stale when roles/branch scope
// change server-side (e.g. the branch_id → branch_ids migration). Offline
// keeps the cached copy; a 401 clears auth via the merchantApi interceptor.
// Lazy import: merchantPortalService imports this store, so a static import
// back would create a require cycle at module init.
async function refreshMerchantUserFromServer() {
  try {
    const { getMerchantMe } = await import('../services/merchantPortalService');
    const merchantUser = await getMerchantMe();
    if (!useMerchantAuthStore.getState().isAuthenticated) return; // signed out meanwhile
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(merchantUser));
    useMerchantAuthStore.setState({ merchantUser });
  } catch {
    // keep the cached user
  }
}

export const useMerchantAuthStore = create<MerchantAuthState>((set) => ({
  merchantUser: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (merchantUser, token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(merchantUser));
    set({ merchantUser, token, isAuthenticated: true });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ merchantUser: null, token: null, isAuthenticated: false });
    // Wipe cached server data (dashboard revenue, redemption history) so the
    // next staff account on a shared device isn't served this one's
    queryClient.clear();
  },

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      if (token && userJson) {
        const merchantUser = JSON.parse(userJson) as MerchantUser;
        set({ merchantUser, token, isAuthenticated: true });
        refreshMerchantUserFromServer();
      }
    } catch {
      // corrupted storage — ignore
    } finally {
      set({ isLoading: false });
    }
  },
}));
