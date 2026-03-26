import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import type { MerchantUser } from '../store/merchantAuthStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.100:3000/v1';

// Separate axios instance for merchant portal — uses its own token
const merchantApi = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

merchantApi.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('ehdy_merchant_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

merchantApi.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error?.message ?? err.message;
    return Promise.reject(new Error(message));
  }
);

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  merchant_user: MerchantUser;
}

export interface DashboardData {
  today: { redemptions: number; revenue: number };
  month: { redemptions: number; revenue: number };
  active_codes: number;
  recent_redemptions: RedemptionItem[];
}

export interface GiftValidation {
  is_valid: boolean;
  gift: {
    type: 'store_credit' | 'gift_item';
    value: number | null;
    currency: string;
    item_name: string | null;
    recipient_name: string | null;
    merchant_name: string;
    current_balance: number | null;
  };
}

export interface RedemptionItem {
  redemption_code: string;
  redeemed_at: string;
  redeemed_amount: number | null;
  currency_code: string;
  gift_card_name: string;
  type: string;
}

export interface RedemptionResult {
  success: boolean;
  remaining_balance: number | null;
  message: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function merchantLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await merchantApi.post<{ data: LoginResponse }>('/merchant/login', { email, password });
  return res.data.data;
}

export async function getMerchantDashboard(): Promise<DashboardData> {
  const res = await merchantApi.get<{ data: { dashboard: DashboardData } }>('/merchant/dashboard');
  return res.data.data.dashboard;
}

export async function validateRedemption(code: string): Promise<GiftValidation> {
  const res = await merchantApi.post<{ data: GiftValidation }>('/merchant/validate-redemption', {
    redemption_code: code.toUpperCase(),
  });
  return res.data.data;
}

export async function confirmRedemption(
  code: string,
  amountToRedeem?: number
): Promise<RedemptionResult> {
  const res = await merchantApi.post<{ data: RedemptionResult }>('/merchant/confirm-redemption', {
    redemption_code: code.toUpperCase(),
    amount_to_redeem: amountToRedeem,
  });
  return res.data.data;
}

export async function getMerchantRedemptions(params?: {
  page?: number;
  limit?: number;
  date_from?: string;
  date_to?: string;
}): Promise<{ redemptions: RedemptionItem[]; pagination: any }> {
  const res = await merchantApi.get<{ data: RedemptionItem[]; pagination: any }>(
    '/merchant/redemptions',
    { params }
  );
  return { redemptions: res.data.data, pagination: res.data.pagination };
}
