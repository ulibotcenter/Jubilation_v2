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

export const PLAN_PRICING: Record<
  PlanTier,
  { monthly: number; tagline: string }
> = {
  free: { monthly: 0, tagline: "Track, project, sandbox basics" },
  premium: {
    monthly: 12,
    tagline: "Monte Carlo, tax preview, AI coach, exports",
  },
  horizon: {
    monthly: 29,
    tagline: "Everything + branded share, scenarios, priority features",
  },
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

const TIER_RANK: Record<PlanTier, number> = {
  free: 0,
  premium: 1,
  horizon: 2,
};

export function canAccess(plan: PlanTier, feature: FeatureId): boolean {
  return TIER_RANK[plan] >= TIER_RANK[FEATURE_GATES[feature]];
}

export function requiredPlan(feature: FeatureId): PlanTier {
  return FEATURE_GATES[feature];
}