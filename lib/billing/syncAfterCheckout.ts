import { isPaidPlanTier, type PlanTier } from "@/lib/plans";

export const CHECKOUT_SUCCESS_POLL_ATTEMPTS = 45;
export const CHECKOUT_SUCCESS_POLL_MS = 2000;
export const DEFAULT_BILLING_POLL_ATTEMPTS = 4;

/** After Stripe redirects back, the webhook may still be writing the plan. */
export function billingPollAttempts(checkout: string | null): number {
  return checkout === "success"
    ? CHECKOUT_SUCCESS_POLL_ATTEMPTS
    : DEFAULT_BILLING_POLL_ATTEMPTS;
}

export function shouldKeepPollingBilling(input: {
  live: boolean;
  planTier: PlanTier;
  attempt: number;
  maxAttempts: number;
}): boolean {
  if (!input.live) return false;
  if (isPaidPlanTier(input.planTier)) return false;
  return input.attempt + 1 < input.maxAttempts;
}
