import { api } from './api';
import type { Merchant, GiftCard } from '../types';

export async function getMerchants(params?: { category?: string; limit?: number }) {
  const res = await api.get<{ data: { merchants: Merchant[] } }>('/merchants', { params });
  return res.data.data.merchants;
}

export async function getMerchant(id: string) {
  const res = await api.get<{ data: Merchant }>(`/merchants/${id}`);
  return res.data.data;
}

export async function getMerchantGiftCards(merchantId: string) {
  const res = await api.get<{ data: { gift_cards: GiftCard[] } }>(`/merchants/${merchantId}/gift-cards`);
  return res.data.data.gift_cards;
}
