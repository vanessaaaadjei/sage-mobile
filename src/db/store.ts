import type { Customer, Order, Product, SyncSnapshot, VanStockLine } from '../core/types';

/**
 * Persistence contract for the four offline caches in the architecture:
 * products_cache, customers_cache, van_stock_cache and offline_orders_outbox.
 */
export type PosStore = {
  init(): Promise<void>;
  backend(): string;

  upsertProducts(products: Product[]): Promise<void>;
  /** Clears the local product cache and writes the given rows (full catalog refresh). */
  replaceProducts(products: Product[]): Promise<void>;
  listProducts(): Promise<Product[]>;

  upsertCustomers(customers: Customer[]): Promise<void>;
  listCustomers(): Promise<Customer[]>;

  upsertVanStock(lines: VanStockLine[]): Promise<void>;
  listVanStock(): Promise<VanStockLine[]>;
  /** Drops stock rows whose product is no longer in the catalog. */
  pruneOrphanVanStock(validProductIds: string[]): Promise<void>;
  /** Adds units onto the van (increases both loaded and on-hand). */
  applyVanLoad(loads: Record<string, number>): Promise<void>;
  /** Atomically deducts sold quantities and appends the order to the outbox. */
  commitOrder(order: Order, deductions: Record<string, number>): Promise<void>;
  /** Appends an order to the outbox without changing van stock (demo / recovery). */
  enqueueOrder(order: Order): Promise<void>;

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
