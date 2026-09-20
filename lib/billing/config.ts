import {
  BILLING_CURRENCIES,
  DISPLAY_AMOUNT_CENTS,
  type BillingCurrency,
  type BillingOfferId,
} from "@/lib/billing/catalog";
import { cloudAuthConfig } from "@/lib/cloud/config";
import type { PlanTier } from "@/lib/plans";

export type { BillingCurrency, BillingOfferId };

/**
 * Optional Stripe billing. Off unless the secret, webhook secret, and at least
 * one STRIPE_PRICE_* id exist — and the cloud account (Postgres) is on, because
 * PlanTier is stored on the server, not in the browser.
 *
 * Prefer a Stripe account in Brazil. The same two products (Individual,
 * Couple) hold Price objects in BRL, USD, and EUR. Do not require a US entity.
 * Do not create nine products.
 *
 * Amounts in STRIPE_PRICE_*_AMOUNT (and *_USD_AMOUNT / *_EUR_AMOUNT) are
 * display placeholders. Checkout always charges the Stripe Price object
 * that matches the user's display currency.
 */
export type BillingDisabledReason = "missing_env" | "cloud_required" | "disabled";

export interface BillingPriceSlot {
  currency: BillingCurrency;
  priceId: string;
  unitAmount: number;
}

export interface BillingOffer {
  id: BillingOfferId;
  plan: Exclude<PlanTier, "free">;
  interval: "year" | "month";
  prices: BillingPriceSlot[];
}

export interface CheckoutPrice {
  id: BillingOfferId;
  plan: Exclude<PlanTier, "free">;
  interval: "year" | "month";
  priceId: string;
  unitAmount: number;
  currency: BillingCurrency;
}

export interface PublicBillingAmount {
  currency: BillingCurrency;
  unitAmount: number;
  checkoutReady: boolean;
}

export interface PublicBillingOffer {
  id: BillingOfferId;
  plan: Exclude<PlanTier, "free">;
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

const OFFER_META: Record<
  BillingOfferId,
  { plan: Exclude<PlanTier, "free">; interval: "year" | "month" }
> = {
  premium_yearly: { plan: "premium", interval: "year" },
  premium_monthly: { plan: "premium", interval: "month" },
  horizon_yearly: { plan: "horizon", interval: "year" },
};

export const BILLING_OFFER_IDS = Object.keys(OFFER_META) as BillingOfferId[];

/**
 * First non-empty wins. Unsuffixed names stay the BRL slots so existing
 * deployments keep working. `_BRL` is accepted as an explicit alias.
 */
const PRICE_ENV: Record<
  BillingOfferId,
  Record<BillingCurrency, readonly string[]>
> = {
  premium_yearly: {
    brl: ["STRIPE_PRICE_PREMIUM_YEARLY", "STRIPE_PRICE_PREMIUM_YEARLY_BRL"],
    usd: ["STRIPE_PRICE_PREMIUM_YEARLY_USD"],
    eur: ["STRIPE_PRICE_PREMIUM_YEARLY_EUR"],
  },
  premium_monthly: {
    brl: ["STRIPE_PRICE_PREMIUM_MONTHLY", "STRIPE_PRICE_PREMIUM_MONTHLY_BRL"],
    usd: ["STRIPE_PRICE_PREMIUM_MONTHLY_USD"],
    eur: ["STRIPE_PRICE_PREMIUM_MONTHLY_EUR"],
  },
  horizon_yearly: {
    brl: ["STRIPE_PRICE_HORIZON_YEARLY", "STRIPE_PRICE_HORIZON_YEARLY_BRL"],
    usd: ["STRIPE_PRICE_HORIZON_YEARLY_USD"],
    eur: ["STRIPE_PRICE_HORIZON_YEARLY_EUR"],
  },
};

const AMOUNT_ENV: Record<
  BillingOfferId,
  Record<BillingCurrency, readonly string[]>
> = {
  premium_yearly: {
    brl: [
      "STRIPE_PRICE_PREMIUM_YEARLY_AMOUNT",
      "STRIPE_PRICE_PREMIUM_YEARLY_BRL_AMOUNT",
    ],
    usd: ["STRIPE_PRICE_PREMIUM_YEARLY_USD_AMOUNT"],
    eur: ["STRIPE_PRICE_PREMIUM_YEARLY_EUR_AMOUNT"],
  },
  premium_monthly: {
    brl: [
      "STRIPE_PRICE_PREMIUM_MONTHLY_AMOUNT",
      "STRIPE_PRICE_PREMIUM_MONTHLY_BRL_AMOUNT",
    ],
    usd: ["STRIPE_PRICE_PREMIUM_MONTHLY_USD_AMOUNT"],
    eur: ["STRIPE_PRICE_PREMIUM_MONTHLY_EUR_AMOUNT"],
  },
  horizon_yearly: {
    brl: [
      "STRIPE_PRICE_HORIZON_YEARLY_AMOUNT",
      "STRIPE_PRICE_HORIZON_YEARLY_BRL_AMOUNT",
    ],
    usd: ["STRIPE_PRICE_HORIZON_YEARLY_USD_AMOUNT"],
    eur: ["STRIPE_PRICE_HORIZON_YEARLY_EUR_AMOUNT"],
  },
};

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

function parseAmountCents(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function isBillingOfferId(value: string): value is BillingOfferId {
  return value in OFFER_META;
}

export function parseBillingCurrency(value: unknown): BillingCurrency | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return (BILLING_CURRENCIES as readonly string[]).includes(v)
    ? (v as BillingCurrency)
    : null;
}

export function displayAmountCents(
  env: Record<string, string | undefined>,
  offerId: BillingOfferId,
  currency: BillingCurrency
): number {
  const parsed = parseAmountCents(firstEnv(env, AMOUNT_ENV[offerId][currency]));
  return parsed ?? DISPLAY_AMOUNT_CENTS[offerId][currency];
}

export function parseBillingOffers(
  env: Record<string, string | undefined>
): BillingOffer[] {
  const offers: BillingOffer[] = [];
  for (const id of BILLING_OFFER_IDS) {
    const spec = OFFER_META[id];
    const prices: BillingPriceSlot[] = [];
    for (const currency of BILLING_CURRENCIES) {
      const priceId = firstEnv(env, PRICE_ENV[id][currency]);
      if (!isStripePriceId(priceId)) continue;
      prices.push({
        currency,
        priceId,
        unitAmount: displayAmountCents(env, id, currency),
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

export function resolveCheckoutPrice(
  offers: BillingOffer[],
  offerId: string,
  currency: BillingCurrency
): CheckoutPrice | null {
  const offer = offers.find((item) => item.id === offerId);
  if (!offer) return null;
  const slot = offer.prices.find((item) => item.currency === currency);
  if (!slot) return null;
  return {
    id: offer.id,
    plan: offer.plan,
    interval: offer.interval,
    priceId: slot.priceId,
    unitAmount: slot.unitAmount,
    currency: slot.currency,
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
  const hasStripe =
    secretKey.length > 0 && webhookSecret.length > 0 && offers.length > 0;

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

  if (!cloudAuthConfig(env).enabled) {
    return {
      enabled: false,
      reason: "cloud_required",
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

export function publicBillingStatus(
  env: Record<string, string | undefined> = process.env
): PublicBillingStatus {
  const cfg = billingConfig(env);
  return {
    enabled: cfg.enabled,
    reason: cfg.reason,
    settlement: "br",
    currencies: [...BILLING_CURRENCIES],
    offers: BILLING_OFFER_IDS.map((id) => {
      const spec = OFFER_META[id];
      const live = cfg.offers.find((offer) => offer.id === id);
      return {
        id,
        plan: spec.plan,
        interval: spec.interval,
        amounts: BILLING_CURRENCIES.map((currency) => ({
          currency,
          unitAmount: displayAmountCents(env, id, currency),
          checkoutReady: Boolean(
            cfg.enabled &&
              live?.prices.some((slot) => slot.currency === currency)
          ),
        })),
      };
    }),
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
): Exclude<PlanTier, "free"> | null {
  if (!priceId) return null;
  const offer = offers.find((item) =>
    item.prices.some((slot) => slot.priceId === priceId)
  );
  return offer?.plan ?? null;
}

export function isPaidPlanTier(value: unknown): value is Exclude<PlanTier, "free"> {
  return value === "premium" || value === "horizon";
}
