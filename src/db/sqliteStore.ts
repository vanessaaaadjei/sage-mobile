import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import type { Customer, Order, Product, SyncSnapshot, VanStockLine } from '../core/types';
import { InsufficientStockError, type PosStore } from './store';

const DATABASE_NAME = 'vanpos.db';
const CIPHER_KEY_ENTRY = 'vanpos.sqlcipher.key';

async function cipherKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(CIPHER_KEY_ENTRY);
  if (existing) return existing;
  const generated = Array.from(Crypto.getRandomBytes(32))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  await SecureStore.setItemAsync(CIPHER_KEY_ENTRY, generated);
  return generated;
}

type OrderRow = {
  id: string;
  idempotency_key: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  lines: string;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string;
  otp_hash: string;
  otp_verified_at: string | null;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  synced_at: string | null;
  server_doc_no: string | null;
};

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    lines: JSON.parse(row.lines),
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    paymentMethod: row.payment_method as Order['paymentMethod'],
    otpHash: row.otp_hash,
    otpVerifiedAt: row.otp_verified_at,
    status: row.status as Order['status'],
    attempts: row.attempts,
    lastError: row.last_error,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
    serverDocNo: row.server_doc_no,
  };
}

export class SqliteStore implements PosStore {
  private db: SQLite.SQLiteDatabase | null = null;
  private encrypted = false;

  backend() {
    return this.encrypted ? 'SQLite (SQLCipher)' : 'SQLite';
  }

  private database(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error('Store has not been initialised');
    return this.db;
  }

  async init() {
    if (this.db) return;
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    try {
      await db.execAsync(`PRAGMA key = '${await cipherKey()}'`);
      this.encrypted = true;
    } catch {
      // Builds without SQLCipher fall back to plain SQLite storage.
      this.encrypted = false;
    }
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS products_cache (
        id TEXT PRIMARY KEY NOT NULL,
        sku TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit TEXT NOT NULL,
        price REAL NOT NULL,
        image_url TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS customers_cache (
        id TEXT PRIMARY KEY NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        route TEXT NOT NULL,
        balance REAL NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS van_stock_cache (
        product_id TEXT PRIMARY KEY NOT NULL,
        qty_loaded REAL NOT NULL,
        qty_on_hand REAL NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS offline_orders_outbox (
        id TEXT PRIMARY KEY NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        lines TEXT NOT NULL,
        subtotal REAL NOT NULL,
        tax REAL NOT NULL,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL,
        otp_hash TEXT NOT NULL,
        otp_verified_at TEXT,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT,
        server_doc_no TEXT
      );
      CREATE TABLE IF NOT EXISTS sync_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `);
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(products_cache)');
    if (!columns.some((column) => column.name === 'image_url')) {
      await db.execAsync('ALTER TABLE products_cache ADD COLUMN image_url TEXT');
    }
    this.db = db;
  }

  async upsertProducts(products: Product[]) {
    const db = this.database();
    await db.withTransactionAsync(async () => {
      for (const product of products) {
        await db.runAsync(
          `INSERT INTO products_cache (id, sku, name, category, unit, price, image_url, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET sku = excluded.sku, name = excluded.name,
             category = excluded.category, unit = excluded.unit, price = excluded.price,
             image_url = excluded.image_url, updated_at = excluded.updated_at`,
          [
            product.id,
            product.sku,
            product.name,
            product.category,
            product.unit,
            product.price,
            product.imageUrl ?? null,
            product.updatedAt,
          ],
        );
      }
    });
  }

  async listProducts() {
    const rows = await this.database().getAllAsync<Product & { image_url: string | null; updated_at: string }>(
      'SELECT id, sku, name, category, unit, price, image_url, updated_at FROM products_cache ORDER BY name',
    );
    return rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      unit: row.unit,
      price: row.price,
      imageUrl: row.image_url ?? undefined,
      updatedAt: row.updated_at,
    }));
  }

  async upsertCustomers(customers: Customer[]) {
    const db = this.database();
    await db.withTransactionAsync(async () => {
      for (const customer of customers) {
        await db.runAsync(
          `INSERT INTO customers_cache (id, code, name, phone, route, balance, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET code = excluded.code, name = excluded.name,
             phone = excluded.phone, route = excluded.route, balance = excluded.balance,
             updated_at = excluded.updated_at`,
          [customer.id, customer.code, customer.name, customer.phone, customer.route, customer.balance, customer.updatedAt],
        );
      }
    });
  }

  async listCustomers() {
    const rows = await this.database().getAllAsync<Customer & { updated_at: string }>(
      'SELECT id, code, name, phone, route, balance, updated_at FROM customers_cache ORDER BY name',
    );
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      phone: row.phone,
      route: row.route,
      balance: row.balance,
      updatedAt: row.updated_at,
    }));
  }

  async upsertVanStock(lines: VanStockLine[]) {
    const db = this.database();
    await db.withTransactionAsync(async () => {
      for (const line of lines) {
        await db.runAsync(
          `INSERT INTO van_stock_cache (product_id, qty_loaded, qty_on_hand, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(product_id) DO UPDATE SET qty_loaded = excluded.qty_loaded,
             qty_on_hand = excluded.qty_on_hand, updated_at = excluded.updated_at`,
          [line.productId, line.qtyLoaded, line.qtyOnHand, line.updatedAt],
        );
      }
    });
  }

  async listVanStock() {
    const rows = await this.database().getAllAsync<{
      product_id: string;
      qty_loaded: number;
      qty_on_hand: number;
      updated_at: string;
    }>('SELECT product_id, qty_loaded, qty_on_hand, updated_at FROM van_stock_cache');
    return rows.map((row) => ({
      productId: row.product_id,
      qtyLoaded: row.qty_loaded,
      qtyOnHand: row.qty_on_hand,
      updatedAt: row.updated_at,
    }));
  }

  async commitOrder(order: Order, deductions: Record<string, number>) {
    const db = this.database();
    await db.withTransactionAsync(async () => {
      for (const [productId, qty] of Object.entries(deductions)) {
        const result = await db.runAsync(
          'UPDATE van_stock_cache SET qty_on_hand = qty_on_hand - ?, updated_at = ? WHERE product_id = ? AND qty_on_hand >= ?',
          [qty, order.createdAt, productId, qty],
        );
        if (result.changes === 0) throw new InsufficientStockError(productId);
      }
      await db.runAsync(
        `INSERT INTO offline_orders_outbox (id, idempotency_key, customer_id, customer_name, customer_phone,
           lines, subtotal, tax, total, payment_method, otp_hash, otp_verified_at, status, attempts,
           last_error, created_at, synced_at, server_doc_no)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(idempotency_key) DO NOTHING`,
        [
          order.id,
          order.idempotencyKey,
          order.customerId,
          order.customerName,
          order.customerPhone,
          JSON.stringify(order.lines),
          order.subtotal,
          order.tax,
          order.total,
          order.paymentMethod,
          order.otpHash,
          order.otpVerifiedAt,
          order.status,
          order.attempts,
          order.lastError,
          order.createdAt,
          order.syncedAt,
          order.serverDocNo,
        ],
      );
    });
  }

  async listOrders() {
    const rows = await this.database().getAllAsync<OrderRow>(
      'SELECT * FROM offline_orders_outbox ORDER BY created_at DESC',
    );
    return rows.map(toOrder);
  }

  async updateOrder(order: Order) {
    await this.database().runAsync(
      `UPDATE offline_orders_outbox SET status = ?, attempts = ?, last_error = ?, synced_at = ?,
         server_doc_no = ?, otp_verified_at = ? WHERE id = ?`,
      [order.status, order.attempts, order.lastError, order.syncedAt, order.serverDocNo, order.otpVerifiedAt, order.id],
    );
  }

  async getSyncSnapshot(): Promise<SyncSnapshot> {
    const rows = await this.database().getAllAsync<{ key: string; value: string | null }>(
      'SELECT key, value FROM sync_meta',
    );
    const meta = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      lastPulledAt: meta.lastPulledAt ?? null,
      lastPushedAt: meta.lastPushedAt ?? null,
      cursor: meta.cursor ?? null,
    };
  }

  async setSyncSnapshot(snapshot: SyncSnapshot) {
    const db = this.database();
    await db.withTransactionAsync(async () => {
      for (const [key, value] of Object.entries(snapshot)) {
        await db.runAsync(
          'INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
          [key, value],
        );
      }
    });
  }

  async reset() {
    await this.database().execAsync(`
      DELETE FROM products_cache;
      DELETE FROM customers_cache;
      DELETE FROM van_stock_cache;
      DELETE FROM offline_orders_outbox;
      DELETE FROM sync_meta;
    `);
  }
}
