export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED';

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  subtotal: string;
  taxAmount: string;
  shippingAmount: string;
  totalAmount: string;
  currency: string;
  idempotencyKey: string | null;
  shippingAddress: ShippingAddress;
  itemCount: number;
  items: OrderItem[];
  payments?: unknown[];
  createdAt: string;
  updatedAt: string;
}
