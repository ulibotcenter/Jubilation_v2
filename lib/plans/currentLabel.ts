import { isPaidPlanTier, parsePlanTier, type PlanTier } from "@/lib/plans";

export type CurrentPlanDisplay = {
  plan: PlanTier;
  trialing: boolean;
};

/**
 * Display-only snapshot of the plan the app already stores.
 * Does not grant, persist, or invent a paid tier: billing off or a
 * non-live status always reads as free.
 */
export function currentPlanDisplay(
  billingLive: boolean,
  planTier: unknown,
  subscriptionStatus: unknown
): CurrentPlanDisplay {
  const plan = billingLive ? parsePlanTier(planTier) : "free";
  return {
    plan,
    trialing:
      billingLive &&
      subscriptionStatus === "trialing" &&
      isPaidPlanTier(plan),
  };
}
