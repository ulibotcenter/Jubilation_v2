/**
 * Launch promo catalog for the three paid plans. Display amounts come from
 * this file, not from Stripe and not from *_AMOUNT env. Checkout charges a
 * Stripe Price only when that Price's unit amount, currency, and interval
 * match the promo cell.
 *
 * Completo+Cônjuge is its own plan (internal id `couple`). It does not
 * include spouse B3 integration.
 */
export const BILLING_CURRENCIES = ["brl", "usd", "eur"] as const;

export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];

export type BillingInterval = "month" | "year";

export type BillingOfferId =
  | "premium_monthly"
  | "premium_yearly"
  | "horizon_monthly"
  | "horizon_yearly"
  | "couple_monthly"
  | "couple_yearly";

export const BILLING_OFFER_IDS = [
  "premium_monthly",
  "premium_yearly",
  "horizon_monthly",
  "horizon_yearly",
  "couple_monthly",
  "couple_yearly",
] as const satisfies readonly BillingOfferId[];

export type PaidPlanTier = "premium" | "horizon" | "couple";

export const BILLING_PLAN_SLUGS = ["basico", "completo", "completo-conjuge"] as const;
export type BillingPlanSlug = (typeof BILLING_PLAN_SLUGS)[number];

export interface BillingOfferMeta {
  plan: PaidPlanTier;
  slug: BillingPlanSlug;
  interval: BillingInterval;
}

export const OFFER_META: Record<BillingOfferId, BillingOfferMeta> = {
  premium_monthly: { plan: "premium", slug: "basico", interval: "month" },
  premium_yearly: { plan: "premium", slug: "basico", interval: "year" },
  horizon_monthly: { plan: "horizon", slug: "completo", interval: "month" },
  horizon_yearly: { plan: "horizon", slug: "completo", interval: "year" },
  couple_monthly: { plan: "couple", slug: "completo-conjuge", interval: "month" },
  couple_yearly: { plan: "couple", slug: "completo-conjuge", interval: "year" },
};

export function offerIdFor(
  plan: PaidPlanTier,
  interval: BillingInterval
): BillingOfferId {
  if (plan === "premium") {
    return interval === "month" ? "premium_monthly" : "premium_yearly";
  }
  if (plan === "horizon") {
    return interval === "month" ? "horizon_monthly" : "horizon_yearly";
  }
  return interval === "month" ? "couple_monthly" : "couple_yearly";
}

/** Promo (what the user pays), in cents. */
export const PROMO_AMOUNT_CENTS: Record<
  BillingOfferId,
  Record<BillingCurrency, number>
> = {
  premium_monthly: { brl: 2990, usd: 599, eur: 599 },
  premium_yearly: { brl: 39900, usd: 7900, eur: 7900 },
  horizon_monthly: { brl: 4990, usd: 999, eur: 999 },
  horizon_yearly: { brl: 59900, usd: 11900, eur: 11900 },
  couple_monthly: { brl: 5990, usd: 1199, eur: 1199 },
  couple_yearly: { brl: 69900, usd: 13900, eur: 13900 },
};

/**
 * Struck-through list prices. BRL came from the owner. USD/EUR keep the
 * same list/promo ratio, rounded to the nearest cent (or whole unit when
 * the BRL yearly list is a whole number).
 *
 * Básico 59.90/29.90 and 500/399 → USD/EUR 11.99 / 99
 * Completo 89.90/49.90 and 799/599 → USD/EUR 17.99 / 159
 * Completo+Cônjuge 99.90/59.90 and 1,200/699 → USD/EUR 19.99 / 239
 */
export const LIST_AMOUNT_CENTS: Record<
  BillingOfferId,
  Record<BillingCurrency, number>
> = {
  premium_monthly: { brl: 5990, usd: 1199, eur: 1199 },
  premium_yearly: { brl: 50000, usd: 9900, eur: 9900 },
  horizon_monthly: { brl: 8990, usd: 1799, eur: 1799 },
  horizon_yearly: { brl: 79900, usd: 15900, eur: 15900 },
  couple_monthly: { brl: 9990, usd: 1999, eur: 1999 },
  couple_yearly: { brl: 120000, usd: 23900, eur: 23900 },
};

/** @deprecated Use PROMO_AMOUNT_CENTS — display is the launch promo. */
export const DISPLAY_AMOUNT_CENTS = PROMO_AMOUNT_CENTS;

export interface BillingCatalogCell {
  offerId: BillingOfferId;
  plan: PaidPlanTier;
  slug: BillingPlanSlug;
  interval: BillingInterval;
  currency: BillingCurrency;
  promoAmount: number;
  listAmount: number;
}

export const BILLING_CATALOG_CELLS: readonly BillingCatalogCell[] =
  BILLING_OFFER_IDS.flatMap((offerId) =>
    BILLING_CURRENCIES.map((currency) => ({
      offerId,
      plan: OFFER_META[offerId].plan,
      slug: OFFER_META[offerId].slug,
      interval: OFFER_META[offerId].interval,
      currency,
      promoAmount: PROMO_AMOUNT_CENTS[offerId][currency],
      listAmount: LIST_AMOUNT_CENTS[offerId][currency],
    }))
  );

export function catalogCell(
  offerId: BillingOfferId,
  currency: BillingCurrency
): BillingCatalogCell {
  return {
    offerId,
    plan: OFFER_META[offerId].plan,
    slug: OFFER_META[offerId].slug,
    interval: OFFER_META[offerId].interval,
    currency,
    promoAmount: PROMO_AMOUNT_CENTS[offerId][currency],
    listAmount: LIST_AMOUNT_CENTS[offerId][currency],
  };
}
