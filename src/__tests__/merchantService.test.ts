'use strict';

/**
 * Unit tests for merchantService.
 * Focuses on: null-safe fallbacks, correct endpoints, fire-and-forget behavior.
 */

import {
  getMerchants,
  getMerchant,
  getMerchantItems,
  recordMerchantVisit,
  getRecentlyViewed,
} from '../services/merchantService';

jest.mock('../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
  setAuthToken: jest.fn(),
  setTokenExpiredHandler: jest.fn(),
}));

const { api } = require('../services/api') as { api: { get: jest.Mock; post: jest.Mock } };

beforeEach(() => jest.clearAllMocks());

// ─── getMerchants ─────────────────────────────────────────────────────────────

describe('getMerchants', () => {
  test('returns merchant array from API', async () => {
    const merchants = [{ id: 'm1', name: 'Patchi' }];
    api.get.mockResolvedValueOnce({ data: { data: merchants } });

    const result = await getMerchants();
    expect(result).toEqual(merchants);
    expect(api.get).toHaveBeenCalledWith('/merchants', { params: undefined });
  });

  test('returns [] when API returns null data', async () => {
    api.get.mockResolvedValueOnce({ data: { data: null } });

    const result = await getMerchants();
    expect(result).toEqual([]);
  });

  test('forwards filter params to the API', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [] } });

    await getMerchants({ search: 'patchi', featured: true });

    expect(api.get).toHaveBeenCalledWith('/merchants', {
      params: { search: 'patchi', featured: true },
    });
  });
});

// ─── getMerchant ──────────────────────────────────────────────────────────────

describe('getMerchant', () => {
  test('GETs /merchants/:id and returns the merchant object', async () => {
    const merchant = { id: 'm1', name: 'Patchi' };
    api.get.mockResolvedValueOnce({ data: { data: { merchant } } });

    const result = await getMerchant('m1');

    expect(api.get).toHaveBeenCalledWith('/merchants/m1');
    expect(result).toEqual(merchant);
  });
});

// ─── getMerchantItems ─────────────────────────────────────────────────────────

describe('getMerchantItems', () => {
  test('returns items array', async () => {
    const items = [{ id: 'i1', name: 'Chocolate Box' }];
    api.get.mockResolvedValueOnce({ data: { data: { items } } });

    const result = await getMerchantItems();
    expect(result).toEqual(items);
  });

  test('returns [] when items is null', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { items: null } } });

    const result = await getMerchantItems();
    expect(result).toEqual([]);
  });

  test('forwards limit param', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { items: [] } } });

    await getMerchantItems({ limit: 6 });

    expect(api.get).toHaveBeenCalledWith('/merchants/items', { params: { limit: 6 } });
  });
});

// ─── recordMerchantVisit ──────────────────────────────────────────────────────

describe('recordMerchantVisit', () => {
  test('POSTs to /merchants/:id/visit', async () => {
    api.post.mockResolvedValueOnce({});

    await recordMerchantVisit('m1');

    expect(api.post).toHaveBeenCalledWith('/merchants/m1/visit');
  });

  test('does NOT throw when API call fails (fire-and-forget)', async () => {
    api.post.mockRejectedValueOnce(new Error('Network error'));

    // Should resolve without throwing
    await expect(recordMerchantVisit('m1')).resolves.toBeUndefined();
  });
});

// ─── getRecentlyViewed ────────────────────────────────────────────────────────

describe('getRecentlyViewed', () => {
  test('returns recently viewed merchants', async () => {
    const merchants = [{ id: 'm1' }];
    api.get.mockResolvedValueOnce({ data: { data: { recently_viewed: merchants } } });

    const result = await getRecentlyViewed();
    expect(result).toEqual(merchants);
  });

  test('returns [] when recently_viewed is null', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { recently_viewed: null } } });

    const result = await getRecentlyViewed();
    expect(result).toEqual([]);
  });

  test('defaults to limit=10', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { recently_viewed: [] } } });

    await getRecentlyViewed();

    expect(api.get).toHaveBeenCalledWith('/merchants/recently-viewed', { params: { limit: 10 } });
  });

  test('forwards custom limit', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { recently_viewed: [] } } });

    await getRecentlyViewed(5);

    expect(api.get).toHaveBeenCalledWith('/merchants/recently-viewed', { params: { limit: 5 } });
  });
});
