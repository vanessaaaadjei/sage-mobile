import type { Customer, Order, Product, VanStockLine } from '../core/types';

/**
 * Client contract for the sync endpoints. No backend ships with this app: the
 * methods below are unimplemented hooks. Point them at the real service by
 * replacing the bodies with `fetch` calls — the rest of the app already speaks
 * this shape (bearer token, delta cursor, batched pushes keyed by idempotency
 * key) and needs no other change.
 */

export type DeltaResponse = {
  cursor: string;
  products: Product[];
  customers: Customer[];
  vanStock: VanStockLine[];
};

export type PushResult = {
  idempotencyKey: string;
  accepted: boolean;
  docNo?: string;
  error?: string;
  duplicate?: boolean;
};

export class OfflineError extends Error {
  constructor() {
    super('No connection');
    this.name = 'OfflineError';
  }
}

export class SyncNotConfiguredError extends Error {
  constructor(endpoint: string) {
    super(`${endpoint} is not wired up — implement it in src/services/syncApi.ts`);
    this.name = 'SyncNotConfiguredError';
  }
}

export class SyncApi {
  private token: string | null = null;
  private online = true;

  get isOnline() {
    return this.online;
  }

  setOnline(value: boolean) {
    this.online = value;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  get authToken() {
    return this.token;
  }

  private assertOnline() {
    if (!this.online) throw new OfflineError();
  }

  /** POST /auth/token */
  async login(_username: string, _pin: string): Promise<string> {
    this.assertOnline();
    throw new SyncNotConfiguredError('Sign-in endpoint');
  }

  /** GET /sync/delta?since=<cursor> */
  async pullDelta(_cursor: string | null): Promise<DeltaResponse> {
    this.assertOnline();
    throw new SyncNotConfiguredError('Catalogue delta endpoint');
  }

  /** POST /sync/orders — batch push, deduplicated on Idempotency-Key. */
  async pushOrders(_orders: Order[]): Promise<PushResult[]> {
    this.assertOnline();
    throw new SyncNotConfiguredError('Order push endpoint');
  }
}
