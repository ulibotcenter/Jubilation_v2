import { describe, expect, it } from "vitest";
import {
  BILLING_CATALOG_CELLS,
  LIST_AMOUNT_CENTS,
  PROMO_AMOUNT_CENTS,
} from "@/lib/billing/catalog";
import {
  billingConfig,
  candidatePriceIdsForCell,
  isStripePriceId,
  parseBillingCurrency,
  planFromPriceId,
  priceEnvKeysForCell,
  publicBillingStatus,
  resolveCheckoutPrice,
  resolveMatchedCheckoutPrice,
} from "@/lib/billing/config";
import { createStripeCheckoutSession } from "@/lib/billing/checkout";
import { formatPlanAmount } from "@/lib/billing/display";
import {
  currencyFromCountry,
  currencyFromRequestHeaders,
} from "@/lib/billing/geo";
import { commandFromStripeEvent } from "@/lib/billing/events";
import {
  retrieveFromSnapshots,
  type StripePriceSnapshot,
} from "@/lib/billing/stripePrice";
import {
  stripeSignatureHeader,
  verifyStripeSignature,
} from "@/lib/billing/signature";
import { canAccess, canModelCouple } from "@/lib/plans";
import checkoutCompleted from "./fixtures/stripe-checkout-session-completed.json";
import subscriptionDeleted from "./fixtures/stripe-subscription-deleted.json";

const SECRET_ENV = {
  STRIPE_SECRET_KEY: "sk_test_billing",
  STRIPE_WEBHOOK_SECRET: "whsec_test_fixture_secret",
};

function snap(
  id: string,
  unitAmount: number,
  currency: "brl" | "usd" | "eur",
  interval: "month" | "year"
): StripePriceSnapshot {
  return {
    id,
    unitAmount,
    currency,
    interval,
    intervalCount: 1,
    active: true,
  };
}

const MATCHING_ENV = {
  ...SECRET_ENV,
  STRIPE_PRICE_PREMIUM_MONTHLY: "price_premium_monthly_brl",
  STRIPE_PRICE_PREMIUM_YEARLY: "price_premium_yearly_brl",
  STRIPE_PRICE_HORIZON_MONTHLY: "price_horizon_monthly_brl",
  STRIPE_PRICE_HORIZON_YEARLY: "price_horizon_yearly_brl",
  STRIPE_PRICE_COMPLETO_CONJUGE_MONTHLY: "price_couple_monthly_brl",
  STRIPE_PRICE_COMPLETO_CONJUGE_YEARLY: "price_couple_yearly_brl",
  STRIPE_PRICE_PREMIUM_MONTHLY_USD: "price_premium_monthly_usd",
  STRIPE_PRICE_PREMIUM_YEARLY_USD: "price_premium_yearly_usd",
  STRIPE_PRICE_HORIZON_MONTHLY_USD: "price_horizon_monthly_usd",
  STRIPE_PRICE_HORIZON_YEARLY_USD: "price_horizon_yearly_usd",
  STRIPE_PRICE_COMPLETO_CONJUGE_MONTHLY_USD: "price_couple_monthly_usd",
  STRIPE_PRICE_COMPLETO_CONJUGE_YEARLY_USD: "price_couple_yearly_usd",
  STRIPE_PRICE_PREMIUM_MONTHLY_EUR: "price_premium_monthly_eur",
  STRIPE_PRICE_PREMIUM_YEARLY_EUR: "price_premium_yearly_eur",
  STRIPE_PRICE_HORIZON_MONTHLY_EUR: "price_horizon_monthly_eur",
  STRIPE_PRICE_HORIZON_YEARLY_EUR: "price_horizon_yearly_eur",
  STRIPE_PRICE_COMPLETO_CONJUGE_MONTHLY_EUR: "price_couple_monthly_eur",
  STRIPE_PRICE_COMPLETO_CONJUGE_YEARLY_EUR: "price_couple_yearly_eur",
};

const MATCHING_SNAPSHOTS: Record<string, StripePriceSnapshot> = {
  price_premium_monthly_brl: snap("price_premium_monthly_brl", 2990, "brl", "month"),
  price_premium_yearly_brl: snap("price_premium_yearly_brl", 39900, "brl", "year"),
  price_horizon_monthly_brl: snap("price_horizon_monthly_brl", 4990, "brl", "month"),
  price_horizon_yearly_brl: snap("price_horizon_yearly_brl", 59900, "brl", "year"),
  price_couple_monthly_brl: snap("price_couple_monthly_brl", 5990, "brl", "month"),
  price_couple_yearly_brl: snap("price_couple_yearly_brl", 69900, "brl", "year"),
  price_premium_monthly_usd: snap("price_premium_monthly_usd", 599, "usd", "month"),
  price_premium_yearly_usd: snap("price_premium_yearly_usd", 7900, "usd", "year"),
  price_horizon_monthly_usd: snap("price_horizon_monthly_usd", 999, "usd", "month"),
  price_horizon_yearly_usd: snap("price_horizon_yearly_usd", 11900, "usd", "year"),
  price_couple_monthly_usd: snap("price_couple_monthly_usd", 1199, "usd", "month"),
  price_couple_yearly_usd: snap("price_couple_yearly_usd", 13900, "usd", "year"),
  price_premium_monthly_eur: snap("price_premium_monthly_eur", 599, "eur", "month"),
  price_premium_yearly_eur: snap("price_premium_yearly_eur", 7900, "eur", "year"),
  price_horizon_monthly_eur: snap("price_horizon_monthly_eur", 999, "eur", "month"),
  price_horizon_yearly_eur: snap("price_horizon_yearly_eur", 11900, "eur", "year"),
  price_couple_monthly_eur: snap("price_couple_monthly_eur", 1199, "eur", "month"),
  price_couple_yearly_eur: snap("price_couple_yearly_eur", 13900, "eur", "year"),
};

const matchingRetrieve = retrieveFromSnapshots(MATCHING_SNAPSHOTS);

const OFFERS = billingConfig(MATCHING_ENV).offers;

describe("promo catalog", () => {
  it("has 18 cells with launch promo and struck-through list prices", () => {
    expect(BILLING_CATALOG_CELLS).toHaveLength(18);
    expect(PROMO_AMOUNT_CENTS.premium_monthly).toEqual({
      brl: 2990,
      usd: 599,
      eur: 599,
    });
    expect(PROMO_AMOUNT_CENTS.premium_yearly).toEqual({
      brl: 39900,
      usd: 7900,
      eur: 7900,
    });
    expect(PROMO_AMOUNT_CENTS.horizon_monthly).toEqual({
      brl: 4990,
      usd: 999,
      eur: 999,
    });
    expect(PROMO_AMOUNT_CENTS.horizon_yearly).toEqual({
      brl: 59900,
      usd: 11900,
      eur: 11900,
    });
    expect(PROMO_AMOUNT_CENTS.couple_monthly).toEqual({
      brl: 5990,
      usd: 1199,
      eur: 1199,
    });
    expect(PROMO_AMOUNT_CENTS.couple_yearly).toEqual({
      brl: 69900,
      usd: 13900,
      eur: 13900,
    });
    expect(LIST_AMOUNT_CENTS.premium_monthly.brl).toBe(5990);
    expect(LIST_AMOUNT_CENTS.premium_yearly.brl).toBe(50000);
    expect(LIST_AMOUNT_CENTS.horizon_monthly.brl).toBe(8990);
    expect(LIST_AMOUNT_CENTS.horizon_yearly.brl).toBe(79900);
    expect(LIST_AMOUNT_CENTS.couple_monthly.brl).toBe(9990);
    expect(LIST_AMOUNT_CENTS.couple_yearly.brl).toBe(120000);
    expect(LIST_AMOUNT_CENTS.premium_monthly.usd).toBe(1199);
    expect(LIST_AMOUNT_CENTS.premium_yearly.eur).toBe(9900);
    expect(LIST_AMOUNT_CENTS.horizon_monthly.eur).toBe(1799);
    expect(LIST_AMOUNT_CENTS.horizon_yearly.usd).toBe(15900);
    expect(LIST_AMOUNT_CENTS.couple_monthly.usd).toBe(1999);
    expect(LIST_AMOUNT_CENTS.couple_yearly.eur).toBe(23900);
  });

  it("shows catalog amounts even when billing is off", async () => {
    const status = await publicBillingStatus({});
    expect(status.enabled).toBe(false);
    expect(status.reason).toBe("missing_env");
    expect(status.offers).toHaveLength(6);
    expect(
      status.offers.every((offer) =>
        offer.amounts.every((amount) => amount.checkoutReady === false)
      )
    ).toBe(true);
    expect(
      status.offers
        .find((offer) => offer.id === "premium_monthly")
        ?.amounts.find((amount) => amount.currency === "brl")
    ).toMatchObject({ unitAmount: 2990, listAmount: 5990 });
  });
});

describe("geo currency default", () => {
  it("maps Brazil to BRL, eurozone to EUR, everyone else to USD", () => {
    expect(currencyFromCountry("BR")).toBe("brl");
    expect(currencyFromCountry("br")).toBe("brl");
    expect(currencyFromCountry("DE")).toBe("eur");
    expect(currencyFromCountry("PT")).toBe("eur");
    expect(currencyFromCountry("FR")).toBe("eur");
    expect(currencyFromCountry("HR")).toBe("eur");
    expect(currencyFromCountry("US")).toBe("usd");
    expect(currencyFromCountry("GB")).toBe("usd");
    expect(currencyFromCountry("AR")).toBe("usd");
    expect(currencyFromCountry("")).toBe("usd");
    expect(currencyFromCountry("XX")).toBe("usd");
  });

  it("reads Vercel and similar country headers", () => {
    expect(
      currencyFromRequestHeaders(new Headers({ "x-vercel-ip-country": "BR" }))
    ).toBe("brl");
    expect(
      currencyFromRequestHeaders(new Headers({ "x-vercel-ip-country": "IE" }))
    ).toBe("eur");
    expect(
      currencyFromRequestHeaders(new Headers({ "cf-ipcountry": "JP" }))
    ).toBe("usd");
    expect(
      currencyFromRequestHeaders(
        new Headers({ "cloudfront-viewer-country": "ES" })
      )
    ).toBe("eur");
    expect(currencyFromRequestHeaders(new Headers())).toBe("usd");
  });
});

describe("billing config", () => {
  it("stays off without Stripe env so the UI must not pretend anyone paid", async () => {
    const status = await publicBillingStatus({});
    expect(status.enabled).toBe(false);
    expect(
      (await publicBillingStatus({ STRIPE_SECRET_KEY: "sk_test_only" })).enabled
    ).toBe(false);
  });

  it("does not treat a bare number as a Price id", () => {
    expect(isStripePriceId("8900")).toBe(false);
    expect(isStripePriceId("2990")).toBe(false);
    expect(isStripePriceId("price_premium_yearly_brl")).toBe(true);
  });

  it("turns checkout on with the secret and one price id, without webhook or cloud", () => {
    const cfg = billingConfig({
      STRIPE_SECRET_KEY: "sk_test_billing",
      STRIPE_PRICE_PREMIUM_YEARLY: "price_premium_yearly_brl",
    });
    expect(cfg.enabled).toBe(true);
    expect(cfg.reason).toBeNull();
  });

  it("honors BILLING=off even with keys", async () => {
    expect(
      (await publicBillingStatus({ ...MATCHING_ENV, BILLING: "off" }, matchingRetrieve))
        .enabled
    ).toBe(false);
  });

  it("accepts the display currency from the selector (BRL/USD/EUR)", () => {
    expect(parseBillingCurrency("BRL")).toBe("brl");
    expect(parseBillingCurrency("usd")).toBe("usd");
    expect(parseBillingCurrency("Eur")).toBe("eur");
    expect(parseBillingCurrency("gbp")).toBeNull();
    expect(parseBillingCurrency(89)).toBeNull();
  });
});

describe("price resolution", () => {
  it("wires checkout to the Stripe Price for the selected currency and interval when amounts match", async () => {
    const yearlyUsd = await resolveMatchedCheckoutPrice(
      MATCHING_ENV,
      "premium_yearly",
      "usd",
      matchingRetrieve
    );
    expect(yearlyUsd?.priceId).toBe("price_premium_yearly_usd");
    expect(yearlyUsd?.currency).toBe("usd");
    expect(yearlyUsd?.unitAmount).toBe(7900);

    const coupleEur = await resolveMatchedCheckoutPrice(
      MATCHING_ENV,
      "couple_monthly",
      "eur",
      matchingRetrieve
    );
    expect(coupleEur?.priceId).toBe("price_couple_monthly_eur");
    expect(coupleEur?.plan).toBe("couple");
    expect(coupleEur?.unitAmount).toBe(1199);

    const status = await publicBillingStatus(MATCHING_ENV, matchingRetrieve);
    expect(status.enabled).toBe(true);
    expect(
      status.offers.every((offer) =>
        offer.amounts.every((amount) => amount.checkoutReady)
      )
    ).toBe(true);
    expect(JSON.stringify(status)).not.toContain("sk_test");
    expect(JSON.stringify(status)).not.toContain("price_");
  });

  it("treats an env Price with the wrong amount, currency, or interval as missing", async () => {
    const env = {
      ...SECRET_ENV,
      STRIPE_PRICE_BASICO: "price_basico_live",
      STRIPE_PRICE_COMPLETO: "price_completo_live",
      STRIPE_PRICE_PREMIUM_YEARLY: "price_old_yearly",
    };
    const retrieve = retrieveFromSnapshots({
      price_basico_live: snap("price_basico_live", 1158, "usd", "month"),
      price_completo_live: snap("price_completo_live", 2327, "usd", "month"),
      price_old_yearly: snap("price_old_yearly", 8900, "brl", "year"),
    });

    expect(
      await resolveMatchedCheckoutPrice(env, "premium_monthly", "usd", retrieve)
    ).toBeNull();
    expect(
      await resolveMatchedCheckoutPrice(env, "horizon_monthly", "usd", retrieve)
    ).toBeNull();
    expect(
      await resolveMatchedCheckoutPrice(env, "premium_yearly", "brl", retrieve)
    ).toBeNull();

    const status = await publicBillingStatus(env, retrieve);
    expect(status.enabled).toBe(true);
    expect(
      status.offers.every((offer) =>
        offer.amounts.every((amount) => amount.checkoutReady === false)
      )
    ).toBe(true);
    expect(
      status.offers
        .find((offer) => offer.id === "premium_yearly")
        ?.amounts.find((amount) => amount.currency === "brl")?.unitAmount
    ).toBe(39900);
  });

  it("does not fall back to another currency", async () => {
    const env = {
      ...SECRET_ENV,
      STRIPE_PRICE_PREMIUM_YEARLY: "price_premium_yearly_brl",
    };
    expect(
      await resolveMatchedCheckoutPrice(env, "premium_yearly", "usd", matchingRetrieve)
    ).toBeNull();
    expect(
      resolveCheckoutPrice(billingConfig(env).offers, "premium_yearly", "usd")
    ).toBeNull();
  });

  it("matches plan aliases BASICO / COMPLETO / COMPLETO_CONJUGE onto the cell Stripe reports", async () => {
    const env = {
      ...SECRET_ENV,
      STRIPE_PRICE_BASICO: "price_premium_yearly_brl",
      STRIPE_PRICE_COMPLETO: "price_horizon_monthly_usd",
      STRIPE_PRICE_COMPLETO_CONJUGE: "price_couple_yearly_eur",
    };
    expect(candidatePriceIdsForCell(env, "premium_yearly", "brl")).toContain(
      "price_premium_yearly_brl"
    );
    expect(
      await resolveMatchedCheckoutPrice(env, "premium_yearly", "brl", matchingRetrieve)
    ).toMatchObject({ priceId: "price_premium_yearly_brl", plan: "premium" });
    expect(
      await resolveMatchedCheckoutPrice(env, "horizon_monthly", "usd", matchingRetrieve)
    ).toMatchObject({ priceId: "price_horizon_monthly_usd", plan: "horizon" });
    expect(
      await resolveMatchedCheckoutPrice(env, "couple_yearly", "eur", matchingRetrieve)
    ).toMatchObject({ priceId: "price_couple_yearly_eur", plan: "couple" });
    expect(
      await resolveMatchedCheckoutPrice(env, "couple_monthly", "brl", matchingRetrieve)
    ).toBeNull();
  });

  it("prefers the cell-specific env var over the plan alias", async () => {
    const env = {
      ...SECRET_ENV,
      STRIPE_PRICE_PREMIUM_YEARLY: "price_premium_yearly_brl",
      STRIPE_PRICE_BASICO: "price_other",
    };
    expect(candidatePriceIdsForCell(env, "premium_yearly", "brl")[0]).toBe(
      "price_premium_yearly_brl"
    );
    expect(
      await resolveMatchedCheckoutPrice(env, "premium_yearly", "brl", matchingRetrieve)
    ).toMatchObject({ priceId: "price_premium_yearly_brl" });
  });

  it("lists MONTHLY/YEARLY plus _BRL/_USD/_EUR env names for new slots", () => {
    expect(priceEnvKeysForCell("horizon_monthly", "usd")).toEqual([
      "STRIPE_PRICE_COMPLETO_MONTHLY_USD",
      "STRIPE_PRICE_HORIZON_MONTHLY_USD",
      "STRIPE_PRICE_COMPLETO",
    ]);
    expect(priceEnvKeysForCell("couple_yearly", "brl")).toEqual([
      "STRIPE_PRICE_COMPLETO_CONJUGE_YEARLY",
      "STRIPE_PRICE_COMPLETO_CONJUGE_YEARLY_BRL",
      "STRIPE_PRICE_COMPLETO_CONJUGE",
    ]);
  });
});

describe("checkout session body", () => {
  const offer = {
    id: "premium_yearly" as const,
    plan: "premium" as const,
    interval: "year" as const,
    priceId: "price_premium_yearly_usd",
    unitAmount: 7900,
    listAmount: 9900,
    currency: "usd" as const,
  };

  async function capture(input: Parameters<typeof createStripeCheckoutSession>[0]) {
    const calls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      calls.push(String(init?.body ?? ""));
      return new Response(
        JSON.stringify({
          id: "cs_test_session",
          url: "https://checkout.stripe.com/c/pay/cs_test_session",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };
    try {
      const session = await createStripeCheckoutSession(input);
      return { session, body: calls[0] ?? "" };
    } finally {
      globalThis.fetch = original;
    }
  }

  it("sends the selected currency's Price id", async () => {
    const { session, body } = await capture({
      secretKey: "sk_test_billing",
      offer,
      successUrl: "https://app.example/planos?checkout=success",
      cancelUrl: "https://app.example/planos?checkout=cancel",
    });
    const params = new URLSearchParams(body);
    expect(session.url).toBe("https://checkout.stripe.com/c/pay/cs_test_session");
    expect(params.get("line_items[0][price]")).toBe("price_premium_yearly_usd");
    expect(params.get("metadata[currency]")).toBe("usd");
    expect(params.get("metadata[offerId]")).toBe("premium_yearly");
  });

  it("sends Completo+Cônjuge as its own plan", async () => {
    const { body } = await capture({
      secretKey: "sk_test_billing",
      offer: {
        ...offer,
        id: "couple_yearly",
        plan: "couple",
        priceId: "price_couple_yearly_eur",
        currency: "eur",
        unitAmount: 13900,
        listAmount: 23900,
      },
      successUrl: "https://app.example/planos?checkout=success",
      cancelUrl: "https://app.example/planos?checkout=cancel",
    });
    const params = new URLSearchParams(body);
    expect(params.get("line_items[0][price]")).toBe("price_couple_yearly_eur");
    expect(params.get("metadata[planTier]")).toBe("couple");
  });
});

describe("checkout POST", () => {
  it("charges the Stripe Price for the selected currency when the catalog matches", async () => {
    const prev = { ...process.env };
    process.env.STRIPE_SECRET_KEY = "sk_test_billing";
    process.env.STRIPE_PRICE_BASICO_YEARLY_USD = "price_premium_yearly_usd";
    delete process.env.BILLING;
    delete process.env.STRIPE;
    const original = globalThis.fetch;
    const checkoutBodies: string[] = [];
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/v1/prices/")) {
        return new Response(
          JSON.stringify({
            id: "price_premium_yearly_usd",
            active: true,
            currency: "usd",
            unit_amount: 7900,
            recurring: { interval: "year", interval_count: 1 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      checkoutBodies.push(String(init?.body ?? ""));
      return new Response(
        JSON.stringify({
          id: "cs_test_session",
          url: "https://checkout.stripe.com/c/pay/cs_test_session",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };
    try {
      const { POST } = await import("@/app/api/billing/checkout/route");
      const { NextRequest } = await import("next/server");
      const res = await POST(
        new NextRequest("http://localhost/api/billing/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            offerId: "premium_yearly",
            currency: "usd",
          }),
        })
      );
      const json = (await res.json()) as { url?: string };
      expect(res.status).toBe(200);
      expect(json.url).toContain("checkout.stripe.com");
      const params = new URLSearchParams(checkoutBodies[0] ?? "");
      expect(params.get("line_items[0][price]")).toBe("price_premium_yearly_usd");
      expect(params.get("metadata[currency]")).toBe("usd");
    } finally {
      globalThis.fetch = original;
      for (const key of Object.keys(process.env)) {
        if (!(key in prev)) delete process.env[key];
      }
      Object.assign(process.env, prev);
    }
  });
});

describe("formatPlanAmount", () => {
  it("keeps promo cents and whole yearly amounts", () => {
    expect(formatPlanAmount(39900, "brl", "pt-BR")).toMatch(/399/);
    expect(formatPlanAmount(2990, "brl", "pt-BR")).toMatch(/29[,.]90/);
    expect(formatPlanAmount(7900, "usd", "en-US")).toMatch(/79/);
    expect(formatPlanAmount(599, "eur", "pt-BR")).toMatch(/5[,.]99/);
  });
});

describe("canAccess", () => {
  it("keeps the engine open while billing is off", () => {
    expect(canAccess("free", "named_scenarios")).toBe(true);
  });

  it("gates only when Stripe billing is live", () => {
    expect(canAccess("free", "named_scenarios", true)).toBe(false);
    expect(canAccess("premium", "named_scenarios", true)).toBe(false);
    expect(canAccess("horizon", "named_scenarios", true)).toBe(true);
    expect(canAccess("couple", "named_scenarios", true)).toBe(true);
    expect(canModelCouple("horizon")).toBe(false);
    expect(canModelCouple("couple")).toBe(true);
  });
});

describe("Stripe webhook signature", () => {
  const secret = SECRET_ENV.STRIPE_WEBHOOK_SECRET;
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

  it("maps a USD Price id to the same Básico SKU", () => {
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
            unitAmount: 59900,
            listAmount: 79900,
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

  it("maps Completo and Completo+Cônjuge Prices to their own plans", () => {
    const completo = structuredClone(checkoutCompleted);
    completo.data.object.metadata.priceId = "price_horizon_yearly_eur";
    completo.data.object.metadata.offerId = "horizon_yearly";
    completo.data.object.metadata.planTier = "horizon";
    expect(commandFromStripeEvent(completo, OFFERS)).toMatchObject({
      action: "set_plan",
      plan: "horizon",
    });

    const couple = structuredClone(checkoutCompleted);
    couple.data.object.metadata.priceId = "price_couple_yearly_eur";
    couple.data.object.metadata.offerId = "couple_yearly";
    couple.data.object.metadata.planTier = "couple";
    expect(commandFromStripeEvent(couple, OFFERS)).toMatchObject({
      action: "set_plan",
      plan: "couple",
    });
    expect(planFromPriceId(OFFERS, "price_couple_monthly_usd")).toBe("couple");
  });
});
