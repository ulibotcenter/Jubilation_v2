import { describe, expect, it } from "vitest";
import { DISPLAY_AMOUNT_CENTS } from "@/lib/billing/catalog";
import {
  billingConfig,
  displayAmountCents,
  isStripePriceId,
  parseBillingCurrency,
  planFromPriceId,
  publicBillingStatus,
  resolveCheckoutPrice,
} from "@/lib/billing/config";
import { formatPlanAmount } from "@/lib/billing/display";
import { commandFromStripeEvent } from "@/lib/billing/events";
import {
  stripeSignatureHeader,
  verifyStripeSignature,
} from "@/lib/billing/signature";
import { canAccess } from "@/lib/plans";
import checkoutCompleted from "./fixtures/stripe-checkout-session-completed.json";
import subscriptionDeleted from "./fixtures/stripe-subscription-deleted.json";

const BRL_ONLY_ENV = {
  DATABASE_URL: "postgres://u:p@db.eu-central-1.aws.neon.tech/jubilation",
  AUTH_SECRET: "a-very-long-auth-secret",
  STRIPE_SECRET_KEY: "sk_test_billing",
  STRIPE_WEBHOOK_SECRET: "whsec_test_fixture_secret",
  STRIPE_PRICE_PREMIUM_YEARLY: "price_premium_yearly_brl",
  STRIPE_PRICE_PREMIUM_MONTHLY: "price_premium_monthly_brl",
  STRIPE_PRICE_HORIZON_YEARLY: "price_horizon_yearly_brl",
  STRIPE_PRICE_PREMIUM_YEARLY_AMOUNT: "8900",
  STRIPE_PRICE_PREMIUM_MONTHLY_AMOUNT: "1490",
  STRIPE_PRICE_HORIZON_YEARLY_AMOUNT: "12900",
  STRIPE_CURRENCY: "brl",
};

const LIVE_ENV = {
  ...BRL_ONLY_ENV,
  STRIPE_PRICE_PREMIUM_YEARLY_USD: "price_premium_yearly_usd",
  STRIPE_PRICE_PREMIUM_MONTHLY_USD: "price_premium_monthly_usd",
  STRIPE_PRICE_HORIZON_YEARLY_USD: "price_horizon_yearly_usd",
  STRIPE_PRICE_PREMIUM_YEARLY_EUR: "price_premium_yearly_eur",
  STRIPE_PRICE_PREMIUM_MONTHLY_EUR: "price_premium_monthly_eur",
  STRIPE_PRICE_HORIZON_YEARLY_EUR: "price_horizon_yearly_eur",
  STRIPE_PRICE_PREMIUM_YEARLY_USD_AMOUNT: "1900",
  STRIPE_PRICE_PREMIUM_MONTHLY_USD_AMOUNT: "400",
  STRIPE_PRICE_HORIZON_YEARLY_USD_AMOUNT: "2900",
  STRIPE_PRICE_PREMIUM_YEARLY_EUR_AMOUNT: "1800",
  STRIPE_PRICE_PREMIUM_MONTHLY_EUR_AMOUNT: "390",
  STRIPE_PRICE_HORIZON_YEARLY_EUR_AMOUNT: "2500",
};

const OFFERS = billingConfig(LIVE_ENV).offers;

describe("billing config", () => {
  it("stays off without Stripe env so the UI must not pretend anyone paid", () => {
    const status = publicBillingStatus({});
    expect(status.enabled).toBe(false);
    expect(status.reason).toBe("missing_env");
    expect(status.settlement).toBe("br");
    expect(status.offers.every((offer) =>
      offer.amounts.every((amount) => amount.checkoutReady === false)
    )).toBe(true);
    expect(
      publicBillingStatus({
        STRIPE_SECRET_KEY: "sk_test_only",
      }).enabled
    ).toBe(false);
  });

  it("does not treat a bare number as a Price id", () => {
    expect(isStripePriceId("8900")).toBe(false);
    expect(isStripePriceId("89")).toBe(false);
    expect(isStripePriceId("1900")).toBe(false);
    expect(isStripePriceId("price_premium_yearly_brl")).toBe(true);
  });

  it("needs cloud account as well as Stripe — PlanTier is server-side", () => {
    const status = publicBillingStatus({
      STRIPE_SECRET_KEY: "sk_test_billing",
      STRIPE_WEBHOOK_SECRET: "whsec_test_fixture_secret",
      STRIPE_PRICE_PREMIUM_YEARLY: "price_premium_yearly_brl",
    });
    expect(status.enabled).toBe(false);
    expect(status.reason).toBe("cloud_required");
  });

  it("turns on when Stripe, prices, and cloud env exist", () => {
    const status = publicBillingStatus(LIVE_ENV);
    expect(status.enabled).toBe(true);
    expect(status.reason).toBeNull();
    expect(status.settlement).toBe("br");
    expect(status.currencies).toEqual(["brl", "usd", "eur"]);
    expect(status.offers.map((o) => o.id)).toEqual([
      "premium_yearly",
      "premium_monthly",
      "horizon_yearly",
    ]);
    expect(
      status.offers
        .find((o) => o.id === "premium_yearly")
        ?.amounts.find((a) => a.currency === "brl")?.unitAmount
    ).toBe(8900);
    expect(
      status.offers
        .find((o) => o.id === "premium_monthly")
        ?.amounts.find((a) => a.currency === "brl")?.unitAmount
    ).toBe(1490);
    expect(
      status.offers
        .find((o) => o.id === "horizon_yearly")
        ?.amounts.find((a) => a.currency === "eur")?.unitAmount
    ).toBe(2500);
    expect(JSON.stringify(status)).not.toContain("sk_test");
    expect(JSON.stringify(status)).not.toContain("whsec_");
    expect(JSON.stringify(status)).not.toContain("price_");
  });

  it("honors BILLING=off even with keys", () => {
    expect(publicBillingStatus({ ...LIVE_ENV, BILLING: "off" }).enabled).toBe(
      false
    );
  });

  it("still shows display amounts when billing is off", () => {
    const status = publicBillingStatus({});
    expect(status.enabled).toBe(false);
    const yearly = status.offers.find((o) => o.id === "premium_yearly");
    expect(yearly?.amounts.find((a) => a.currency === "usd")?.unitAmount).toBe(
      DISPLAY_AMOUNT_CENTS.premium_yearly.usd
    );
    expect(yearly?.amounts.find((a) => a.currency === "eur")?.unitAmount).toBe(
      DISPLAY_AMOUNT_CENTS.premium_yearly.eur
    );
  });
});

describe("currency → Price id", () => {
  it("maps BRL / USD / EUR to the matching Price id on the same SKU", () => {
    expect(
      resolveCheckoutPrice(OFFERS, "premium_yearly", "brl")?.priceId
    ).toBe("price_premium_yearly_brl");
    expect(
      resolveCheckoutPrice(OFFERS, "premium_yearly", "usd")?.priceId
    ).toBe("price_premium_yearly_usd");
    expect(
      resolveCheckoutPrice(OFFERS, "premium_yearly", "eur")?.priceId
    ).toBe("price_premium_yearly_eur");
    expect(
      resolveCheckoutPrice(OFFERS, "premium_monthly", "usd")?.priceId
    ).toBe("price_premium_monthly_usd");
    expect(
      resolveCheckoutPrice(OFFERS, "horizon_yearly", "eur")?.priceId
    ).toBe("price_horizon_yearly_eur");
    expect(resolveCheckoutPrice(OFFERS, "premium_yearly", "usd")?.plan).toBe(
      "premium"
    );
    expect(resolveCheckoutPrice(OFFERS, "horizon_yearly", "eur")?.plan).toBe(
      "horizon"
    );
  });

  it("keeps existing unsuffixed BRL ids working when USD/EUR are absent", () => {
    const offers = billingConfig(BRL_ONLY_ENV).offers;
    expect(resolveCheckoutPrice(offers, "premium_yearly", "brl")?.priceId).toBe(
      "price_premium_yearly_brl"
    );
    expect(resolveCheckoutPrice(offers, "premium_monthly", "brl")?.priceId).toBe(
      "price_premium_monthly_brl"
    );
    expect(resolveCheckoutPrice(offers, "horizon_yearly", "brl")?.priceId).toBe(
      "price_horizon_yearly_brl"
    );
    expect(resolveCheckoutPrice(offers, "premium_yearly", "usd")).toBeNull();
    expect(resolveCheckoutPrice(offers, "horizon_yearly", "eur")).toBeNull();
    const status = publicBillingStatus(BRL_ONLY_ENV);
    expect(status.enabled).toBe(true);
    expect(
      status.offers
        .find((o) => o.id === "premium_yearly")
        ?.amounts.find((a) => a.currency === "brl")?.checkoutReady
    ).toBe(true);
    expect(
      status.offers
        .find((o) => o.id === "premium_yearly")
        ?.amounts.find((a) => a.currency === "usd")?.checkoutReady
    ).toBe(false);
  });

  it("accepts the display currency from the gate (BRL/USD/EUR)", () => {
    expect(parseBillingCurrency("BRL")).toBe("brl");
    expect(parseBillingCurrency("usd")).toBe("usd");
    expect(parseBillingCurrency("Eur")).toBe("eur");
    expect(parseBillingCurrency("gbp")).toBeNull();
    expect(parseBillingCurrency(89)).toBeNull();
  });

  it("lets env override display cents without becoming a Price id", () => {
    expect(
      displayAmountCents(
        { STRIPE_PRICE_PREMIUM_YEARLY_USD_AMOUNT: "2100" },
        "premium_yearly",
        "usd"
      )
    ).toBe(2100);
    expect(isStripePriceId("2100")).toBe(false);
  });
});

describe("formatPlanAmount", () => {
  it("keeps the decoy cents and whole yearly amounts", () => {
    expect(formatPlanAmount(8900, "brl", "pt-BR")).toMatch(/89/);
    expect(formatPlanAmount(1490, "brl", "pt-BR")).toMatch(/14[,.]90/);
    expect(formatPlanAmount(1900, "usd", "en-US")).toMatch(/19/);
    expect(formatPlanAmount(390, "eur", "pt-BR")).toMatch(/3[,.]90/);
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
    expect(planFromPriceId(OFFERS, "price_premium_yearly_brl")).toBe("premium");
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

  it("maps a USD Price id to the same Individual SKU", () => {
    expect(planFromPriceId(OFFERS, "price_premium_yearly_usd")).toBe("premium");
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
        prices: [
          {
            currency: "brl",
            priceId: "price_horizon_yearly_brl",
            unitAmount: 12900,
          },
        ],
      },
    ]);
    expect(command).toEqual({ action: "ignore", reason: "unknown_price" });
  });

  it("does not grant a plan without a webhook event", () => {
    expect(commandFromStripeEvent({}, OFFERS)).toEqual({
      action: "ignore",
      reason: "malformed_event",
    });
    expect(canAccess("free", "named_scenarios", false)).toBe(true);
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

  it("maps the couple Price to horizon in every currency", () => {
    const couple = structuredClone(checkoutCompleted);
    couple.data.object.metadata.priceId = "price_horizon_yearly_eur";
    couple.data.object.metadata.offerId = "horizon_yearly";
    couple.data.object.metadata.planTier = "horizon";
    const command = commandFromStripeEvent(couple, OFFERS);
    expect(command).toMatchObject({ action: "set_plan", plan: "horizon" });
    expect(planFromPriceId(OFFERS, "price_horizon_yearly_usd")).toBe("horizon");
  });
});
