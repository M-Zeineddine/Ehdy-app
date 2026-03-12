import { api } from './api';
import type { Merchant, MerchantItem } from '../types';

export async function getMerchants(params?: { category_id?: string; search?: string; limit?: number; featured?: boolean }) {
  const res = await api.get<{ data: Merchant[] }>('/merchants', { params });
  return res.data.data ?? [];
}

export async function getMerchant(id: string) {
  const res = await api.get<{ data: { merchant: Merchant } }>(`/merchants/${id}`);
  return res.data.data.merchant;
}

export async function getMerchantItems(params?: { limit?: number }) {
  const res = await api.get<{ data: { items: MerchantItem[] } }>('/merchants/items', { params });
  return res.data.data.items ?? [];
}
