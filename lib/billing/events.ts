import {
  isPaidPlanTier,
  planFromPriceId,
  type BillingOffer,
} from "@/lib/billing/config";
import {
  couponCodeFromStripeObject,
  emailFromStripeObject,
  timestampsFromStripeObject,
} from "@/lib/leads";
import type { PlanTier } from "@/lib/plans";

export type SubscriptionStatus = "active" | "canceled" | "trialing" | "none";

export interface StripeLikeEvent {
  id?: unknown;
  type?: unknown;
  data?: { object?: Record<string, unknown> };
}

export type BillingCommand =
  | { action: "ignore"; reason: string }
  | {
      action: "set_plan";
      eventId: string;
      eventType: string;
      userId: string | null;
      customerId: string | null;
      subscriptionId: string | null;
      plan: PlanTier;
      status: SubscriptionStatus;
      email: string | null;
      couponCode: string | null;
      usedCoupon: boolean;
      subscribedAt: string | null;
      renewalDate: string | null;
    };

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asStripeId(value: unknown): string | null {
  const direct = asString(value);
  if (direct) return direct;
  return asString(asRecord(value)?.id);
}

function amountTotal(object: Record<string, unknown>): number | null {
  const raw = object.amount_total;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function metadataPlan(
  metadata: Record<string, unknown> | null,
  offers: BillingOffer[]
): Exclude<PlanTier, "free"> | null {
  if (!metadata) return null;
  const fromPrice = planFromPriceId(offers, asString(metadata.priceId));
  if (fromPrice) return fromPrice;
  const fromOffer = offers.find((offer) => offer.id === asString(metadata.offerId));
  if (fromOffer) return fromOffer.plan;
  const claimed = metadata.planTier;
  if (isPaidPlanTier(claimed) && offers.some((offer) => offer.plan === claimed)) {
    return claimed;
  }
  return null;
}

function paidCheckout(object: Record<string, unknown>): boolean {
  const payment = asString(object.payment_status);
  if (payment === "paid" || payment === "no_payment_required") return true;
  return (
    amountTotal(object) === 0 && asString(object.status) === "complete"
  );
}

function trialDaysFromMetadata(
  metadata: Record<string, unknown> | null
): number {
  if (!metadata) return 0;
  const raw = metadata.trialPeriodDays;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.trunc(raw);
  if (typeof raw === "string") {
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function priceIdFromSubscription(
  object: Record<string, unknown>
): string | null {
  const items = asRecord(object.items);
  const data = Array.isArray(items?.data) ? items.data : [];
  const first = asRecord(data[0]);
  if (!first) return null;
  const price = first.price;
  if (typeof price === "string") return asString(price);
  return asString(asRecord(price)?.id);
}

function subscriptionPlan(
  object: Record<string, unknown>,
  offers: BillingOffer[]
): Exclude<PlanTier, "free"> | null {
  const metadata = asRecord(object.metadata);
  const fromItem = planFromPriceId(offers, priceIdFromSubscription(object));
  if (fromItem) return fromItem;
  return metadataPlan(metadata, offers);
}

function endedStripeStatus(status: string | null): boolean {
  return (
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete_expired"
  );
}

function leadFieldsFromObject(object: Record<string, unknown>) {
  const couponCode = couponCodeFromStripeObject(object);
  const timestamps = timestampsFromStripeObject(object);
  return {
    email: emailFromStripeObject(object),
    couponCode,
    usedCoupon: couponCode != null,
    subscribedAt: timestamps.subscribedAt,
    renewalDate: timestamps.renewalDate,
  };
}

export function commandFromStripeEvent(
  event: StripeLikeEvent,
  offers: BillingOffer[]
): BillingCommand {
  const eventId = asString(event.id);
  const eventType = asString(event.type);
  const object = asRecord(event.data?.object);
  if (!eventId || !eventType || !object) {
    return { action: "ignore", reason: "malformed_event" };
  }

  if (eventType === "checkout.session.completed") {
    if (asString(object.mode) !== "subscription") {
      return { action: "ignore", reason: "not_subscription" };
    }
    if (!paidCheckout(object)) {
      return { action: "ignore", reason: "unpaid" };
    }
    const metadata = asRecord(object.metadata);
    const plan = metadataPlan(metadata, offers);
    if (!plan) {
      return { action: "ignore", reason: "unknown_price" };
    }
    const trial = plan === "premium" && trialDaysFromMetadata(metadata) > 0;
    return {
      action: "set_plan",
      eventId,
      eventType,
      userId: asStripeId(object.client_reference_id) ?? asString(metadata?.userId),
      customerId: asStripeId(object.customer),
      subscriptionId: asStripeId(object.subscription),
      plan,
      status: trial ? "trialing" : "active",
      ...leadFieldsFromObject(object),
    };
  }

  if (
    eventType === "customer.subscription.updated" ||
    eventType === "customer.subscription.created"
  ) {
    const metadata = asRecord(object.metadata);
    const stripeStatus = asString(object.status);
    if (endedStripeStatus(stripeStatus)) {
      return {
        action: "set_plan",
        eventId,
        eventType,
        userId: asString(metadata?.userId),
        customerId: asStripeId(object.customer),
        subscriptionId: asStripeId(object.id),
        plan: "free",
        status: "canceled",
        ...leadFieldsFromObject(object),
      };
    }
    const plan = subscriptionPlan(object, offers);
    if (!plan) {
      return { action: "ignore", reason: "unknown_price" };
    }
    const status: SubscriptionStatus =
      stripeStatus === "trialing" && plan === "premium" ? "trialing" : "active";
    return {
      action: "set_plan",
      eventId,
      eventType,
      userId: asString(metadata?.userId),
      customerId: asStripeId(object.customer),
      subscriptionId: asStripeId(object.id),
      plan,
      status,
      ...leadFieldsFromObject(object),
    };
  }

  if (eventType === "customer.subscription.deleted") {
    const metadata = asRecord(object.metadata);
    return {
      action: "set_plan",
      eventId,
      eventType,
      userId: asString(metadata?.userId),
      customerId: asStripeId(object.customer),
      subscriptionId: asStripeId(object.id),
      plan: "free",
      status: "canceled",
      ...leadFieldsFromObject(object),
    };
  }

  return { action: "ignore", reason: "unhandled_type" };
}
