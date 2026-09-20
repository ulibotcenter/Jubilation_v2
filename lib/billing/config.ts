import { cloudAuthConfig } from "@/lib/cloud/config";
import type { PlanTier } from "@/lib/plans";

/**
 * Optional Stripe billing. Off unless the secret, webhook secret, and at least
 * one STRIPE_PRICE_* id exist — and the cloud account (Postgres) is on, because
 * PlanTier is stored on the server, not in the browser.
 *
 * Prefer a Stripe account in Brazil with BRL settlement
 * (https://docs.stripe.com/brazil). Do not require a US entity.
 *
 * Amounts in STRIPE_PRICE_*_AMOUNT are display placeholders (recommendation,
 * not a frozen business price). Checkout always charges the Stripe Price object.
 */
export type BillingOfferId =
  | "premium_yearly"
  | "premium_monthly"
  | "horizon_yearly";

export type BillingDisabledReason = "missing_env" | "cloud_required" | "disabled";

export interface BillingOffer {
  id: BillingOfferId;
  plan: Exclude<PlanTier, "free">;
  interval: "year" | "month";
  priceId: string;
  unitAmount: number | null;
  currency: string;
}

export interface PublicBillingOffer {
  id: BillingOfferId;
  plan: Exclude<PlanTier, "free">;
  interval: "year" | "month";
  unitAmount: number | null;
  currency: string;
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
  offers: PublicBillingOffer[];
}

const OFFER_ENV: Record<
  BillingOfferId,
  { price: string; amount: string; plan: Exclude<PlanTier, "free">; interval: "year" | "month" }
> = {
  premium_yearly: {
    price: "STRIPE_PRICE_PREMIUM_YEARLY",
    amount: "STRIPE_PRICE_PREMIUM_YEARLY_AMOUNT",
    plan: "premium",
    interval: "year",
  },
  premium_monthly: {
    price: "STRIPE_PRICE_PREMIUM_MONTHLY",
    amount: "STRIPE_PRICE_PREMIUM_MONTHLY_AMOUNT",
    plan: "premium",
    interval: "month",
  },
  horizon_yearly: {
    price: "STRIPE_PRICE_HORIZON_YEARLY",
    amount: "STRIPE_PRICE_HORIZON_YEARLY_AMOUNT",
    plan: "horizon",
    interval: "year",
  },
};

function flagOff(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "0" || v === "false" || v === "off" || v === "no";
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

export function parseBillingOffers(
  env: Record<string, string | undefined>
): BillingOffer[] {
  const currency = (env.STRIPE_CURRENCY ?? "brl").trim().toLowerCase() || "brl";
  const offers: BillingOffer[] = [];
  for (const id of Object.keys(OFFER_ENV) as BillingOfferId[]) {
    const spec = OFFER_ENV[id];
    const priceId = env[spec.price]?.trim() ?? "";
    if (!isStripePriceId(priceId)) continue;
    offers.push({
      id,
      plan: spec.plan,
      interval: spec.interval,
      priceId,
      unitAmount: parseAmountCents(env[spec.amount]),
      currency,
    });
  }
  return offers;
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
    offers: cfg.enabled
      ? cfg.offers.map(({ id, plan, interval, unitAmount, currency }) => ({
          id,
          plan,
          interval,
          unitAmount,
          currency,
        }))
      : [],
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
  const offer = offers.find((item) => item.priceId === priceId);
  return offer?.plan ?? null;
}

export function isPaidPlanTier(value: unknown): value is Exclude<PlanTier, "free"> {
  return value === "premium" || value === "horizon";
}
