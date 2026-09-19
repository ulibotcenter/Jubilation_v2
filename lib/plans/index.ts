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

/** Pricing is unpublished until billing exists. Do not show these in the UI. */
export const PLAN_PRICING: Record<
  PlanTier,
  { monthly: number | null; tagline: string }
> = {
  free: { monthly: null, tagline: "Full engine while billing is off" },
  premium: { monthly: null, tagline: "Not for sale yet" },
  horizon: { monthly: null, tagline: "Not for sale yet" },
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

/**
 * Billing is not live. Hiding features behind a theatrical paywall was a
 * lie — every feature is available until a real server-side plan exists.
 */
export function canAccess(_plan: PlanTier, _feature: FeatureId): boolean {
  void _plan;
  void _feature;
  return true;
}

export function requiredPlan(feature: FeatureId): PlanTier {
  return FEATURE_GATES[feature];
}