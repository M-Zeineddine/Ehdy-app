import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useMerchantAuthStore, type MerchantUser } from '../store/merchantAuthStore';

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
  async (err) => {
    if (err.response?.status === 401) {
      // No merchant refresh flow exists — an expired/invalid token can only be
      // resolved by signing in again. Clearing auth flips the store so
      // AuthGate redirects to merchant login.
      await useMerchantAuthStore.getState().clearAuth();
    }
    const message = err.response?.data?.error?.message ?? err.message;
    return Promise.reject(new Error(message));
  }
);

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  merchant_user: MerchantUser;
}

/** Percent change vs. the previous period, computed server-side — the app
 *  only ever renders it, never re-derives it from raw revenue numbers. */
export interface Trend {
  text: string;
  up: boolean;
}

export interface DashboardData {
  today: { redemptions: number; revenue: number; trend: Trend | null };
  yesterday: { redemptions: number; revenue: number };
  month: { redemptions: number; revenue: number; trend: Trend | null };
  last_month: { redemptions: number; revenue: number };
  failed_attempts_today: number;
  /** Purchase (sale) stats — owner-only; null for managers/staff. Not
   *  branch-scoped, since a purchase happens online, not at a branch. */
  sales: {
    today: { sold: number; revenue: number; trend: Trend | null };
    yesterday: { sold: number; revenue: number };
    month: { sold: number; revenue: number; trend: Trend | null };
    last_month: { sold: number; revenue: number };
  } | null;
  /** Owner-only */
  best_seller: { name: string; count: number } | null;
  /** Owner-only; null unless the merchant has more than one active branch */
  branch_breakdown: { branch_id: string; branch_name: string; redemptions: number }[] | null;
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
    /** Branches the item can be redeemed at; null = any branch */
    redeemable_branches: { id: string; name: string }[] | null;
  };
}

export interface MerchantBranch {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  contact_phone: string | null;
  is_active: boolean;
}

export interface RedemptionItem {
  id: string;
  /** For a failed row, this is the raw code text the staff attempted — it may not resolve to a real gift */
  redemption_code: string;
  redeemed_at: string;
  /** Numeric columns come back as strings from Postgres — parse before formatting */
  redeemed_amount: string | null;
  currency_code: string | null;
  branch_name: string | null;
  gift_card_name: string | null;
  type: string | null;
  /** 'partial'/'completed' only ever occur for real redemptions; a 'failed'
   *  row never touched a gift instance, so most other fields are null. */
  status: 'partial' | 'completed' | 'failed';
  notes: string | null;
  item_description: string | null;
  item_image: string | null;
  sender_name: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  /** Only set when status === 'failed' */
  error_code: string | null;
  error_message: string | null;
  /** Only meaningful for store_credit; null for gift_item and failed rows */
  remaining_balance: string | null;
  initial_balance: string | null;
}

export interface PurchaseItem {
  id: string;
  sent_at: string;
  sender_name: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  personal_message: string | null;
  amount: string | null;
  currency_code: string;
  gift_card_name: string;
  /** Current redemption state of the gift this purchase created */
  is_redeemed: boolean | null;
  current_balance: string | null;
  initial_balance: string | null;
  redemption_status: 'active' | 'partially_redeemed' | 'redeemed';
  type: string;
  item_description: string | null;
  item_image: string | null;
}

export interface ActiveCodeItem {
  id: string;
  redemption_code: string;
  current_balance: string | null;
  initial_balance: string | null;
  currency_code: string;
  expiration_date: string | null;
  created_at: string;
  gift_card_name: string;
  type: string;
}

export interface RedemptionResult {
  success: boolean;
  remaining_balance: number | null;
  message: string;
}

/** Aggregate stats matching whatever filters are currently applied on the
 *  redemption history list — never derived by summing loaded rows client
 *  side, since pagination means only one page is ever in memory. */
export interface RedemptionsSummary {
  count: number;
  revenue: number;
  completed_count: number;
  partial_count: number;
  failed_count: number;
}

export interface PurchasesSummary {
  count: number;
  revenue: number;
}

/** value = $ still redeemable across active codes (0 for pure gift-item codes,
 *  which carry no balance) */
export interface ActiveCodesSummary {
  count: number;
  value: number;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function merchantLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await merchantApi.post<{ data: LoginResponse }>('/merchant/login', { email, password });
  return res.data.data;
}

/** Upload an image (owner only); returns the public URL to store in *_url fields. */
export async function uploadPortalImage(uri: string): Promise<string> {
  const name = uri.split('/').pop() ?? 'image.jpg';
  const ext = name.split('.').pop()?.toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const form = new FormData();
  form.append('image', { uri, name, type } as any);
  const res = await merchantApi.post<{ data: { url: string } }>('/merchant/images', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.url;
}

export async function getMerchantMe(): Promise<MerchantUser> {
  const res = await merchantApi.get<{ data: { merchant_user: MerchantUser } }>('/merchant/me');
  return res.data.data.merchant_user;
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

export async function sendRedemptionOtp(code: string): Promise<void> {
  await merchantApi.post('/merchant/send-redemption-otp', { redemption_code: code.toUpperCase() });
}

export async function verifyRedemptionOtp(code: string, otp: string): Promise<void> {
  await merchantApi.post('/merchant/verify-redemption-otp', { redemption_code: code.toUpperCase(), code: otp });
}

export async function confirmRedemption(
  code: string,
  amountToRedeem?: number,
  branchId?: string
): Promise<RedemptionResult> {
  const res = await merchantApi.post<{ data: RedemptionResult }>('/merchant/confirm-redemption', {
    redemption_code: code.toUpperCase(),
    amount_to_redeem: amountToRedeem,
    branch_id: branchId,
  });
  return res.data.data;
}

export async function getMerchantBranches(): Promise<MerchantBranch[]> {
  const res = await merchantApi.get<{ data: { branches: MerchantBranch[] } }>('/merchant/branches');
  return res.data.data.branches;
}

// ── Owner management ──────────────────────────────────────────────────────────

export interface PortalItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: string;
  currency_code: string;
  item_sku: string | null;
  is_active: boolean;
  /** [] = available at all branches */
  available_branches: { id: string; name: string }[];
}

export interface ItemInput {
  name?: string;
  description?: string | null;
  image_url?: string | null;
  price?: number;
  currency_code?: string;
  is_active?: boolean;
  branch_ids?: string[];
}

export interface PortalStaff {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'owner' | 'manager' | 'staff';
  is_active: boolean;
  branches: { id: string; name: string }[];
}

export interface StaffCreateInput {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role: 'manager' | 'staff';
  branch_ids?: string[];
}

export interface StaffUpdateInput {
  first_name?: string;
  last_name?: string;
  role?: 'manager' | 'staff';
  is_active?: boolean;
  password?: string;
  branch_ids?: string[];
}

export interface MerchantProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website_url: string | null;
  logo_url: string | null;
  banner_image_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  is_verified: boolean;
  rating: number | null;
  review_count: number;
}

export interface ProfileInput {
  description?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  banner_image_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}

export interface BranchInput {
  name?: string;
  address?: string | null;
  city?: string | null;
  contact_phone?: string | null;
  is_active?: boolean;
}

export async function getPortalItems(): Promise<PortalItem[]> {
  const res = await merchantApi.get<{ data: { items: PortalItem[] } }>('/merchant/items');
  return res.data.data.items;
}

export async function createPortalItem(input: ItemInput): Promise<void> {
  await merchantApi.post('/merchant/items', input);
}

export async function updatePortalItem(id: string, input: ItemInput): Promise<void> {
  await merchantApi.patch(`/merchant/items/${id}`, input);
}

export async function getPortalStaff(): Promise<PortalStaff[]> {
  const res = await merchantApi.get<{ data: { staff: PortalStaff[] } }>('/merchant/staff');
  return res.data.data.staff;
}

export async function createPortalStaff(input: StaffCreateInput): Promise<void> {
  await merchantApi.post('/merchant/staff', input);
}

export async function updatePortalStaff(id: string, input: StaffUpdateInput): Promise<void> {
  await merchantApi.patch(`/merchant/staff/${id}`, input);
}

export async function createPortalBranch(input: BranchInput): Promise<void> {
  await merchantApi.post('/merchant/branches', input);
}

export async function updatePortalBranch(id: string, input: BranchInput): Promise<void> {
  await merchantApi.patch(`/merchant/branches/${id}`, input);
}

export async function getMerchantProfile(): Promise<MerchantProfile> {
  const res = await merchantApi.get<{ data: { profile: MerchantProfile } }>('/merchant/profile');
  return res.data.data.profile;
}

export async function updateMerchantProfile(input: ProfileInput): Promise<MerchantProfile> {
  const res = await merchantApi.patch<{ data: { profile: MerchantProfile } }>('/merchant/profile', input);
  return res.data.data.profile;
}

export async function getMerchantRedemptions(params?: {
  page?: number;
  limit?: number;
  /** Server owns the definition of "today"/"this month" so the dashboard
   *  tiles and this list can never disagree on the boundary. */
  period?: 'today' | 'month';
  type?: 'store_credit' | 'gift_item';
  status?: 'partial' | 'completed' | 'failed';
  /** Narrows further within the caller's own permitted scope; the server
   *  403s if this isn't a branch the caller already has access to. */
  branch_id?: string;
  /** Matches redemption code, sender name, recipient name, or recipient
   *  phone — server-side (ILIKE), never filtered client-side. */
  search?: string;
}): Promise<{ redemptions: RedemptionItem[]; pagination: any }> {
  const res = await merchantApi.get<{ data: RedemptionItem[]; pagination: any }>(
    '/merchant/redemptions',
    { params }
  );
  return { redemptions: res.data.data, pagination: res.data.pagination };
}

/** Same filters as getMerchantRedemptions, but returns aggregate stats
 *  (count/revenue) for that exact filter set instead of the rows. */
export async function getMerchantRedemptionsSummary(params?: {
  period?: 'today' | 'month';
  type?: 'store_credit' | 'gift_item';
  status?: 'partial' | 'completed' | 'failed';
  branch_id?: string;
  search?: string;
}): Promise<RedemptionsSummary> {
  const res = await merchantApi.get<{ data: { summary: RedemptionsSummary } }>(
    '/merchant/redemptions/summary',
    { params }
  );
  return res.data.data.summary;
}

/** Owner-only — purchases (gift cards sold) aren't branch-scoped. */
export async function getMerchantPurchases(params?: {
  page?: number;
  limit?: number;
  period?: 'today' | 'month';
  type?: 'store_credit' | 'gift_item';
  /** Matches sender name, recipient name, recipient phone, or redemption
   *  code — server-side (ILIKE), never filtered client-side. */
  search?: string;
}): Promise<{ purchases: PurchaseItem[]; pagination: any }> {
  const res = await merchantApi.get<{ data: PurchaseItem[]; pagination: any }>(
    '/merchant/purchases',
    { params }
  );
  return { purchases: res.data.data, pagination: res.data.pagination };
}

/** Owner-only — same filters as getMerchantPurchases, aggregate stats only. */
export async function getMerchantPurchasesSummary(params?: {
  period?: 'today' | 'month';
  type?: 'store_credit' | 'gift_item';
  search?: string;
}): Promise<PurchasesSummary> {
  const res = await merchantApi.get<{ data: { summary: PurchasesSummary } }>(
    '/merchant/purchases/summary',
    { params }
  );
  return res.data.data.summary;
}

export async function getMerchantActiveCodes(params?: {
  page?: number;
  limit?: number;
  type?: 'store_credit' | 'gift_item';
}): Promise<{ codes: ActiveCodeItem[]; pagination: any }> {
  const res = await merchantApi.get<{ data: ActiveCodeItem[]; pagination: any }>(
    '/merchant/active-codes',
    { params }
  );
  return { codes: res.data.data, pagination: res.data.pagination };
}

export async function getMerchantActiveCodesSummary(params?: {
  type?: 'store_credit' | 'gift_item';
}): Promise<ActiveCodesSummary> {
  const res = await merchantApi.get<{ data: { summary: ActiveCodesSummary } }>(
    '/merchant/active-codes/summary',
    { params }
  );
  return res.data.data.summary;
}
