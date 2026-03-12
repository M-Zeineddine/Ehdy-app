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
  items?: MerchantItem[];
  store_credit_presets?: StoreCreditPreset[];
}

export interface MerchantItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  currency_code: string;
  item_sku: string | null;
}

export interface StoreCreditPreset {
  id: string;
  amount: number;
  currency_code: string;
}

// Represents an actual gift card created by a user to send to a recipient (future)
export interface GiftCard {
  id: string;
  name: string;
  image_url: string | null;
  credit_amount: number | null;
  currency_code: string;
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
