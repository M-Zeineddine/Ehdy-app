export interface Merchant {
  id: string;
  name: string;
  description: string;
  category: string;
  logo_url: string | null;
  cover_image_url: string | null;
  location: string | null;
  rating?: number;
  min_price?: number;
  max_price?: number;
  currency_code: string;
}

export interface GiftCard {
  id: string;
  merchant_id: string;
  merchant_name: string;
  name: string;
  description: string;
  type: 'store_credit' | 'gift_item';
  amount: number | null;
  currency_code: string;
  image_url: string | null;
}

export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_email_verified: boolean;
}
