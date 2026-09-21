import type { Customer, Product, VanStockLine } from '../core/types';

const NOW = '2026-01-05T06:00:00.000Z';

export const SEED_PRODUCTS: Product[] = [
  { id: 'P-1001', sku: 'BEV-CL-50', name: 'Cola 500ml', category: 'Beverages', unit: 'Crate', price: 62, updatedAt: NOW },
  { id: 'P-1002', sku: 'BEV-OR-50', name: 'Orange Soda 500ml', category: 'Beverages', unit: 'Crate', price: 58, updatedAt: NOW },
  { id: 'P-1003', sku: 'WTR-15L', name: 'Mineral Water 1.5L', category: 'Beverages', unit: 'Pack', price: 24.5, updatedAt: NOW },
  { id: 'P-2001', sku: 'SNK-BIS-20', name: 'Cream Biscuits 20g', category: 'Snacks', unit: 'Carton', price: 96, updatedAt: NOW },
  { id: 'P-2002', sku: 'SNK-CHP-40', name: 'Potato Chips 40g', category: 'Snacks', unit: 'Carton', price: 112, updatedAt: NOW },
  { id: 'P-3001', sku: 'HOM-SOAP-6', name: 'Bar Soap 6-pack', category: 'Home Care', unit: 'Pack', price: 41, updatedAt: NOW },
  { id: 'P-3002', sku: 'HOM-DET-1K', name: 'Detergent 1kg', category: 'Home Care', unit: 'Bag', price: 33.75, updatedAt: NOW },
  { id: 'P-4001', sku: 'DRY-RCE-5K', name: 'Rice 5kg', category: 'Dry Goods', unit: 'Bag', price: 89, updatedAt: NOW },
  { id: 'P-4002', sku: 'DRY-OIL-5L', name: 'Cooking Oil 5L', category: 'Dry Goods', unit: 'Jerrycan', price: 154, updatedAt: NOW },
];

export const SEED_CUSTOMERS: Customer[] = [
  { id: 'C-501', code: 'CUS-501', name: 'Adom Mini Mart', phone: '+233201234501', route: 'Accra North', balance: 320.5, updatedAt: NOW },
  { id: 'C-502', code: 'CUS-502', name: 'Bekoe Provisions', phone: '+233201234502', route: 'Accra North', balance: 0, updatedAt: NOW },
  { id: 'C-503', code: 'CUS-503', name: 'Chop Bar Kitchen', phone: '+233201234503', route: 'Tema West', balance: 145, updatedAt: NOW },
  { id: 'C-504', code: 'CUS-504', name: 'Dela Wholesale', phone: '+233201234504', route: 'Tema West', balance: 980.25, updatedAt: NOW },
  { id: 'C-505', code: 'CUS-505', name: 'Efua Corner Shop', phone: '+233201234505', route: 'Kasoa', balance: 62, updatedAt: NOW },
];

export const SEED_VAN_STOCK: VanStockLine[] = [
  { productId: 'P-1001', qtyLoaded: 40, qtyOnHand: 40, updatedAt: NOW },
  { productId: 'P-1002', qtyLoaded: 30, qtyOnHand: 30, updatedAt: NOW },
  { productId: 'P-1003', qtyLoaded: 60, qtyOnHand: 60, updatedAt: NOW },
  { productId: 'P-2001', qtyLoaded: 25, qtyOnHand: 25, updatedAt: NOW },
  { productId: 'P-2002', qtyLoaded: 18, qtyOnHand: 18, updatedAt: NOW },
  { productId: 'P-3001', qtyLoaded: 50, qtyOnHand: 50, updatedAt: NOW },
  { productId: 'P-3002', qtyLoaded: 45, qtyOnHand: 45, updatedAt: NOW },
  { productId: 'P-4001', qtyLoaded: 35, qtyOnHand: 35, updatedAt: NOW },
  { productId: 'P-4002', qtyLoaded: 12, qtyOnHand: 12, updatedAt: NOW },
];
