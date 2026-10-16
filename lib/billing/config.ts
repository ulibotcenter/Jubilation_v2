import {
  BILLING_CURRENCIES,
  BILLING_OFFER_IDS,
  LIST_AMOUNT_CENTS,
  OFFER_META,
  PROMO_AMOUNT_CENTS,
  type BillingCurrency,
  type BillingOfferId,
  type PaidPlanTier,
} from "@/lib/billing/catalog";
import { parseBillingCurrency } from "@/lib/billing/geo";
import {
  createStripePriceRetriever,
  stripePriceMatchesCatalog,
  type RetrieveStripePrice,
  type StripePriceSnapshot,
} from "@/lib/billing/stripePrice";
import { isPaidPlanTier, type PlanTier } from "@/lib/plans";

export type { BillingCurrency, BillingOfferId };
export { BILLING_OFFER_IDS, parseBillingCurrency, isPaidPlanTier };

/**
 * Optional Stripe billing. Checkout is on when STRIPE_SECRET_KEY is set and at
 * least one STRIPE_PRICE_* id exists. A Price is checkout-ready only when
 * Stripe says its unit amount, currency, and interval match the promo catalog
 * cell. Wrong amounts (including the live test-mode USD monthly ids) are
 * treated as missing. The UI still shows catalog list + promo.
 *
 * Completo+Cônjuge (`couple`) is a third plan. Do not create Products or
 * Prices from this codebase.
 */
export type BillingDisabledReason = "missing_env" | "cloud_required" | "disabled";

export interface BillingPriceSlot {
  currency: BillingCurrency;
  priceId: string;
  unitAmount: number;
  listAmount: number;
}

export interface BillingOffer {
  id: BillingOfferId;
  plan: PaidPlanTier;
  interval: "year" | "month";
  prices: BillingPriceSlot[];
}

export interface CheckoutPrice {
  id: BillingOfferId;
  plan: PaidPlanTier;
  interval: "year" | "month";
  priceId: string;
  unitAmount: number;
  listAmount: number;
  currency: BillingCurrency;
}

export interface PublicBillingAmount {
  currency: BillingCurrency;
  unitAmount: number;
  listAmount: number;
  checkoutReady: boolean;
}

export interface PublicBillingOffer {
  id: BillingOfferId;
  plan: PaidPlanTier;
  interval: "year" | "month";
  amounts: PublicBillingAmount[];
}

export interface BillingConfig {
  enabled: boolean;
  reason: BillingDisabledReason | null;
  secretKey: string;
  webhookSecret: string;
  currency: string;
  offers: BillingOffer[];
}

export interface PublicBillingStatus {
  enabled: boolean;
  reason: BillingDisabledReason | null;
  settlement: "br";
  currencies: BillingCurrency[];
  offers: PublicBillingOffer[];
}

/**
 * First non-empty wins inside a cell, then the plan-level alias is tried
 * against Stripe. Unsuffixed PREMIUM_YEARLY / HORIZON_YEARLY stay BRL yearly
 * slots. BASICO / COMPLETO / COMPLETO_CONJUGE are plan aliases matched by
 * Stripe amount/currency/interval onto any cell of that plan.
 */
const PRICE_ENV: Record<
  BillingOfferId,
  Record<BillingCurrency, readonly string[]>
> = {
  premium_monthly: {
    brl: [
      "STRIPE_PRICE_BASICO_MONTHLY",
      "STRIPE_PRICE_BASICO_MONTHLY_BRL",
      "STRIPE_PRICE_PREMIUM_MONTHLY",
      "STRIPE_PRICE_PREMIUM_MONTHLY_BRL",
    ],
    usd: ["STRIPE_PRICE_BASICO_MONTHLY_USD", "STRIPE_PRICE_PREMIUM_MONTHLY_USD"],
    eur: ["STRIPE_PRICE_BASICO_MONTHLY_EUR", "STRIPE_PRICE_PREMIUM_MONTHLY_EUR"],
  },
  premium_yearly: {
    brl: [
      "STRIPE_PRICE_BASICO_YEARLY",
      "STRIPE_PRICE_BASICO_YEARLY_BRL",
      "STRIPE_PRICE_PREMIUM_YEARLY",
      "STRIPE_PRICE_PREMIUM_YEARLY_BRL",
    ],
    usd: ["STRIPE_PRICE_BASICO_YEARLY_USD", "STRIPE_PRICE_PREMIUM_YEARLY_USD"],
    eur: ["STRIPE_PRICE_BASICO_YEARLY_EUR", "STRIPE_PRICE_PREMIUM_YEARLY_EUR"],
  },
  horizon_monthly: {
    brl: [
      "STRIPE_PRICE_COMPLETO_MONTHLY",
      "STRIPE_PRICE_COMPLETO_MONTHLY_BRL",
      "STRIPE_PRICE_HORIZON_MONTHLY",
      "STRIPE_PRICE_HORIZON_MONTHLY_BRL",
    ],
    usd: ["STRIPE_PRICE_COMPLETO_MONTHLY_USD", "STRIPE_PRICE_HORIZON_MONTHLY_USD"],
    eur: ["STRIPE_PRICE_COMPLETO_MONTHLY_EUR", "STRIPE_PRICE_HORIZON_MONTHLY_EUR"],
  },
  horizon_yearly: {
    brl: [
      "STRIPE_PRICE_COMPLETO_YEARLY",
      "STRIPE_PRICE_COMPLETO_YEARLY_BRL",
      "STRIPE_PRICE_HORIZON_YEARLY",
      "STRIPE_PRICE_HORIZON_YEARLY_BRL",
    ],
    usd: ["STRIPE_PRICE_COMPLETO_YEARLY_USD", "STRIPE_PRICE_HORIZON_YEARLY_USD"],
    eur: ["STRIPE_PRICE_COMPLETO_YEARLY_EUR", "STRIPE_PRICE_HORIZON_YEARLY_EUR"],
  },
  couple_monthly: {
    brl: [
      "STRIPE_PRICE_COMPLETO_CONJUGE_MONTHLY",
      "STRIPE_PRICE_COMPLETO_CONJUGE_MONTHLY_BRL",
    ],
    usd: ["STRIPE_PRICE_COMPLETO_CONJUGE_MONTHLY_USD"],
    eur: ["STRIPE_PRICE_COMPLETO_CONJUGE_MONTHLY_EUR"],
  },
  couple_yearly: {
    brl: [
      "STRIPE_PRICE_COMPLETO_CONJUGE_YEARLY",
      "STRIPE_PRICE_COMPLETO_CONJUGE_YEARLY_BRL",
    ],
    usd: ["STRIPE_PRICE_COMPLETO_CONJUGE_YEARLY_USD"],
    eur: ["STRIPE_PRICE_COMPLETO_CONJUGE_YEARLY_EUR"],
  },
};

const PLAN_ALIAS_ENV: Record<PaidPlanTier, readonly string[]> = {
  premium: ["STRIPE_PRICE_BASICO"],
  horizon: ["STRIPE_PRICE_COMPLETO"],
  couple: ["STRIPE_PRICE_COMPLETO_CONJUGE"],
};

export function priceEnvKeysForCell(
  offerId: BillingOfferId,
  currency: BillingCurrency
): readonly string[] {
  return [
    ...PRICE_ENV[offerId][currency],
    ...PLAN_ALIAS_ENV[OFFER_META[offerId].plan],
  ];
}

export function allPriceEnvKeys(): string[] {
  const keys = new Set<string>();
  for (const offerId of BILLING_OFFER_IDS) {
    for (const currency of BILLING_CURRENCIES) {
      for (const key of priceEnvKeysForCell(offerId, currency)) keys.add(key);
    }
  }
  return [...keys];
}

function flagOff(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "0" || v === "false" || v === "off" || v === "no";
}

function firstEnv(
  env: Record<string, string | undefined>,
  keys: readonly string[]
): string {
  for (const key of keys) {
    const value = env[key]?.trim() ?? "";
    if (value) return value;
  }
  return "";
}

/** Stripe Price ids start with price_. Reject bare numbers so cents never land here. */
export function isStripePriceId(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^\d+$/.test(v)) return false;
  return v.startsWith("price_") || v.length >= 8;
}

export function isBillingOfferId(value: string): value is BillingOfferId {
  return value in OFFER_META;
}

export function promoAmountCents(
  offerId: BillingOfferId,
  currency: BillingCurrency
): number {
  return PROMO_AMOUNT_CENTS[offerId][currency];
}

export function listAmountCents(
  offerId: BillingOfferId,
  currency: BillingCurrency
): number {
  return LIST_AMOUNT_CENTS[offerId][currency];
}

/** @deprecated Display is the promo catalog, not env overrides. */
export function displayAmountCents(
  _env: Record<string, string | undefined>,
  offerId: BillingOfferId,
  currency: BillingCurrency
): number {
  return promoAmountCents(offerId, currency);
}

export function candidatePriceIdsForCell(
  env: Record<string, string | undefined>,
  offerId: BillingOfferId,
  currency: BillingCurrency
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const key of priceEnvKeysForCell(offerId, currency)) {
    const value = env[key]?.trim() ?? "";
    if (!isStripePriceId(value) || seen.has(value)) continue;
    seen.add(value);
    ids.push(value);
  }
  return ids;
}

function hasAnyPriceId(env: Record<string, string | undefined>): boolean {
  for (const offerId of BILLING_OFFER_IDS) {
    for (const currency of BILLING_CURRENCIES) {
      if (candidatePriceIdsForCell(env, offerId, currency).length > 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Env ids only — not checkout-ready until Stripe matches the promo cell.
 * Exact currency; no BRL fallback.
 */
export function parseBillingOffers(
  env: Record<string, string | undefined>
): BillingOffer[] {
  const offers: BillingOffer[] = [];
  for (const id of BILLING_OFFER_IDS) {
    const spec = OFFER_META[id];
    const prices: BillingPriceSlot[] = [];
    for (const currency of BILLING_CURRENCIES) {
      const priceId = firstEnv(env, PRICE_ENV[id][currency]);
      const alias = firstEnv(env, PLAN_ALIAS_ENV[spec.plan]);
      const chosen = isStripePriceId(priceId)
        ? priceId
        : isStripePriceId(alias)
          ? alias
          : "";
      if (!chosen) continue;
      prices.push({
        currency,
        priceId: chosen,
        unitAmount: promoAmountCents(id, currency),
        listAmount: listAmountCents(id, currency),
      });
    }
    if (prices.length === 0) continue;
    offers.push({
      id,
      plan: spec.plan,
      interval: spec.interval,
      prices,
    });
  }
  return offers;
}

export function slotForCheckout(
  offer: BillingOffer,
  currency: BillingCurrency
): BillingPriceSlot | undefined {
  return offer.prices.find((item) => item.currency === currency);
}

export function resolveCheckoutPrice(
  offers: BillingOffer[],
  offerId: string,
  currency: BillingCurrency
): CheckoutPrice | null {
  const offer = offers.find((item) => item.id === offerId);
  if (!offer) return null;
  const slot = slotForCheckout(offer, currency);
  if (!slot) return null;
  return {
    id: offer.id,
    plan: offer.plan,
    interval: offer.interval,
    priceId: slot.priceId,
    unitAmount: slot.unitAmount,
    listAmount: slot.listAmount,
    currency: slot.currency,
  };
}

export async function matchPriceIdForCell(
  env: Record<string, string | undefined>,
  offerId: BillingOfferId,
  currency: BillingCurrency,
  retrieve: RetrieveStripePrice
): Promise<{ priceId: string; snapshot: StripePriceSnapshot } | null> {
  const expected = {
    unitAmount: promoAmountCents(offerId, currency),
    currency,
    interval: OFFER_META[offerId].interval,
  };
  for (const priceId of candidatePriceIdsForCell(env, offerId, currency)) {
    const snapshot = await retrieve(priceId);
    if (snapshot && stripePriceMatchesCatalog(snapshot, expected)) {
      return { priceId, snapshot };
    }
  }
  return null;
}

export async function matchedBillingOffers(
  env: Record<string, string | undefined>,
  retrieve: RetrieveStripePrice
): Promise<BillingOffer[]> {
  const offers: BillingOffer[] = [];
  for (const id of BILLING_OFFER_IDS) {
    const spec = OFFER_META[id];
    const prices: BillingPriceSlot[] = [];
    for (const currency of BILLING_CURRENCIES) {
      const match = await matchPriceIdForCell(env, id, currency, retrieve);
      if (!match) continue;
      prices.push({
        currency,
        priceId: match.priceId,
        unitAmount: promoAmountCents(id, currency),
        listAmount: listAmountCents(id, currency),
      });
    }
    if (prices.length === 0) continue;
    offers.push({
      id,
      plan: spec.plan,
      interval: spec.interval,
      prices,
    });
  }
  return offers;
}

export async function resolveMatchedCheckoutPrice(
  env: Record<string, string | undefined>,
  offerId: string,
  currency: BillingCurrency,
  retrieve?: RetrieveStripePrice
): Promise<CheckoutPrice | null> {
  if (!isBillingOfferId(offerId)) return null;
  const match = await matchPriceIdForCell(
    env,
    offerId,
    currency,
    retrieverFor(env, retrieve)
  );
  if (!match) return null;
  const spec = OFFER_META[offerId];
  return {
    id: offerId,
    plan: spec.plan,
    interval: spec.interval,
    priceId: match.priceId,
    unitAmount: promoAmountCents(offerId, currency),
    listAmount: listAmountCents(offerId, currency),
    currency,
  };
}

export function billingConfig(
  env: Record<string, string | undefined> = process.env
): BillingConfig {
  const secretKey = env.STRIPE_SECRET_KEY?.trim() ?? "";
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const currency = (env.STRIPE_CURRENCY ?? "brl").trim().toLowerCase() || "brl";
  const offers = parseBillingOffers(env);
  const killed = flagOff(env.BILLING) || flagOff(env.STRIPE);
  const hasStripe = secretKey.length > 0 && hasAnyPriceId(env);

  if (killed) {
    return {
      enabled: false,
      reason: "disabled",
      secretKey: "",
      webhookSecret: "",
      currency,
      offers: [],
    };
  }

  if (!hasStripe) {
    return {
      enabled: false,
      reason: "missing_env",
      secretKey: "",
      webhookSecret: "",
      currency,
      offers,
    };
  }

  return {
    enabled: true,
    reason: null,
    secretKey,
    webhookSecret,
    currency,
    offers,
  };
}

function retrieverFor(
  env: Record<string, string | undefined>,
  retrieve?: RetrieveStripePrice
): RetrieveStripePrice {
  if (retrieve) return retrieve;
  return createStripePriceRetriever(env.STRIPE_SECRET_KEY?.trim() ?? "");
}

export async function billingConfigMatched(
  env: Record<string, string | undefined> = process.env,
  retrieve?: RetrieveStripePrice
): Promise<BillingConfig> {
  const cfg = billingConfig(env);
  if (!cfg.enabled) {
    return { ...cfg, offers: [] };
  }
  const offers = await matchedBillingOffers(env, retrieverFor(env, retrieve));
  return { ...cfg, offers };
}

function catalogOffers(matched: BillingOffer[], enabled: boolean): PublicBillingOffer[] {
  return BILLING_OFFER_IDS.map((id) => {
    const spec = OFFER_META[id];
    const live = matched.find((offer) => offer.id === id);
    return {
      id,
      plan: spec.plan,
      interval: spec.interval,
      amounts: BILLING_CURRENCIES.map((currency) => ({
        currency,
        unitAmount: promoAmountCents(id, currency),
        listAmount: listAmountCents(id, currency),
        checkoutReady: Boolean(
          enabled && live?.prices.some((slot) => slot.currency === currency)
        ),
      })),
    };
  });
}

export function catalogBillingStatus(
  env: Record<string, string | undefined> = {}
): PublicBillingStatus {
  const cfg = billingConfig(env);
  return {
    enabled: cfg.enabled,
    reason: cfg.reason,
    settlement: "br",
    currencies: [...BILLING_CURRENCIES],
    offers: catalogOffers([], cfg.enabled),
  };
}

export async function publicBillingStatus(
  env: Record<string, string | undefined> = process.env,
  retrieve?: RetrieveStripePrice
): Promise<PublicBillingStatus> {
  const cfg = await billingConfigMatched(env, retrieve);
  return {
    enabled: cfg.enabled,
    reason: cfg.reason,
    settlement: "br",
    currencies: [...BILLING_CURRENCIES],
    offers: catalogOffers(cfg.offers, cfg.enabled),
  };
}

export function offerById(
  offers: BillingOffer[],
  id: string
): BillingOffer | undefined {
  return offers.find((offer) => offer.id === id);
}

export function planFromPriceId(
  offers: BillingOffer[],
  priceId: string | null | undefined
): PaidPlanTier | null {
  if (!priceId) return null;
  const offer = offers.find((item) =>
    item.prices.some((slot) => slot.priceId === priceId)
  );
  return offer?.plan ?? null;
}

export type { PlanTier };
