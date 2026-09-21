import type { Customer, Order, Product, SyncSnapshot, VanStockLine } from '../core/types';
import { InsufficientStockError, type PosStore } from './store';

const STORAGE_KEY = 'vanpos.web.cache.v1';

type Snapshot = {
  products: Product[];
  customers: Customer[];
  vanStock: VanStockLine[];
  orders: Order[];
  sync: SyncSnapshot;
};

const emptySnapshot = (): Snapshot => ({
  products: [],
  customers: [],
  vanStock: [],
  orders: [],
  sync: { lastPulledAt: null, lastPushedAt: null, cursor: null },
});

/**
 * Browser-preview fallback for the SQLite caches. Mirrors the SQLite semantics
 * (upsert by key, atomic stock deduction + outbox insert) against localStorage.
 */
export class MemoryStore implements PosStore {
  private data: Snapshot = emptySnapshot();

  backend() {
    return 'Web localStorage (SQLite on device)';
  }

  async init() {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (raw) this.data = { ...emptySnapshot(), ...JSON.parse(raw) };
    } catch {
      this.data = emptySnapshot();
    }
  }

  private persist() {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage is best-effort in the browser preview.
    }
  }

  private static upsert<T>(rows: T[], incoming: T[], key: (row: T) => string): T[] {
    const merged = new Map(rows.map((row) => [key(row), row]));
    for (const row of incoming) merged.set(key(row), row);
    return [...merged.values()];
  }

  async upsertProducts(products: Product[]) {
    this.data.products = MemoryStore.upsert(this.data.products, products, (row) => row.id).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    this.persist();
  }

  async listProducts() {
    return [...this.data.products];
  }

  async upsertCustomers(customers: Customer[]) {
    this.data.customers = MemoryStore.upsert(this.data.customers, customers, (row) => row.id).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    this.persist();
  }

  async listCustomers() {
    return [...this.data.customers];
  }

  async upsertVanStock(lines: VanStockLine[]) {
    this.data.vanStock = MemoryStore.upsert(this.data.vanStock, lines, (row) => row.productId);
    this.persist();
  }

  async listVanStock() {
    return [...this.data.vanStock];
  }

  async commitOrder(order: Order, deductions: Record<string, number>) {
    const next = this.data.vanStock.map((line) => ({ ...line }));
    for (const [productId, qty] of Object.entries(deductions)) {
      const line = next.find((row) => row.productId === productId);
      if (!line || line.qtyOnHand < qty) throw new InsufficientStockError(productId);
      line.qtyOnHand -= qty;
      line.updatedAt = order.createdAt;
    }
    if (this.data.orders.some((row) => row.idempotencyKey === order.idempotencyKey)) return;
    this.data.vanStock = next;
    this.data.orders = [order, ...this.data.orders];
    this.persist();
  }

  async listOrders() {
    return [...this.data.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateOrder(order: Order) {
    this.data.orders = this.data.orders.map((row) => (row.id === order.id ? order : row));
    this.persist();
  }

  async getSyncSnapshot() {
    return { ...this.data.sync };
  }

  async setSyncSnapshot(snapshot: SyncSnapshot) {
    this.data.sync = snapshot;
    this.persist();
  }

  async reset() {
    this.data = emptySnapshot();
    this.persist();
  }
}
