import type { PaidPlanTier } from "@/lib/billing/catalog";
import { isPaidPlanTier, type PlanTier } from "@/lib/plans";

/** Básico Checkout only. Completo and Completo+Cônjuge have no trial. */
export const BASICO_TRIAL_DAYS = 7;

export function shouldOfferBasicoTrial(
  plan: PlanTier | null | undefined
): boolean {
  return !isPaidPlanTier(plan);
}

/**
 * Days to send as `subscription_data.trial_period_days`. Null means the
 * Checkout Session must not include a trial.
 */
export function basicoTrialDaysForCheckout(
  offerPlan: PaidPlanTier,
  currentPlan: PlanTier | null | undefined
): number | null {
  if (offerPlan !== "premium") return null;
  if (!shouldOfferBasicoTrial(currentPlan)) return null;
  return BASICO_TRIAL_DAYS;
}
