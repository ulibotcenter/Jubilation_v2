import {
  isPaidPlanTier,
  planFromPriceId,
  type BillingOffer,
} from "@/lib/billing/config";
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
  return payment === "paid" || payment === "no_payment_required";
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
    return {
      action: "set_plan",
      eventId,
      eventType,
      userId: asString(object.client_reference_id) ?? asString(metadata?.userId),
      customerId: asString(object.customer),
      subscriptionId: asString(object.subscription),
      plan,
      status: "active",
    };
  }

  if (eventType === "customer.subscription.deleted") {
    const metadata = asRecord(object.metadata);
    return {
      action: "set_plan",
      eventId,
      eventType,
      userId: asString(metadata?.userId),
      customerId: asString(object.customer),
      subscriptionId: asString(object.id),
      plan: "free",
      status: "canceled",
    };
  }

  return { action: "ignore", reason: "unhandled_type" };
}
