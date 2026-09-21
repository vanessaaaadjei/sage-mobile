export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  updatedAt: string;
};

export type Customer = {
  id: string;
  code: string;
  name: string;
  phone: string;
  route: string;
  balance: number;
  updatedAt: string;
};

export type VanStockLine = {
  productId: string;
  qtyLoaded: number;
  qtyOnHand: number;
  updatedAt: string;
};

export type OrderLine = {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export type PaymentMethod = 'cash' | 'credit' | 'momo';

export type Order = {
  id: string;
  idempotencyKey: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  lines: OrderLine[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  otpHash: string;
  otpVerifiedAt: string | null;
  status: OrderStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  syncedAt: string | null;
  serverDocNo: string | null;
};

export type SyncSnapshot = {
  lastPulledAt: string | null;
  lastPushedAt: string | null;
  cursor: string | null;
};

export type Rep = {
  id: string;
  name: string;
  vanCode: string;
  depot: string;
};
