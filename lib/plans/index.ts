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

/** Display names. Stripe ids stay premium (Básico) and horizon (Completo). */
export const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Grátis",
  premium: "Básico",
  horizon: "Completo",
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
  free: { monthly: null, tagline: "Public calculator only" },
  premium: { monthly: null, tagline: "Básico — manual plan, 5 bolsa/Tesouro holdings" },
  horizon: { monthly: null, tagline: "Completo — connectors, scenarios, PDF" },
};

const FEATURE_GATES: Record<FeatureId, PlanTier> = {
  monte_carlo_full: "free",
  named_scenarios: "horizon",
  tax_preview: "premium",
  ai_coach_unlimited: "premium",
  pdf_export: "horizon",
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

/** The projection engine is unchanged. Who may open the planner is canUseFullPlanner. */
export function manualPlanningOpen(): boolean {
  return true;
}

/**
 * Full manual planner: chart, three origin blocks, manual fields.
 * Free is the public calculator. Missing Stripe env leaves the tier free.
 */
export function canUseFullPlanner(plan: PlanTier): boolean {
  return plan === "premium" || plan === "horizon";
}

/** One saved retirement plan. Free cannot write it. */
export function canSaveFullPlan(plan: PlanTier): boolean {
  return plan === "premium" || plan === "horizon";
}

/** Assumptions + year-by-year CSV. Completo adds the formatted report. */
export function canUseBasicExport(plan: PlanTier): boolean {
  return plan === "premium" || plan === "horizon";
}

/**
 * B3 fixture and file import. Completo only. A missing Stripe env leaves
 * the tier at free, so the section stays closed. No click grants this.
 */
export function canUseConnectors(plan: PlanTier): boolean {
  return plan === "horizon";
}

/** Holdings, Monte Carlo, JSON, and the formatted PDF. Completo only. */
export function canUseAdvancedExport(plan: PlanTier): boolean {
  return plan === "horizon";
}

/** Named scenario snapshots. Completo only — not a third Stripe product. */
export function canUseMultipleScenarios(plan: PlanTier): boolean {
  return plan === "horizon";
}

/** Couple modeling is a Completo feature, not its own price. */
export function canModelCouple(plan: PlanTier): boolean {
  return plan === "horizon";
}

/**
 * `?checkout=success` is a return URL, not a payment. The webhook is the
 * only writer of PlanTier, so the browser return leaves the tier as it was.
 */
export function planTierAfterBrowserReturn(
  plan: PlanTier,
  checkout: string | null
): PlanTier {
  if (checkout === "success" || checkout === "cancel" || checkout == null) {
    return plan;
  }
  return plan;
}
