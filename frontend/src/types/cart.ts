import { Category } from './product';

export interface CartItem {
  itemId: string;
  productId: string;
  name: string;
  slug: string;
  sku: string;
  currentPrice: string;
  quantity: number;
  lineTotal: string;
  availableStock: number;
  isActive: boolean;
  isAvailable: boolean;
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  image: string | null;
}

export interface Cart {
  cartId: string;
  items: CartItem[];
  subtotal: string;
  itemCount: number;
  distinctCount: number;
}
