import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { round, TAX_RATE, toOrderLines, totals, type CartItem } from '../core/cart';
import { generateOtp, hashOtp, verifyOtp } from '../core/otp';
import { SyncEngine, type SyncOutcome } from '../core/syncEngine';
import type { Customer, Order, PaymentMethod, Product, Rep, SyncSnapshot, VanStockLine } from '../core/types';
import { SEED_CUSTOMERS, SEED_PRODUCTS, SEED_VAN_STOCK } from '../data/seed';
import { getStore } from '../db';
import { InsufficientStockError, type PosStore } from '../db/store';
import { DEFAULT_PRINTER, printReceipt, renderReceipt, type BluetoothPrinter } from '../services/printer';
import { sendOtpSms, type SmsReceipt } from '../services/sms';
import { SyncApi } from '../services/syncApi';

export type PendingCheckout = {
  orderId: string;
  idempotencyKey: string;
  customer: Customer;
  lines: ReturnType<typeof toOrderLines>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  otpHash: string;
  otpPlain: string;
  smsReceipt: SmsReceipt | null;
};

type PosContextValue = {
  ready: boolean;
  rep: Rep | null;
  online: boolean;
  syncing: boolean;
  storageBackend: string;
  products: Product[];
  customers: Customer[];
  vanStock: VanStockLine[];
  orders: Order[];
  cart: CartItem[];
  snapshot: SyncSnapshot;
  printer: BluetoothPrinter;
  lastSync: SyncOutcome | null;
  syncError: string | null;
  pendingCount: number;
  cartTotals: { subtotal: number; tax: number; total: number };
  signIn(username: string, pin: string): Promise<void>;
  signOut(): void;
  setOnline(value: boolean): void;
  setPrinter(printer: BluetoothPrinter): void;
  addToCart(product: Product, qty?: number): void;
  setCartQty(productId: string, qty: number): void;
  clearCart(): void;
  availableStock(productId: string): number;
  startCheckout(customer: Customer, paymentMethod: PaymentMethod): Promise<PendingCheckout>;
  resendOtp(checkout: PendingCheckout): Promise<PendingCheckout>;
  confirmCheckout(checkout: PendingCheckout, code: string): Promise<Order>;
  printOrder(order: Order): Promise<string>;
  syncNow(): Promise<void>;
  resetDemoData(): Promise<void>;
};

const PosContext = createContext<PosContextValue | null>(null);

const EMPTY_SNAPSHOT: SyncSnapshot = { lastPulledAt: null, lastPushedAt: null, cursor: null };

/**
 * Loads the van's starting catalogue, customer list and stock into the device
 * caches. Once the sync endpoints are implemented these rows arrive from the
 * depot delta instead.
 */
async function seedIfEmpty(store: PosStore) {
  const existing = await store.listProducts();
  if (existing.length) return;
  await store.upsertProducts(SEED_PRODUCTS);
  await store.upsertCustomers(SEED_CUSTOMERS);
  await store.upsertVanStock(SEED_VAN_STOCK);
}

export function PosProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<PosStore | null>(null);
  const [ready, setReady] = useState(false);
  const [rep, setRep] = useState<Rep | null>(null);
  const [online, setOnlineState] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vanStock, setVanStock] = useState<VanStockLine[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [snapshot, setSnapshot] = useState<SyncSnapshot>(EMPTY_SNAPSHOT);
  const [printer, setPrinter] = useState<BluetoothPrinter>(DEFAULT_PRINTER);
  const [lastSync, setLastSync] = useState<SyncOutcome | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [api] = useState(() => new SyncApi());
  const engine = useRef<SyncEngine | null>(null);

  const refresh = useCallback(async (source: PosStore) => {
    const [nextProducts, nextCustomers, nextStock, nextOrders, nextSnapshot] = await Promise.all([
      source.listProducts(),
      source.listCustomers(),
      source.listVanStock(),
      source.listOrders(),
      source.getSyncSnapshot(),
    ]);
    setProducts(nextProducts);
    setCustomers(nextCustomers);
    setVanStock(nextStock);
    setOrders(nextOrders);
    setSnapshot(nextSnapshot);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await getStore();
      if (cancelled) return;
      engine.current = new SyncEngine(loaded, api);
      await seedIfEmpty(loaded);
      setStore(loaded);
      await refresh(loaded);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [api, refresh]);

  const setOnline = useCallback(
    (value: boolean) => {
      api.setOnline(value);
      setOnlineState(value);
    },
    [api],
  );

  const runSync = useCallback(async () => {
    if (!store || !engine.current) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const outcome = await engine.current.sync();
      setLastSync(outcome);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      await refresh(store);
      setSyncing(false);
    }
  }, [store, refresh]);

  const signIn = useCallback(
    async (username: string, pin: string) => {
      if (!store) throw new Error('Offline storage is still starting');
      if (!username.trim()) throw new Error('Enter your rep ID');
      if (pin.length < 4) throw new Error('Invalid PIN');
      setRep({ id: username, name: username, vanCode: 'VAN-07', depot: 'Accra Depot' });
      await refresh(store);
    },
    [store, refresh],
  );

  const signOut = useCallback(() => {
    api.setToken(null);
    setRep(null);
    setCart([]);
  }, [api]);

  const availableStock = useCallback(
    (productId: string) => vanStock.find((line) => line.productId === productId)?.qtyOnHand ?? 0,
    [vanStock],
  );

  const addToCart = useCallback((product: Product, qty = 1) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (!existing) return [...current, { product, qty }];
      return current.map((item) => (item.product.id === product.id ? { ...item, qty: item.qty + qty } : item));
    });
  }, []);

  const setCartQty = useCallback((productId: string, qty: number) => {
    setCart((current) =>
      qty <= 0
        ? current.filter((item) => item.product.id !== productId)
        : current.map((item) => (item.product.id === productId ? { ...item, qty } : item)),
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const startCheckout = useCallback(
    async (customer: Customer, paymentMethod: PaymentMethod) => {
      const lines = toOrderLines(cart);
      if (!lines.length) throw new Error('Cart is empty');
      for (const item of cart) {
        if (item.qty > availableStock(item.product.id)) throw new InsufficientStockError(item.product.id);
      }
      const orderId = Crypto.randomUUID();
      const { subtotal, tax, total } = totals(lines);
      const otpPlain = generateOtp();
      const otpHash = await hashOtp(otpPlain, orderId);
      const smsReceipt = await sendOtpSms(customer.phone, otpPlain);
      return {
        orderId,
        idempotencyKey: `${orderId}:${round(total)}`,
        customer,
        lines,
        subtotal,
        tax,
        total,
        paymentMethod,
        otpHash,
        otpPlain,
        smsReceipt,
      };
    },
    [cart, availableStock],
  );

  const resendOtp = useCallback(async (checkout: PendingCheckout) => {
    const otpPlain = generateOtp();
    const otpHash = await hashOtp(otpPlain, checkout.orderId);
    const smsReceipt = await sendOtpSms(checkout.customer.phone, otpPlain);
    return { ...checkout, otpPlain, otpHash, smsReceipt };
  }, []);

  const confirmCheckout = useCallback(
    async (checkout: PendingCheckout, code: string) => {
      if (!store) throw new Error('Offline storage is still starting');
      const valid = await verifyOtp(code, checkout.orderId, checkout.otpHash);
      if (!valid) throw new Error('Incorrect code');
      const createdAt = new Date().toISOString();
      const order: Order = {
        id: checkout.orderId,
        idempotencyKey: checkout.idempotencyKey,
        customerId: checkout.customer.id,
        customerName: checkout.customer.name,
        customerPhone: checkout.customer.phone,
        lines: checkout.lines,
        subtotal: checkout.subtotal,
        tax: checkout.tax,
        total: checkout.total,
        paymentMethod: checkout.paymentMethod,
        otpHash: checkout.otpHash,
        otpVerifiedAt: createdAt,
        status: 'pending',
        attempts: 0,
        lastError: null,
        createdAt,
        syncedAt: null,
        serverDocNo: null,
      };
      const deductions = Object.fromEntries(checkout.lines.map((line) => [line.productId, line.qty]));
      await store.commitOrder(order, deductions);
      setCart([]);
      await refresh(store);
      return order;
    },
    [store, refresh],
  );

  const printOrder = useCallback(
    async (order: Order) => {
      const payload = renderReceipt(order, rep ?? { id: 'rep', name: 'Rep', vanCode: 'VAN-07', depot: 'Accra Depot' }, printer.paper);
      await printReceipt(payload);
      return payload;
    },
    [rep, printer.paper],
  );

  const resetDemoData = useCallback(async () => {
    if (!store) return;
    await store.reset();
    await seedIfEmpty(store);
    setCart([]);
    setLastSync(null);
    setSyncError(null);
    await refresh(store);
  }, [store, refresh]);

  const pendingCount = useMemo(
    () => orders.filter((order) => order.status !== 'synced').length,
    [orders],
  );

  const cartTotals = useMemo(() => {
    const subtotal = round(cart.reduce((sum, item) => sum + item.product.price * item.qty, 0));
    return { subtotal, tax: round(subtotal * TAX_RATE), total: round(subtotal * (1 + TAX_RATE)) };
  }, [cart]);

  const value: PosContextValue = {
    ready,
    rep,
    online,
    syncing,
    storageBackend: store?.backend() ?? 'starting',
    products,
    customers,
    vanStock,
    orders,
    cart,
    snapshot,
    printer,
    lastSync,
    syncError,
    pendingCount,
    cartTotals,
    signIn,
    signOut,
    setOnline,
    setPrinter,
    addToCart,
    setCartQty,
    clearCart,
    availableStock,
    startCheckout,
    resendOtp,
    confirmCheckout,
    printOrder,
    syncNow: runSync,
    resetDemoData,
  };

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export function usePos() {
  const value = useContext(PosContext);
  if (!value) throw new Error('usePos must be used inside PosProvider');
  return value;
}
