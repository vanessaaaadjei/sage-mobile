import Constants from 'expo-constants';

import type { Customer, Order, Product, VanStockLine } from '../core/types';

/**
 * Client for the Laravel sync endpoints in the architecture diagram.
 * Set EXPO_PUBLIC_SYNC_API_URL (e.g. https://api.example.com/api/v1) to enable.
 * Until that URL is set, methods throw SyncNotConfiguredError so offline POS
 * still runs without a backend.
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
    super(`${endpoint} is not wired up — set EXPO_PUBLIC_SYNC_API_URL when the backend is ready`);
    this.name = 'SyncNotConfiguredError';
  }
}

function configuredBaseUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_SYNC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const fromExtra = Constants.expoConfig?.extra?.syncApiUrl;
  if (typeof fromExtra === 'string' && fromExtra.trim()) return fromExtra.trim().replace(/\/$/, '');
  return null;
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

  private requireBaseUrl(endpoint: string): string {
    const base = configuredBaseUrl();
    if (!base) throw new SyncNotConfiguredError(endpoint);
    return base;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    this.assertOnline();
    const base = this.requireBaseUrl(path);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const response = await fetch(`${base}${path}`, { ...init, headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Sync request failed (${response.status})`);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  /** POST /auth/token */
  async login(username: string, pin: string): Promise<string> {
    const data = await this.request<{ token: string }>('/auth/token', {
      method: 'POST',
      body: JSON.stringify({ username, pin }),
    });
    this.token = data.token;
    return data.token;
  }

  /** GET /sync/delta?since=<cursor> */
  async pullDelta(cursor: string | null): Promise<DeltaResponse> {
    const query = cursor ? `?since=${encodeURIComponent(cursor)}` : '';
    return this.request<DeltaResponse>(`/sync/delta${query}`);
  }

  /** POST /sync/orders — batch push, deduplicated on Idempotency-Key. */
  async pushOrders(orders: Order[]): Promise<PushResult[]> {
    return this.request<PushResult[]>('/sync/orders', {
      method: 'POST',
      body: JSON.stringify({ orders }),
      headers: {
        'Idempotency-Key': orders.map((order) => order.idempotencyKey).join(','),
      },
    });
  }
}
