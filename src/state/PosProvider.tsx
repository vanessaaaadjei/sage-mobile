import * as Crypto from 'expo-crypto';
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { round, TAX_RATE, toOrderLines, totals, type CartItem } from '../core/cart';
import { generateOtp, hashOtp, verifyOtp } from '../core/otp';
import { SyncEngine, type SyncOutcome } from '../core/syncEngine';
import type { Customer, Order, PaymentMethod, Product, Rep, SyncSnapshot, VanStockLine } from '../core/types';
import { SEED_CUSTOMERS } from '../data/seed';
import { getStore } from '../db';
import { InsufficientStockError, type PosStore } from '../db/store';
import { fetchCatalogProducts, isCatalogFresh } from '../services/catalogApi';
import { DEFAULT_PRINTER, printReceipt, renderReceipt, type BluetoothPrinter } from '../services/printer';
import { sendOtpSms, type SmsReceipt } from '../services/sms';
import { OfflineError, SyncApi, SyncNotConfiguredError } from '../services/syncApi';

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
  loadVan(loads: Record<string, number>): Promise<void>;
  startCheckout(customer: Customer, paymentMethod: PaymentMethod): Promise<PendingCheckout>;
  resendOtp(checkout: PendingCheckout): Promise<PendingCheckout>;
  confirmCheckout(checkout: PendingCheckout, code: string): Promise<Order>;
  printOrder(order: Order): Promise<string>;
  syncNow(): Promise<void>;
  resetDemoData(): Promise<void>;
};

const PosContext = createContext<PosContextValue | null>(null);
const SignedInContext = createContext(false);

/** Keeps navigator children from re-rendering when Pos context value identity changes. */
const StableChildren = memo(function StableChildren({ children }: { children: ReactNode }) {
  return <>{children}</>;
});

const EMPTY_SNAPSHOT: SyncSnapshot = {
  lastPulledAt: null,
  lastPushedAt: null,
  cursor: null,
  catalogPulledAt: null,
};

/** Seeds customers only. Product catalogue comes from the ECL commerce API. */
async function seedIfEmpty(store: PosStore) {
  const customers = await store.listCustomers();
  if (!customers.length) {
    await store.upsertCustomers(SEED_CUSTOMERS);
  }
}

async function pullCatalog(store: PosStore, force = false): Promise<number> {
  const [existing, snapshot] = await Promise.all([store.listProducts(), store.getSyncSnapshot()]);
  if (!force && isCatalogFresh(snapshot.catalogPulledAt, existing.length)) {
    return existing.length;
  }
  const products = await fetchCatalogProducts();
  await store.replaceProducts(products);
  await store.pruneOrphanVanStock(products.map((product) => product.id));
  await store.setSyncSnapshot({
    ...snapshot,
    catalogPulledAt: new Date().toISOString(),
  });
  return products.length;
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

      // Defer catalog network work so the first paint stays responsive.
      const schedule =
        typeof requestAnimationFrame === 'function'
          ? (fn: () => void) => requestAnimationFrame(() => setTimeout(fn, 0))
          : (fn: () => void) => setTimeout(fn, 0);

      schedule(() => {
        if (cancelled || !api.isOnline) return;
        void (async () => {
          try {
            const before = (await loaded.listProducts()).length;
            const after = await pullCatalog(loaded, false);
            if (!cancelled && after !== before) await refresh(loaded);
          } catch {
            // Keep cached catalogue.
          }
        })();
      });
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

  const syncingRef = useRef(false);

  const runSync = useCallback(async () => {
    if (!store || !engine.current) return;
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncError(null);

    try {
      try {
        await pullCatalog(store, false);
      } catch (error) {
        if (!(error instanceof TypeError)) {
          setSyncError(error instanceof Error ? error.message : 'Catalog refresh failed');
        }
      }

      try {
        const outcome = await engine.current.sync();
        setLastSync(outcome);
      } catch (error) {
        if (error instanceof SyncNotConfiguredError || error instanceof OfflineError) {
          // Expected until the Laravel sync URL is configured / while offline.
        } else {
          setSyncError(error instanceof Error ? error.message : 'Order sync failed');
        }
      }

      await refresh(store);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [store, refresh]);

  const signIn = useCallback(
    async (username: string, pin: string) => {
      if (!store) throw new Error('Offline storage is still starting');
      if (!username.trim()) throw new Error('Enter your rep ID');
      if (pin.length < 4) throw new Error('Invalid PIN');
      try {
        await api.login(username.trim(), pin);
      } catch (error) {
        if (!(error instanceof SyncNotConfiguredError) && !(error instanceof OfflineError)) {
          throw error;
        }
      }
      setRep({ id: username, name: username, vanCode: 'VAN-07', depot: 'Accra Depot' });
      await refresh(store);
      // Catalog refresh stays in the background — never block sign-in.
      if (api.isOnline) {
        void pullCatalog(store, false)
          .then(async () => refresh(store))
          .catch(() => undefined);
      }
    },
    [store, refresh, api],
  );

  const signOut = useCallback(() => {
    api.setToken(null);
    setRep(null);
    setCart([]);
  }, [api]);

  const stockById = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of vanStock) map.set(line.productId, line.qtyOnHand);
    return map;
  }, [vanStock]);

  const availableStock = useCallback(
    (productId: string) => stockById.get(productId) ?? 0,
    [stockById],
  );

  const loadVan = useCallback(
    async (loads: Record<string, number>) => {
      if (!store) throw new Error('Offline storage is still starting');
      const entries = Object.entries(loads).filter(([, qty]) => qty > 0);
      if (!entries.length) throw new Error('Add at least one unit to load');
      await store.applyVanLoad(Object.fromEntries(entries));
      await refresh(store);
    },
    [store, refresh],
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
      await printReceipt(payload, printer);
      return payload;
    },
    [rep, printer],
  );

  const resetDemoData = useCallback(async () => {
    if (!store) return;
    await store.reset();
    await seedIfEmpty(store);
    setCart([]);
    setLastSync(null);
    setSyncError(null);
    if (api.isOnline) {
      try {
        await pullCatalog(store, true);
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : 'Catalog refresh failed');
      }
    }
    await refresh(store);
  }, [store, refresh, api]);

  const pendingCount = useMemo(
    () => orders.filter((order) => order.status !== 'synced').length,
    [orders],
  );

  const cartTotals = useMemo(() => {
    const subtotal = round(cart.reduce((sum, item) => sum + item.product.price * item.qty, 0));
    return { subtotal, tax: round(subtotal * TAX_RATE), total: round(subtotal * (1 + TAX_RATE)) };
  }, [cart]);

  const storageBackend = store?.backend() ?? 'starting';

  const value = useMemo<PosContextValue>(
    () => ({
      ready,
      rep,
      online,
      syncing,
      storageBackend,
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
      loadVan,
      startCheckout,
      resendOtp,
      confirmCheckout,
      printOrder,
      syncNow: runSync,
      resetDemoData,
    }),
    [
      ready,
      rep,
      online,
      syncing,
      storageBackend,
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
      addToCart,
      setCartQty,
      clearCart,
      availableStock,
      loadVan,
      startCheckout,
      resendOtp,
      confirmCheckout,
      printOrder,
      runSync,
      resetDemoData,
    ],
  );

  return (
    <SignedInContext.Provider value={Boolean(rep)}>
      <PosContext.Provider value={value}>
        <StableChildren>{children}</StableChildren>
      </PosContext.Provider>
    </SignedInContext.Provider>
  );
}

/** Auth gate only — does not re-render when catalogue/cart/orders change. */
export function useSignedIn() {
  return useContext(SignedInContext);
}

export function usePos() {
  const value = useContext(PosContext);
  if (!value) throw new Error('usePos must be used inside PosProvider');
  return value;
}
