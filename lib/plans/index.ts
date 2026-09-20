export type PlanTier = "free" | "premium" | "horizon";

export type FeatureId =
  | "monte_carlo_full"
  | "named_scenarios"
  | "tax_preview"
  | "ai_coach_unlimited"
  | "pdf_export"
  | "cash_flow_sankey"
  | "post_retirement"
  | "share_branded"
  | "net_worth_history"
  | "sensitivity_sliders";

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Free",
  premium: "Premium",
  horizon: "Horizon",
};

/**
 * Display copy only. Real prices live in STRIPE_PRICE_* env (Stripe Price ids
 * per currency, plus optional *_AMOUNT placeholders). Do not treat numbers
 * here as a business decision — the owner has not frozen a price.
 */
export const PLAN_PRICING: Record<
  PlanTier,
  { monthly: number | null; tagline: string }
> = {
  free: { monthly: null, tagline: "Full engine while billing is off" },
  premium: { monthly: null, tagline: "Individual — scenarios, tax preview, exports" },
  horizon: { monthly: null, tagline: "Couple add-on (Horizon)" },
};

const FEATURE_GATES: Record<FeatureId, PlanTier> = {
  monte_carlo_full: "free",
  named_scenarios: "premium",
  tax_preview: "premium",
  ai_coach_unlimited: "premium",
  pdf_export: "premium",
  cash_flow_sankey: "free",
  post_retirement: "free",
  share_branded: "horizon",
  net_worth_history: "premium",
  sensitivity_sliders: "free",
};

const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  premium: 1,
  horizon: 2,
};

/**
 * Feature gate. While billing is off (no Stripe env), every feature stays
 * available — a theatrical paywall was a lie. The gate is real only after
 * Stripe confirms a plan on the server (`billingLive`).
 */
export function canAccess(
  plan: PlanTier,
  feature: FeatureId,
  billingLive = false
): boolean {
  if (!billingLive) return true;
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_GATES[feature]];
}

export function requiredPlan(feature: FeatureId): PlanTier {
  return FEATURE_GATES[feature];
}
