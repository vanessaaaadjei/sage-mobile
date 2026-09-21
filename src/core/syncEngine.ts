import type { PosStore } from '../db/store';
import type { SyncApi } from '../services/syncApi';
import type { Order } from './types';

export const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;

export type SyncOutcome = {
  pulled: { products: number; customers: number; vanStock: number };
  pushed: { accepted: number; duplicate: number; failed: number };
};

/**
 * Outbox & idempotency queue manager: pulls the delta catalogue/van stock, then
 * drains queued orders in batches. Every order carries a stable idempotency key
 * so a retry after a dropped response can never post a duplicate Sage document.
 */
export class SyncEngine {
  constructor(
    private readonly store: PosStore,
    private readonly api: SyncApi,
  ) {}

  async pull(): Promise<SyncOutcome['pulled']> {
    const snapshot = await this.store.getSyncSnapshot();
    const delta = await this.api.pullDelta(snapshot.cursor);
    if (delta.products.length) await this.store.upsertProducts(delta.products);
    if (delta.customers.length) await this.store.upsertCustomers(delta.customers);
    if (delta.vanStock.length) await this.store.upsertVanStock(delta.vanStock);
    await this.store.setSyncSnapshot({
      ...snapshot,
      cursor: delta.cursor,
      lastPulledAt: new Date().toISOString(),
    });
    return {
      products: delta.products.length,
      customers: delta.customers.length,
      vanStock: delta.vanStock.length,
    };
  }

  async push(): Promise<SyncOutcome['pushed']> {
    const orders = await this.store.listOrders();
    const queued = orders
      .filter((order) => (order.status === 'pending' || order.status === 'failed') && order.attempts < MAX_ATTEMPTS)
      .slice(0, BATCH_SIZE);
    const summary = { accepted: 0, duplicate: 0, failed: 0 };
    if (!queued.length) return summary;

    await Promise.all(queued.map((order) => this.store.updateOrder({ ...order, status: 'syncing' })));

    let results;
    try {
      results = await this.api.pushOrders(queued);
    } catch (error) {
      await Promise.all(
        queued.map((order) =>
          this.store.updateOrder({
            ...order,
            status: 'failed',
            attempts: order.attempts + 1,
            lastError: error instanceof Error ? error.message : 'Push failed',
          }),
        ),
      );
      throw error;
    }

    const byKey = new Map(results.map((result) => [result.idempotencyKey, result]));
    const syncedAt = new Date().toISOString();
    for (const order of queued) {
      const result = byKey.get(order.idempotencyKey);
      const next: Order = result?.accepted
        ? { ...order, status: 'synced', syncedAt, serverDocNo: result.docNo ?? null, lastError: null }
        : {
            ...order,
            status: 'failed',
            attempts: order.attempts + 1,
            lastError: result?.error ?? 'Rejected by server',
          };
      await this.store.updateOrder(next);
      if (result?.accepted) {
        summary.accepted += 1;
        if (result.duplicate) summary.duplicate += 1;
      } else {
        summary.failed += 1;
      }
    }
    const snapshot = await this.store.getSyncSnapshot();
    await this.store.setSyncSnapshot({ ...snapshot, lastPushedAt: syncedAt });
    return summary;
  }

  async sync(): Promise<SyncOutcome> {
    const pulled = await this.pull();
    const pushed = await this.push();
    return { pulled, pushed };
  }
}
