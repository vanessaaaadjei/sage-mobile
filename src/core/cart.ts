import type { OrderLine, Product } from './types';

export const TAX_RATE = 0.15;

export type CartItem = { product: Product; qty: number };

export function toOrderLines(items: CartItem[]): OrderLine[] {
  return items.map(({ product, qty }) => ({
    productId: product.id,
    sku: product.sku,
    name: product.name,
    unit: product.unit,
    qty,
    unitPrice: product.price,
    lineTotal: round(product.price * qty),
  }));
}

export function totals(lines: OrderLine[]) {
  const subtotal = round(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const tax = round(subtotal * TAX_RATE);
  return { subtotal, tax, total: round(subtotal + tax) };
}

export function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatMoney(value: number) {
  return `GHS ${value.toFixed(2)}`;
}
