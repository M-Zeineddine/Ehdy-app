'use strict';

/**
 * Unit tests for giftService.
 * Mocks the `api` axios instance — no real HTTP calls made.
 */

import {
  initiateGiftPayment,
  saveRetryDraft,
  getRetryDraft,
  deleteRetryDraft,
  getSentGifts,
  getReceivedGifts,
} from '../services/giftService';

// Must be hoisted above imports — jest.mock is hoisted by babel-jest
jest.mock('../services/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  },
  setAuthToken: jest.fn(),
  setTokenExpiredHandler: jest.fn(),
}));

// Pull the mocked api object for assertions
const { api } = require('../services/api') as { api: { post: jest.Mock; get: jest.Mock; delete: jest.Mock } };

beforeEach(() => jest.clearAllMocks());

// ─── initiateGiftPayment ──────────────────────────────────────────────────────

describe('initiateGiftPayment', () => {
  const mockResult = {
    gift_sent_id: 'gift-1',
    tap_transaction_url: 'https://tap.company/pay/abc',
    unique_share_link: 'https://kado.app/gift/abc',
    amount: 25,
    currency: 'USD',
  };

  const baseParams = {
    merchant_item_id: 'item-1',
    sender_name: 'Alice',
    recipient_name: 'Bob',
    recipient_phone: '+96170000000',
    personal_message: 'Enjoy!',
    theme: 'birthday',
  };

  test('POSTs to /gifts/initiate-payment and returns data', async () => {
    api.post.mockResolvedValueOnce({ data: { data: mockResult } });

    const result = await initiateGiftPayment(baseParams);

    expect(api.post).toHaveBeenCalledWith('/gifts/initiate-payment', baseParams);
    expect(result).toEqual(mockResult);
  });

  test('forwards custom credit params to the API', async () => {
    api.post.mockResolvedValueOnce({ data: { data: mockResult } });

    const params = {
      custom_credit_amount: 75,
      custom_credit_currency: 'USD',
      custom_credit_merchant_id: 'merchant-1',
      sender_name: 'Alice',
      recipient_name: 'Bob',
      recipient_phone: '+96170000000',
      personal_message: '',
      theme: 'birthday',
    };

    await initiateGiftPayment(params);
    expect(api.post).toHaveBeenCalledWith('/gifts/initiate-payment', params);
  });
});

// ─── getSentGifts ─────────────────────────────────────────────────────────────

describe('getSentGifts', () => {
  const mockPage = { data: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } };

  test('defaults to page=1, sortOrder=desc', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], pagination: mockPage.pagination } });

    await getSentGifts();

    expect(api.get).toHaveBeenCalledWith('/gifts/sent', {
      params: { page: 1, limit: 20, sort_order: 'desc' },
    });
  });

  test('passes custom page and sort order', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], pagination: mockPage.pagination } });

    await getSentGifts(3, 'asc');

    expect(api.get).toHaveBeenCalledWith('/gifts/sent', {
      params: { page: 3, limit: 20, sort_order: 'asc' },
    });
  });

  test('returns data and pagination', async () => {
    const gifts = [{ id: 'g1' }];
    const pagination = { total: 1, page: 1, limit: 20, pages: 1 };
    api.get.mockResolvedValueOnce({ data: { data: gifts, pagination } });

    const result = await getSentGifts();
    expect(result.data).toEqual(gifts);
    expect(result.pagination).toEqual(pagination);
  });
});

// ─── getReceivedGifts ─────────────────────────────────────────────────────────

describe('getReceivedGifts', () => {
  const emptyPagination = { total: 0, page: 1, limit: 20, pages: 0 };

  test('omits redemption_status param when not provided', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], pagination: emptyPagination } });

    await getReceivedGifts();

    const callParams = api.get.mock.calls[0][1].params;
    expect(callParams).not.toHaveProperty('redemption_status');
    expect(callParams).toMatchObject({ page: 1, limit: 20, sort_order: 'desc' });
  });

  test('includes redemption_status when provided', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], pagination: emptyPagination } });

    await getReceivedGifts(1, 'desc', 'active');

    const callParams = api.get.mock.calls[0][1].params;
    expect(callParams.redemption_status).toBe('active');
  });

  test('each redemption_status value is forwarded correctly', async () => {
    for (const status of ['active', 'partially_redeemed', 'redeemed'] as const) {
      api.get.mockResolvedValueOnce({ data: { data: [], pagination: emptyPagination } });
      await getReceivedGifts(1, 'desc', status);
      const callParams = api.get.mock.calls.at(-1)![1].params;
      expect(callParams.redemption_status).toBe(status);
    }
  });
});

// ─── saveRetryDraft / getRetryDraft / deleteRetryDraft ───────────────────────

describe('saveRetryDraft', () => {
  test('POSTs to /gifts/drafts and returns draft_id', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { draft_id: 'draft-abc' } } });

    const id = await saveRetryDraft({
      merchant_item_id: 'item-1',
      sender_name: 'Alice',
      recipient_name: 'Bob',
      recipient_phone: '+1',
      personal_message: '',
      theme: 'birthday',
    });

    expect(id).toBe('draft-abc');
    expect(api.post).toHaveBeenCalledWith('/gifts/drafts', expect.any(Object));
  });
});

describe('getRetryDraft', () => {
  test('GETs /gifts/drafts/:id and returns draft', async () => {
    const draft = { id: 'draft-abc', item_name: 'Box', is_credit: false };
    api.get.mockResolvedValueOnce({ data: { data: { draft } } });

    const result = await getRetryDraft('draft-abc');

    expect(api.get).toHaveBeenCalledWith('/gifts/drafts/draft-abc');
    expect(result).toEqual(draft);
  });
});

describe('deleteRetryDraft', () => {
  test('DELETEs /gifts/drafts/:id', async () => {
    api.delete.mockResolvedValueOnce({});

    await deleteRetryDraft('draft-abc');

    expect(api.delete).toHaveBeenCalledWith('/gifts/drafts/draft-abc');
  });
});
