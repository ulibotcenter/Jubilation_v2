export type PlanTier = "free" | "premium" | "horizon" | "couple";

export const PLAN_TIERS = ["free", "premium", "horizon", "couple"] as const;

export function isPlanTier(value: unknown): value is PlanTier {
  return (
    value === "free" ||
    value === "premium" ||
    value === "horizon" ||
    value === "couple"
  );
}

export function parsePlanTier(value: unknown): PlanTier {
  if (isPlanTier(value)) return value;
  if (value === "monthly") return "premium";
  if (value === "yearly") return "horizon";
  return "free";
}

export function isPaidPlanTier(value: unknown): value is Exclude<PlanTier, "free"> {
  return value === "premium" || value === "horizon" || value === "couple";
}

function hasCompletoFeatures(plan: PlanTier): boolean {
  return plan === "horizon" || plan === "couple";
}

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

/** Display names. Stripe ids: premium Básico, horizon Completo, couple Completo+Cônjuge. */
export const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Grátis",
  premium: "Básico",
  horizon: "Completo",
  couple: "Completo+Cônjuge",
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
  couple: {
    monthly: null,
    tagline: "Completo+Cônjuge — couple modeling, no spouse B3",
  },
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
  couple: 3,
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
  return isPaidPlanTier(plan);
}

/**
 * Paid planner pages always render. Onboarding may overlay; it must not
 * replace Painel/Portfólio with an empty main.
 */
export function shouldRenderAppPage(_input?: {
  legalRoute?: boolean;
  fullPlanner?: boolean;
  onboardingCompleted?: boolean;
}): boolean {
  return true;
}

/** Ready once billing was checked, or this session already has a live paid plan. */
export function plannerGateReady(input: {
  billingChecked: boolean;
  billingLive: boolean;
  planTier: PlanTier;
}): boolean {
  return (
    input.billingChecked ||
    (input.billingLive && isPaidPlanTier(input.planTier))
  );
}

/** One saved retirement plan. Free cannot write it. */
export function canSaveFullPlan(plan: PlanTier): boolean {
  return isPaidPlanTier(plan);
}

/** Assumptions + year-by-year CSV. Completo adds the formatted report. */
export function canUseBasicExport(plan: PlanTier): boolean {
  return isPaidPlanTier(plan);
}

/**
 * B3 fixture and file import. Completo and Completo+Cônjuge. Spouse B3 is
 * never included — the couple plan is holder-typed input only.
 */
export function canUseConnectors(plan: PlanTier): boolean {
  return hasCompletoFeatures(plan);
}

/** Holdings, Monte Carlo, JSON, and the formatted PDF. Completo and above. */
export function canUseAdvancedExport(plan: PlanTier): boolean {
  return hasCompletoFeatures(plan);
}

/** Named scenario snapshots. Completo and Completo+Cônjuge. */
export function canUseMultipleScenarios(plan: PlanTier): boolean {
  return hasCompletoFeatures(plan);
}

/**
 * Couple modeling is Completo+Cônjuge only. Completo does not include it.
 * There is no spouse B3 / CNIS / Receita integration on any plan.
 */
export function canModelCouple(plan: PlanTier): boolean {
  return plan === "couple";
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
