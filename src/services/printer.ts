import { formatMoney } from '../core/cart';
import type { Order, Rep } from '../core/types';

export type PaperWidth = 58 | 80;

const WIDTHS: Record<PaperWidth, number> = { 58: 32, 80: 48 };

function line(left: string, right: string, width: number) {
  const gap = Math.max(1, width - left.length - right.length);
  return `${left}${' '.repeat(gap)}${right}`;
}

/** ESC/POS-ready plain text receipt, streamed to the Bluetooth thermal printer. */
export function renderReceipt(order: Order, rep: Rep, paper: PaperWidth = 58): string {
  const width = WIDTHS[paper];
  const rule = '-'.repeat(width);
  const rows = [
    'SAGE VAN SALES'.padStart(Math.floor((width + 14) / 2)),
    `Van ${rep.vanCode} / ${rep.depot}`,
    `Rep: ${rep.name}`,
    rule,
    `Doc: ${order.serverDocNo ?? `OFFLINE-${order.id.slice(0, 8)}`}`,
    `Date: ${new Date(order.createdAt).toLocaleString()}`,
    `Customer: ${order.customerName}`,
    rule,
  ];
  for (const item of order.lines) {
    rows.push(`${item.qty} x ${item.name}`.slice(0, width));
    rows.push(line(`  @ ${formatMoney(item.unitPrice)}`, formatMoney(item.lineTotal), width));
  }
  rows.push(rule);
  rows.push(line('Subtotal', formatMoney(order.subtotal), width));
  rows.push(line('VAT/Levies', formatMoney(order.tax), width));
  rows.push(line('TOTAL', formatMoney(order.total), width));
  rows.push(line('Payment', order.paymentMethod.toUpperCase(), width));
  rows.push(rule);
  rows.push(order.otpVerifiedAt ? 'Delivery confirmed by customer OTP' : 'OTP NOT VERIFIED');
  rows.push(order.status === 'synced' ? 'Posted to ERP' : 'Queued offline - will post on sync');
  return rows.join('\n');
}

export type PrinterStatus = 'connected' | 'disconnected';

export type BluetoothPrinter = {
  name: string;
  address: string;
  paper: PaperWidth;
  status: PrinterStatus;
};

export const DEFAULT_PRINTER: BluetoothPrinter = {
  name: 'RPP02N Thermal',
  address: '66:22:11:AB:0C:4D',
  paper: 58,
  status: 'connected',
};

export async function printReceipt(payload: string): Promise<void> {
  // A device build pipes this through the Bluetooth SPP socket; in preview the
  // payload is surfaced in-app instead.
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (__DEV__) console.log(payload);
}
