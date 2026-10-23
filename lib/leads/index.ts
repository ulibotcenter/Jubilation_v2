import { isPlanTier, parsePlanTier, type PlanTier } from "@/lib/plans";

type BillingSubscriptionStatus = "active" | "canceled" | "trialing" | "none";

export type LeadPlan = "free" | "basico" | "completo" | "completo_conjuge";
export type LeadStatus = "free" | "trial" | "active" | "canceled";
export type LeadSource = "organic" | "coupon_amigo" | "landing";

export const LEAD_PLANS = [
  "free",
  "basico",
  "completo",
  "completo_conjuge",
] as const;

export const LEAD_STATUSES = ["free", "trial", "active", "canceled"] as const;
export const LEAD_SOURCES = ["organic", "coupon_amigo", "landing"] as const;

export interface LeadRecord {
  id: string;
  email: string;
  userId: string | null;
  usedCoupon: boolean;
  couponCode: string | null;
  plan: LeadPlan;
  status: LeadStatus;
  subscribedAt: string | null;
  renewalDate: string | null;
  source: LeadSource;
  country: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignupLeadWrite {
  email: string;
  userId?: string | null;
  country?: string | null;
  now?: string;
}

export interface BillingLeadWrite {
  email: string;
  userId?: string | null;
  plan: LeadPlan;
  status: LeadStatus;
  usedCoupon: boolean;
  couponCode?: string | null;
  subscribedAt?: string | null;
  renewalDate?: string | null;
  stripeCustomerId?: string | null;
  country?: string | null;
  now?: string;
}

export function isLeadPlan(value: unknown): value is LeadPlan {
  return (
    value === "free" ||
    value === "basico" ||
    value === "completo" ||
    value === "completo_conjuge"
  );
}

export function leadPlanFromTier(plan: PlanTier): LeadPlan {
  if (plan === "premium") return "basico";
  if (plan === "horizon") return "completo";
  if (plan === "couple") return "completo_conjuge";
  return "free";
}

/** Map stored PlanTier slugs and the public plan names onto lead.plan. */
export function parseLeadPlan(value: unknown): LeadPlan {
  if (isLeadPlan(value)) return value;
  if (isPlanTier(value)) return leadPlanFromTier(value);
  if (value === "monthly") return "basico";
  if (value === "yearly") return "completo";
  return leadPlanFromTier(parsePlanTier(value));
}

export function leadStatusFromSubscription(
  status: BillingSubscriptionStatus
): LeadStatus {
  if (status === "trialing") return "trial";
  if (status === "active") return "active";
  if (status === "canceled") return "canceled";
  return "free";
}

export function parseLeadStatus(value: unknown): LeadStatus {
  if (
    value === "free" ||
    value === "trial" ||
    value === "active" ||
    value === "canceled"
  ) {
    return value;
  }
  if (
    value === "active" ||
    value === "canceled" ||
    value === "trialing" ||
    value === "none"
  ) {
    return leadStatusFromSubscription(value);
  }
  return "free";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function couponNameFromUnknown(value: unknown): string | null {
  if (typeof value === "string") return asString(value);
  const coupon = asRecord(value);
  if (!coupon) return null;
  return (
    asString(coupon.code) ??
    asString(coupon.name) ??
    asString(coupon.id) ??
    asString(coupon.promotion_code)
  );
}

function collectCouponCodes(object: Record<string, unknown>): string[] {
  const codes: string[] = [];
  const push = (value: unknown) => {
    const code = couponNameFromUnknown(value);
    if (code) codes.push(code);
  };

  push(object.coupon);
  const discount = asRecord(object.discount);
  if (discount) {
    push(discount.coupon);
    push(discount.promotion_code);
    push(asRecord(discount.promotion_code)?.code);
  }

  const discounts = Array.isArray(object.discounts) ? object.discounts : [];
  for (const item of discounts) {
    if (typeof item === "string") {
      push(item);
      continue;
    }
    const row = asRecord(item);
    if (!row) continue;
    push(row.coupon);
    push(row.promotion_code);
    push(asRecord(row.promotion_code)?.code);
    const nested = asRecord(row.discount);
    if (nested) {
      push(nested.coupon);
      push(nested.promotion_code);
      push(asRecord(nested.promotion_code)?.code);
    }
  }

  const total = asRecord(object.total_details);
  const breakdown = asRecord(total?.breakdown);
  const breakdownDiscounts = Array.isArray(breakdown?.discounts)
    ? breakdown.discounts
    : [];
  for (const item of breakdownDiscounts) {
    const row = asRecord(item);
    const nested = asRecord(row?.discount);
    if (nested) {
      push(nested.coupon);
      push(nested.promotion_code);
      push(asRecord(nested.promotion_code)?.code);
    }
  }

  const metadata = asRecord(object.metadata);
  if (metadata) {
    push(metadata.coupon);
    push(metadata.couponCode);
    push(metadata.coupon_code);
    push(metadata.promotionCode);
    push(metadata.promotion_code);
  }

  return codes;
}

/** Any coupon on the session/subscription counts, including AMIGO100. */
export function couponCodeFromStripeObject(
  object: Record<string, unknown>
): string | null {
  const codes = collectCouponCodes(object);
  if (codes.length === 0) return null;
  const amigo = codes.find((code) => code.toUpperCase() === "AMIGO100");
  return amigo ?? codes[0] ?? null;
}

export function emailFromStripeObject(
  object: Record<string, unknown>
): string | null {
  const details = asRecord(object.customer_details);
  const metadata = asRecord(object.metadata);
  return (
    asString(object.customer_email) ??
    asString(details?.email) ??
    asString(metadata?.email) ??
    asString(object.email)
  );
}

export function unixToIso(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return unixToIso(Number(value.trim()));
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

export function timestampsFromStripeObject(object: Record<string, unknown>): {
  subscribedAt: string | null;
  renewalDate: string | null;
} {
  return {
    subscribedAt:
      unixToIso(object.start_date) ??
      unixToIso(object.current_period_start) ??
      unixToIso(object.created),
    renewalDate:
      unixToIso(object.current_period_end) ?? unixToIso(object.trial_end),
  };
}

function newLeadId(now: string): LeadRecord {
  return {
    id: globalThis.crypto.randomUUID(),
    email: "",
    userId: null,
    usedCoupon: false,
    couponCode: null,
    plan: "free",
    status: "free",
    subscribedAt: null,
    renewalDate: null,
    source: "organic",
    country: null,
    stripeCustomerId: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Signup upsert: fill identity only. Never reset a paid plan. */
export function mergeSignupLead(
  existing: LeadRecord | null,
  input: SignupLeadWrite
): LeadRecord {
  const now = input.now ?? new Date().toISOString();
  if (!existing) {
    return {
      ...newLeadId(now),
      email: input.email,
      userId: input.userId ?? null,
      plan: "free",
      status: "free",
      source: "organic",
      country: input.country ?? null,
    };
  }
  return {
    ...existing,
    userId: existing.userId ?? input.userId ?? null,
    country: input.country ?? existing.country,
    updatedAt: now,
  };
}

/** Stripe upsert: plan/status/dates/customer; coupon flips source to coupon_amigo. */
export function mergeBillingLead(
  existing: LeadRecord | null,
  input: BillingLeadWrite
): LeadRecord {
  const now = input.now ?? new Date().toISOString();
  const usedCoupon = Boolean(existing?.usedCoupon || input.usedCoupon);
  const couponCode = input.couponCode ?? existing?.couponCode ?? null;
  const source: LeadSource = input.usedCoupon
    ? "coupon_amigo"
    : (existing?.source ?? "organic");
  if (!existing) {
    return {
      ...newLeadId(now),
      email: input.email,
      userId: input.userId ?? null,
      usedCoupon,
      couponCode,
      plan: input.plan,
      status: input.status,
      subscribedAt: input.subscribedAt ?? null,
      renewalDate: input.renewalDate ?? null,
      source,
      country: input.country ?? null,
      stripeCustomerId: input.stripeCustomerId ?? null,
    };
  }
  return {
    ...existing,
    userId: existing.userId ?? input.userId ?? null,
    usedCoupon,
    couponCode,
    plan: input.plan,
    status: input.status,
    subscribedAt: existing.subscribedAt ?? input.subscribedAt ?? null,
    renewalDate: input.renewalDate ?? existing.renewalDate,
    source,
    country: existing.country ?? input.country ?? null,
    stripeCustomerId: input.stripeCustomerId ?? existing.stripeCustomerId,
    updatedAt: now,
  };
}
