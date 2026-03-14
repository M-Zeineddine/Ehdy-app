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
