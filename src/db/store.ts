import type { Customer, Order, Product, SyncSnapshot, VanStockLine } from '../core/types';

/**
 * Persistence contract for the four offline caches in the architecture:
 * products_cache, customers_cache, van_stock_cache and offline_orders_outbox.
 */
export type PosStore = {
  init(): Promise<void>;
  backend(): string;

  upsertProducts(products: Product[]): Promise<void>;
  listProducts(): Promise<Product[]>;

  upsertCustomers(customers: Customer[]): Promise<void>;
  listCustomers(): Promise<Customer[]>;

  upsertVanStock(lines: VanStockLine[]): Promise<void>;
  listVanStock(): Promise<VanStockLine[]>;
  /** Atomically deducts sold quantities and appends the order to the outbox. */
  commitOrder(order: Order, deductions: Record<string, number>): Promise<void>;

  listOrders(): Promise<Order[]>;
  updateOrder(order: Order): Promise<void>;

  getSyncSnapshot(): Promise<SyncSnapshot>;
  setSyncSnapshot(snapshot: SyncSnapshot): Promise<void>;

  reset(): Promise<void>;
};

export class InsufficientStockError extends Error {
  constructor(public readonly productId: string) {
    super(`Insufficient van stock for product ${productId}`);
    this.name = 'InsufficientStockError';
  }
}
