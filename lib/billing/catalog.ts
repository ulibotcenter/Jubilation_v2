/**
 * Display recommendations for the three SKUs — not a frozen business price
 * and never what Checkout charges. Stripe Price objects (created in the
 * Dashboard, ids in STRIPE_PRICE_*) are the charge. Env
 * STRIPE_PRICE_*_AMOUNT / *_USD_AMOUNT / *_EUR_AMOUNT override these
 * placeholders on screen.
 *
 * Two products, not nine: Individual (Premium) and Couple (Horizon).
 * Free has no Stripe product. Monthly Individual is a decoy on the same SKU.
 */
export const BILLING_CURRENCIES = ["brl", "usd", "eur"] as const;

export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];

export type BillingOfferId =
  | "premium_yearly"
  | "premium_monthly"
  | "horizon_yearly";

/** Cents. Recommendation only — override with env, charge the Price id. */
export const DISPLAY_AMOUNT_CENTS: Record<
  BillingOfferId,
  Record<BillingCurrency, number>
> = {
  premium_yearly: { brl: 8900, usd: 1900, eur: 1800 },
  premium_monthly: { brl: 1490, usd: 400, eur: 390 },
  horizon_yearly: { brl: 12900, usd: 2900, eur: 2500 },
};
