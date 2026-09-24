import Constants from 'expo-constants';

import type { Product } from '../core/types';

const DEFAULT_URL = 'https://eclcommerce.ernestchemists.com.gh/api/get-all-products';

/** Re-fetch at most once per day unless the cache is empty. */
export const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;

type EclUom = { id?: number; description?: string | null };
type EclImage = { id?: number; image_url?: string | null };
type EclProduct = {
  url_name?: string | null;
  status?: string | null;
  uom?: EclUom | null;
  otcpom?: string | null;
  drug?: string | null;
  wellness?: string | null;
  selfcare?: string | null;
  accessories?: string | null;
  thumbnail?: string | null;
  images?: EclImage[] | null;
};
type EclListing = {
  id: number;
  product_id?: number;
  price?: number | string | null;
  url_name?: string | null;
  status?: string | null;
  product?: EclProduct | null;
};
type EclResponse = { status?: string; data?: EclListing[] };

function catalogUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_CATALOG_API_URL?.trim();
  if (fromEnv) return fromEnv;
  const fromExtra = Constants.expoConfig?.extra?.catalogApiUrl;
  if (typeof fromExtra === 'string' && fromExtra.trim()) return fromExtra.trim();
  return DEFAULT_URL;
}

function titleFromSlug(slug: string): string {
  const withoutHash = slug.replace(/-[a-f0-9]{8,}$/i, '');
  const parts = withoutHash.split('-');
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part) continue;
    parts[i] = part.charAt(0).toUpperCase() + part.slice(1);
  }
  return parts.filter(Boolean).join(' ');
}

function displayName(listing: EclListing): string {
  const thumbnail = listing.product?.thumbnail;
  if (thumbnail) {
    const slash = thumbnail.lastIndexOf('/');
    const file = thumbnail.slice(slash + 1);
    const under = file.indexOf('_', 1);
    const dot = file.lastIndexOf('.');
    if (under > 0 && dot > under) {
      return file.slice(under + 1, dot).replace(/'/g, '').trim();
    }
  }
  const slug = listing.url_name ?? listing.product?.url_name ?? '';
  return slug ? titleFromSlug(slug) : `Product ${listing.product_id ?? listing.id}`;
}

function categoryOf(product: EclProduct | null | undefined): string {
  if (!product) return 'Other';
  if (product.drug) {
    return (product.otcpom ?? 'otc').toLowerCase() === 'pom' ? 'POM' : 'OTC';
  }
  if (product.wellness) return 'Wellness';
  if (product.selfcare) return 'Self Care';
  if (product.accessories) return 'Accessories';
  return 'Other';
}

function safeImageUrl(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  // encodeURI is enough for spaces/apostrophes in CDN paths.
  return encodeURI(trimmed);
}

export function mapEclListing(listing: EclListing, updatedAt: string): Product | null {
  if (listing.status && listing.status !== 'active') return null;
  const nested = listing.product;
  if (nested?.status && nested.status !== 'published') return null;

  const price = Number(listing.price);
  if (!Number.isFinite(price)) return null;

  return {
    id: String(listing.id),
    sku: String(listing.product_id ?? listing.id),
    name: displayName(listing),
    category: categoryOf(nested),
    unit: nested?.uom?.description?.trim() || 'Each',
    price,
    imageUrl: safeImageUrl(nested?.thumbnail),
    updatedAt,
  };
}

export function isCatalogFresh(catalogPulledAt: string | null | undefined, productCount: number): boolean {
  if (!productCount || !catalogPulledAt) return false;
  const pulled = Date.parse(catalogPulledAt);
  if (!Number.isFinite(pulled)) return false;
  return Date.now() - pulled < CATALOG_TTL_MS;
}

export async function fetchCatalogProducts(signal?: AbortSignal): Promise<Product[]> {
  const response = await fetch(catalogUrl(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Catalog request failed (${response.status})`);
  }
  const payload = (await response.json()) as EclResponse;
  if (payload.status && payload.status !== 'success') {
    throw new Error('Catalog API returned an error');
  }
  const rows = Array.isArray(payload.data) ? payload.data : [];
  const updatedAt = new Date().toISOString();
  const products: Product[] = [];
  products.length = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const mapped = mapEclListing(rows[i], updatedAt);
    if (mapped) products.push(mapped);
  }
  // SQLite ORDER BY name — skip a second localeCompare sort on ~2k rows.
  return products;
}
