import { api } from './api';
import type { Merchant, GiftCard } from '../types';

export async function getMerchants(params?: { category_id?: string; search?: string; limit?: number; featured?: boolean }) {
  const res = await api.get<{ data: Merchant[] }>('/merchants', { params });
  return res.data.data ?? [];
}

export async function getMerchant(id: string) {
  const res = await api.get<{ data: { merchant: Merchant } }>(`/merchants/${id}`);
  return res.data.data.merchant;
}

export async function getGiftCards(params?: { limit?: number; merchant_id?: string }) {
  const res = await api.get<{ data: { gift_cards: GiftCard[] } }>('/gift-cards', { params });
  return res.data.data.gift_cards ?? [];
}
