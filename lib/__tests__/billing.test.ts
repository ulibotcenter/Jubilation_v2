import { describe, expect, it } from "vitest";
import {
  billingConfig,
  isStripePriceId,
  planFromPriceId,
  publicBillingStatus,
} from "@/lib/billing/config";
import { commandFromStripeEvent } from "@/lib/billing/events";
import {
  stripeSignatureHeader,
  verifyStripeSignature,
} from "@/lib/billing/signature";
import { canAccess } from "@/lib/plans";
import checkoutCompleted from "./fixtures/stripe-checkout-session-completed.json";
import subscriptionDeleted from "./fixtures/stripe-subscription-deleted.json";

const LIVE_ENV = {
  DATABASE_URL: "postgres://u:p@db.eu-central-1.aws.neon.tech/jubilation",
  AUTH_SECRET: "a-very-long-auth-secret",
  STRIPE_SECRET_KEY: "sk_test_billing",
  STRIPE_WEBHOOK_SECRET: "whsec_test_fixture_secret",
  STRIPE_PRICE_PREMIUM_YEARLY: "price_premium_yearly_test",
  STRIPE_PRICE_PREMIUM_MONTHLY: "price_premium_monthly_test",
  STRIPE_PRICE_HORIZON_YEARLY: "price_horizon_yearly_test",
  STRIPE_PRICE_PREMIUM_YEARLY_AMOUNT: "8900",
  STRIPE_PRICE_PREMIUM_MONTHLY_AMOUNT: "1490",
  STRIPE_PRICE_HORIZON_YEARLY_AMOUNT: "12900",
  STRIPE_CURRENCY: "brl",
};

const OFFERS = billingConfig(LIVE_ENV).offers;

describe("billing config", () => {
  it("stays off without Stripe env so the UI must not pretend anyone paid", () => {
    expect(publicBillingStatus({})).toEqual({
      enabled: false,
      reason: "missing_env",
      settlement: "br",
      offers: [],
    });
    expect(
      publicBillingStatus({
        STRIPE_SECRET_KEY: "sk_test_only",
      }).enabled
    ).toBe(false);
  });

  it("does not treat a bare number as a Price id", () => {
    expect(isStripePriceId("8900")).toBe(false);
    expect(isStripePriceId("89")).toBe(false);
    expect(isStripePriceId("price_premium_yearly_test")).toBe(true);
  });

  it("needs cloud account as well as Stripe — PlanTier is server-side", () => {
    const status = publicBillingStatus({
      STRIPE_SECRET_KEY: "sk_test_billing",
      STRIPE_WEBHOOK_SECRET: "whsec_test_fixture_secret",
      STRIPE_PRICE_PREMIUM_YEARLY: "price_premium_yearly_test",
    });
    expect(status.enabled).toBe(false);
    expect(status.reason).toBe("cloud_required");
  });

  it("turns on when Stripe, prices, and cloud env exist", () => {
    const status = publicBillingStatus(LIVE_ENV);
    expect(status.enabled).toBe(true);
    expect(status.reason).toBeNull();
    expect(status.settlement).toBe("br");
    expect(status.offers.map((o) => o.id)).toEqual([
      "premium_yearly",
      "premium_monthly",
      "horizon_yearly",
    ]);
    expect(status.offers[0]?.unitAmount).toBe(8900);
    expect(status.offers.find((o) => o.id === "premium_monthly")?.unitAmount).toBe(
      1490
    );
    expect(status.offers.find((o) => o.id === "horizon_yearly")?.unitAmount).toBe(
      12900
    );
    expect(JSON.stringify(status)).not.toContain("sk_test");
    expect(JSON.stringify(status)).not.toContain("whsec_");
  });

  it("honors BILLING=off even with keys", () => {
    expect(publicBillingStatus({ ...LIVE_ENV, BILLING: "off" }).enabled).toBe(
      false
    );
  });
});

describe("canAccess", () => {
  it("keeps the engine open while billing is off", () => {
    expect(canAccess("free", "named_scenarios")).toBe(true);
    expect(canAccess("free", "tax_preview", false)).toBe(true);
    expect(canAccess("free", "share_branded", false)).toBe(true);
  });

  it("gates only when Stripe billing is live", () => {
    expect(canAccess("free", "named_scenarios", true)).toBe(false);
    expect(canAccess("premium", "named_scenarios", true)).toBe(true);
    expect(canAccess("premium", "share_branded", true)).toBe(false);
    expect(canAccess("horizon", "share_branded", true)).toBe(true);
    expect(canAccess("horizon", "tax_preview", true)).toBe(true);
    expect(canAccess("free", "monte_carlo_full", true)).toBe(true);
  });
});

describe("Stripe webhook signature", () => {
  const secret = LIVE_ENV.STRIPE_WEBHOOK_SECRET;
  const payload = JSON.stringify(checkoutCompleted);
  const now = 1_790_000_000;

  it("accepts a valid t + v1 header", () => {
    const header = stripeSignatureHeader(payload, secret, now);
    expect(verifyStripeSignature(payload, header, secret, now)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const header = stripeSignatureHeader(payload, secret, now);
    expect(
      verifyStripeSignature(payload.replace("paid", "unpaid"), header, secret, now)
    ).toBe(false);
  });

  it("rejects a missing header, wrong secret, and stale timestamp", () => {
    const header = stripeSignatureHeader(payload, secret, now);
    expect(verifyStripeSignature(payload, null, secret, now)).toBe(false);
    expect(verifyStripeSignature(payload, header, "whsec_other", now)).toBe(
      false
    );
    expect(
      verifyStripeSignature(payload, header, secret, now + 301)
    ).toBe(false);
  });
});

describe("Stripe webhook plan transitions", () => {
  it("maps checkout.session.completed to premium via the Price id", () => {
    expect(planFromPriceId(OFFERS, "price_premium_yearly_test")).toBe("premium");
    const command = commandFromStripeEvent(checkoutCompleted, OFFERS);
    expect(command).toMatchObject({
      action: "set_plan",
      eventId: "evt_test_checkout_completed",
      eventType: "checkout.session.completed",
      userId: "user-maria-1",
      customerId: "cus_test_maria",
      subscriptionId: "sub_test_premium",
      plan: "premium",
      status: "active",
    });
  });

  it("does not grant a plan on an unpaid checkout", () => {
    const unpaid = structuredClone(checkoutCompleted);
    unpaid.data.object.payment_status = "unpaid";
    expect(commandFromStripeEvent(unpaid, OFFERS)).toEqual({
      action: "ignore",
      reason: "unpaid",
    });
  });

  it("does not grant a plan for an unknown Price", () => {
    const unknown = structuredClone(checkoutCompleted);
    unknown.data.object.metadata.priceId = "price_not_configured";
    unknown.data.object.metadata.offerId = "nope";
    unknown.data.object.metadata.planTier = "premium";
    const command = commandFromStripeEvent(unknown, [
      {
        id: "horizon_yearly",
        plan: "horizon",
        interval: "year",
        priceId: "price_horizon_yearly_test",
        unitAmount: 12900,
        currency: "brl",
      },
    ]);
    expect(command).toEqual({ action: "ignore", reason: "unknown_price" });
  });

  it("maps customer.subscription.deleted back to free", () => {
    const command = commandFromStripeEvent(subscriptionDeleted, OFFERS);
    expect(command).toMatchObject({
      action: "set_plan",
      eventId: "evt_test_subscription_deleted",
      eventType: "customer.subscription.deleted",
      userId: "user-maria-1",
      customerId: "cus_test_maria",
      subscriptionId: "sub_test_premium",
      plan: "free",
      status: "canceled",
    });
  });

  it("maps the couple Price to horizon", () => {
    const couple = structuredClone(checkoutCompleted);
    couple.data.object.metadata.priceId = "price_horizon_yearly_test";
    couple.data.object.metadata.offerId = "horizon_yearly";
    couple.data.object.metadata.planTier = "horizon";
    const command = commandFromStripeEvent(couple, OFFERS);
    expect(command).toMatchObject({ action: "set_plan", plan: "horizon" });
  });
});
