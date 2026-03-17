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


export async function recordMerchantVisit(id: string): Promise<void> {
  try {
    await api.post(`/merchants/${id}/visit`);
  } catch {
    // fire-and-forget — silently ignore errors
  }
}

export async function getRecentlyViewed(limit = 10): Promise<Merchant[]> {
  const res = await api.get<{ data: { recently_viewed: Merchant[] } }>('/merchants/recently-viewed', { params: { limit } });
  return res.data.data.recently_viewed ?? [];
}
