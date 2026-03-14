import { api } from './api';

export interface InitiateGiftPaymentParams {
  merchant_item_id?: string;
  store_credit_preset_id?: string;
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
