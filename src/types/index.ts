export interface Merchant {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  banner_image_url: string | null;
  category_id: string;
  category_name: string;
  category_slug: string;
  country_code: string;
  city: string | null;
  rating?: number;
  review_count?: number;
  is_verified?: boolean;
}

export interface GiftCard {
  id: string;
  merchant_id: string;
  merchant_name?: string;
  merchant_slug?: string;
  name: string;
  description: string;
  type: 'store_credit' | 'gift_item';
  is_store_credit: boolean;
  credit_amount: number | null;
  currency_code: string;
  image_url: string | null;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_email_verified: boolean;
}
