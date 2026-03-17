import { api } from './api';

export interface InitiateGiftPaymentParams {
  merchant_item_id?: string;
  store_credit_preset_id?: string;
  custom_credit_amount?: number;
  custom_credit_currency?: string;
  custom_credit_merchant_id?: string;
  sender_name: string;
  recipient_name: string;
  recipient_phone: string;
  personal_message: string;
  theme: string;
}

export interface InitiateGiftPaymentResult {
  gift_sent_id: string;
  tap_transaction_url: string;
  unique_share_link: string;
  amount: number;
  currency: string;
}

export async function initiateGiftPayment(
  params: InitiateGiftPaymentParams
): Promise<InitiateGiftPaymentResult> {
  const res = await api.post('/gifts/initiate-payment', params);
  return res.data.data;
}

export interface RetryDraftParams {
  merchant_item_id?: string;
  store_credit_preset_id?: string;
  custom_credit_amount?: number;
  custom_credit_currency?: string;
  custom_credit_merchant_id?: string;
  sender_name: string;
  recipient_name: string;
  recipient_phone: string;
  personal_message: string;
  theme: string;
}

export interface RetryDraft {
  id: string;
  merchant_item_id: string | null;
  store_credit_preset_id: string | null;
  custom_credit_amount: number | null;
  custom_credit_currency: string | null;
  custom_credit_merchant_id: string | null;
  sender_name: string | null;
  recipient_name: string | null;
  personal_message: string | null;
  theme: string | null;
  recipient_phone: string | null;
  item_name: string;
  item_description: string | null;
  item_price: string;
  item_currency: string;
  item_image: string | null;
  merchant_id: string;
  merchant_name: string;
  merchant_logo: string | null;
  is_credit: boolean;
}

export async function saveRetryDraft(params: RetryDraftParams): Promise<string> {
  const res = await api.post('/gifts/drafts', params);
  return res.data.data.draft_id;
}

export async function getRetryDraft(draftId: string): Promise<RetryDraft> {
  const res = await api.get(`/gifts/drafts/${draftId}`);
  return res.data.data.draft;
}

export async function deleteRetryDraft(draftId: string): Promise<void> {
  await api.delete(`/gifts/drafts/${draftId}`);
}

export interface GiftSummary {
  id: string;
  sender_name: string | null;
  recipient_name: string | null;
  personal_message: string | null;
  theme: string | null;
  payment_status: string;
  unique_share_link: string | null;
  is_claimed: boolean;
  claimed_at: string | null;
  sent_at: string;
  merchant_item_id: string | null;
  store_credit_preset_id: string | null;
  item_name: string | null;
  item_image: string | null;
  item_price: string | null;
  item_currency: string | null;
  merchant_name: string | null;
  merchant_logo: string | null;
  credit_amount: string | null;
  credit_currency: string | null;
  credit_merchant_name: string | null;
  // received gifts only
  sender_first_name?: string | null;
  sender_last_name?: string | null;
  redemption_status?: 'active' | 'partially_redeemed' | 'redeemed' | null;
}

export interface GiftListResult {
  data: GiftSummary[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export async function getSentGifts(
  page = 1,
  sortOrder: 'asc' | 'desc' = 'desc',
): Promise<GiftListResult> {
  const res = await api.get('/gifts/sent', { params: { page, limit: 20, sort_order: sortOrder } });
  return { data: res.data.data, pagination: res.data.pagination };
}

export async function getReceivedGifts(
  page = 1,
  sortOrder: 'asc' | 'desc' = 'desc',
  redemptionStatus?: 'active' | 'partially_redeemed' | 'redeemed',
): Promise<GiftListResult> {
  const res = await api.get('/gifts/received', {
    params: {
      page,
      limit: 20,
      sort_order: sortOrder,
      ...(redemptionStatus ? { redemption_status: redemptionStatus } : {}),
    },
  });
  return { data: res.data.data, pagination: res.data.pagination };
}
