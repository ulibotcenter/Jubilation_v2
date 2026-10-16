import type { BillingCurrency, BillingInterval } from "@/lib/billing/catalog";

export interface StripePriceSnapshot {
  id: string;
  unitAmount: number;
  currency: string;
  interval: BillingInterval | null;
  intervalCount: number;
  active: boolean;
}

export type RetrieveStripePrice = (
  priceId: string
) => Promise<StripePriceSnapshot | null>;

interface StripePriceJson {
  id?: string;
  active?: boolean;
  currency?: string;
  unit_amount?: number | null;
  type?: string;
  recurring?: {
    interval?: string;
    interval_count?: number;
  } | null;
  error?: { message?: string };
}

export function parseStripePriceJson(
  json: StripePriceJson | null | undefined,
  fallbackId = ""
): StripePriceSnapshot | null {
  if (!json || typeof json !== "object") return null;
  const id = typeof json.id === "string" ? json.id : fallbackId;
  if (!id) return null;
  const unitAmount = json.unit_amount;
  if (typeof unitAmount !== "number" || !Number.isFinite(unitAmount) || unitAmount <= 0) {
    return null;
  }
  const currency =
    typeof json.currency === "string" ? json.currency.trim().toLowerCase() : "";
  if (!currency) return null;
  const intervalRaw = json.recurring?.interval;
  const interval =
    intervalRaw === "month" || intervalRaw === "year" ? intervalRaw : null;
  const intervalCount = json.recurring?.interval_count ?? 1;
  return {
    id,
    unitAmount,
    currency,
    interval,
    intervalCount: Number.isFinite(intervalCount) ? intervalCount : 1,
    active: json.active !== false,
  };
}

export function stripePriceMatchesCatalog(
  price: StripePriceSnapshot,
  expected: {
    unitAmount: number;
    currency: BillingCurrency;
    interval: BillingInterval;
  }
): boolean {
  return (
    price.active &&
    price.unitAmount === expected.unitAmount &&
    price.currency === expected.currency &&
    price.interval === expected.interval &&
    price.intervalCount === 1
  );
}

const retrieveCache = new Map<
  string,
  { at: number; value: StripePriceSnapshot | null }
>();
const RETRIEVE_TTL_MS = 60_000;

export async function retrieveStripePrice(
  secretKey: string,
  priceId: string,
  fetchImpl: typeof fetch = fetch
): Promise<StripePriceSnapshot | null> {
  const key = `${secretKey.slice(0, 12)}:${priceId}`;
  const cached = retrieveCache.get(key);
  const now = Date.now();
  if (cached && now - cached.at < RETRIEVE_TTL_MS) return cached.value;

  try {
    const res = await fetchImpl(
      `https://api.stripe.com/v1/prices/${encodeURIComponent(priceId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${secretKey}` },
        cache: "no-store",
      }
    );
    const json = (await res.json()) as StripePriceJson;
    const parsed = res.ok ? parseStripePriceJson(json, priceId) : null;
    retrieveCache.set(key, { at: now, value: parsed });
    return parsed;
  } catch {
    retrieveCache.set(key, { at: now, value: null });
    return null;
  }
}

export function createStripePriceRetriever(
  secretKey: string,
  fetchImpl: typeof fetch = fetch
): RetrieveStripePrice {
  if (!secretKey.trim()) {
    return async () => null;
  }
  return (priceId) => retrieveStripePrice(secretKey, priceId, fetchImpl);
}

/** Test helper — skip the process cache. */
export function retrieveFromSnapshots(
  snapshots: Record<string, StripePriceSnapshot | null>
): RetrieveStripePrice {
  return async (priceId) => snapshots[priceId] ?? null;
}
