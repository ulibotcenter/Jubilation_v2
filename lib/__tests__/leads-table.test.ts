import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createMemoryDirectory } from "@/lib/accounts/memoryDirectory";
import { billingConfig } from "@/lib/billing/config";
import { commandFromStripeEvent } from "@/lib/billing/events";
import { persistBillingCommand } from "@/lib/billing/persist";
import { recordSignupLead } from "@/lib/cloud/db";
import {
  couponCodeFromStripeObject,
  leadPlanFromTier,
  leadStatusFromSubscription,
  mergeBillingLead,
  mergeSignupLead,
  parseLeadPlan,
} from "@/lib/leads";
import checkoutCompleted from "./fixtures/stripe-checkout-session-completed.json";

const LIVE_ENV = {
  DATABASE_URL: "postgres://u:p@db.eu-central-1.aws.neon.tech/jubilation",
  AUTH_SECRET: "a-very-long-auth-secret",
  STRIPE_SECRET_KEY: "sk_test_billing",
  STRIPE_WEBHOOK_SECRET: "whsec_test_fixture_secret",
  STRIPE_PRICE_PREMIUM_YEARLY: "price_premium_yearly_brl",
  STRIPE_PRICE_PREMIUM_MONTHLY: "price_premium_monthly_brl",
  STRIPE_PRICE_HORIZON_YEARLY: "price_horizon_yearly_brl",
};

const OFFERS = billingConfig(LIVE_ENV).offers;

describe("leads table schema", () => {
  it("creates leads in the existing Postgres SCHEMA_SQL path", () => {
    const src = readFileSync("lib/cloud/db.ts", "utf8");
    expect(src).toContain("CREATE TABLE IF NOT EXISTS leads");
    expect(src).toContain("CREATE UNIQUE INDEX IF NOT EXISTS leads_email_uidx");
    expect(src).toContain("user_id TEXT REFERENCES auth_users(id)");
    for (const column of [
      "id UUID PRIMARY KEY",
      "email TEXT NOT NULL",
      "used_coupon BOOLEAN NOT NULL DEFAULT false",
      "coupon_code TEXT",
      "plan TEXT NOT NULL DEFAULT 'free'",
      "status TEXT NOT NULL DEFAULT 'free'",
      "subscribed_at TIMESTAMPTZ",
      "renewal_date TIMESTAMPTZ",
      "source TEXT NOT NULL DEFAULT 'organic'",
      "country TEXT",
      "stripe_customer_id TEXT",
      "created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
      "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    ]) {
      expect(src).toContain(column);
    }
    expect(src).toContain("ON CONFLICT (email) DO UPDATE SET");
    expect(src).not.toMatch(/CREATE TABLE IF NOT EXISTS leads[\s\S]*CHECK \(/);
  });

  it("wires signup and Stripe persist without changing the UI routes", () => {
    const confirm = readFileSync("app/api/auth/confirm/route.ts", "utf8");
    const callback = readFileSync("app/api/auth/callback/route.ts", "utf8");
    const persist = readFileSync("lib/billing/persist.ts", "utf8");
    const webhook = readFileSync("app/api/billing/webhook/route.ts", "utf8");
    const entrar = readFileSync("components/auth/LeanLoginForm.tsx", "utf8");
    const checkout = readFileSync("app/api/billing/checkout/route.ts", "utf8");
    expect(confirm).toContain("recordSignupLead");
    expect(callback).toContain("recordSignupLead");
    expect(persist).toContain("upsertBillingLead");
    expect(webhook).toContain("persistBillingCommand");
    expect(entrar).not.toContain("recordSignupLead");
    expect(checkout).not.toContain("upsertBillingLead");
  });
});

describe("lead plan and status mapping", () => {
  it("maps existing plan slugs onto free / basico / completo / completo_conjuge", () => {
    expect(leadPlanFromTier("free")).toBe("free");
    expect(leadPlanFromTier("premium")).toBe("basico");
    expect(leadPlanFromTier("horizon")).toBe("completo");
    expect(leadPlanFromTier("couple")).toBe("completo_conjuge");
    expect(parseLeadPlan("basico")).toBe("basico");
    expect(parseLeadPlan("monthly")).toBe("basico");
    expect(parseLeadPlan("yearly")).toBe("completo");
    expect(leadStatusFromSubscription("none")).toBe("free");
    expect(leadStatusFromSubscription("trialing")).toBe("trial");
    expect(leadStatusFromSubscription("active")).toBe("active");
    expect(leadStatusFromSubscription("canceled")).toBe("canceled");
  });
});

describe("signup lead upsert", () => {
  it("inserts organic free and only fills identity on conflict", () => {
    const created = mergeSignupLead(null, {
      email: "ada@example.com",
      userId: "user-ada",
      country: "BR",
      now: "2026-10-23T10:00:00.000Z",
    });
    expect(created).toMatchObject({
      email: "ada@example.com",
      userId: "user-ada",
      plan: "free",
      status: "free",
      source: "organic",
      country: "BR",
      usedCoupon: false,
    });

    const paid = mergeSignupLead(
      {
        ...created,
        plan: "basico",
        status: "active",
        source: "coupon_amigo",
        usedCoupon: true,
        couponCode: "AMIGO100",
      },
      { email: "ada@example.com", userId: "user-ada", country: "PT" }
    );
    expect(paid.plan).toBe("basico");
    expect(paid.status).toBe("active");
    expect(paid.source).toBe("coupon_amigo");
    expect(paid.country).toBe("PT");
  });

  it("does not throw when DATABASE_URL is missing", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    await expect(
      recordSignupLead({ email: "ada@example.com", userId: "user-ada" })
    ).resolves.toBeUndefined();
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  });
});

describe("Stripe lead upsert", () => {
  it("reads AMIGO100 or any other coupon from the session", () => {
    expect(
      couponCodeFromStripeObject({
        discounts: [{ coupon: { id: "n4g", name: "AMIGO100" } }],
      })
    ).toBe("AMIGO100");
    expect(
      couponCodeFromStripeObject({
        discount: { coupon: { id: "WELCOME20", name: "WELCOME20" } },
      })
    ).toBe("WELCOME20");
    expect(couponCodeFromStripeObject({ metadata: { planTier: "premium" } })).toBe(
      null
    );
  });

  it("maps checkout.session.completed onto the lead", async () => {
    const directory = createMemoryDirectory();
    directory.createUser({
      id: "user-maria-1",
      email: "maria@example.com",
      country: "BR",
    });
    const event = structuredClone(checkoutCompleted);
    Object.assign(event.data.object, {
      customer_email: "maria@example.com",
      created: 1_766_000_000,
      discounts: [{ coupon: { id: "AMIGO100", name: "AMIGO100" } }],
    });
    const command = commandFromStripeEvent(event, OFFERS);
    expect(command).toMatchObject({
      action: "set_plan",
      plan: "premium",
      status: "active",
      couponCode: "AMIGO100",
      usedCoupon: true,
      email: "maria@example.com",
    });
    const result = await persistBillingCommand(command, directory.billingStore);
    expect(result.applied).toBe(true);
    expect(directory.getLead("maria@example.com")).toMatchObject({
      userId: "user-maria-1",
      plan: "basico",
      status: "active",
      usedCoupon: true,
      couponCode: "AMIGO100",
      source: "coupon_amigo",
      stripeCustomerId: "cus_test_maria",
      country: "BR",
    });
  });

  it("maps customer.subscription.updated plan, status, and renewal", async () => {
    const directory = createMemoryDirectory();
    directory.createUser({
      id: "user-maria-1",
      email: "maria@example.com",
    });
    const updated = {
      id: "evt_test_sub_updated_lead",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test_horizon",
          status: "active",
          customer: "cus_test_maria",
          start_date: 1_766_000_000,
          current_period_end: 1_768_592_000,
          metadata: {
            userId: "user-maria-1",
            planTier: "horizon",
            offerId: "horizon_yearly",
            priceId: "price_horizon_yearly_brl",
          },
        },
      },
    };
    const command = commandFromStripeEvent(updated, OFFERS);
    expect(command).toMatchObject({
      action: "set_plan",
      plan: "horizon",
      status: "active",
    });
    await persistBillingCommand(command, directory.billingStore);
    expect(directory.getLead("maria@example.com")).toMatchObject({
      plan: "completo",
      status: "active",
      stripeCustomerId: "cus_test_maria",
      subscribedAt: "2025-12-17T19:33:20.000Z",
      renewalDate: "2026-01-16T19:33:20.000Z",
      source: "organic",
    });
  });

  it("keeps checkout applied when the lead write throws", async () => {
    const directory = createMemoryDirectory();
    directory.createUser({
      id: "user-maria-1",
      email: "maria@example.com",
    });
    const store = {
      ...directory.billingStore,
      upsertBillingLead: async () => {
        throw new Error("database_unavailable");
      },
    };
    const result = await persistBillingCommand(
      commandFromStripeEvent(checkoutCompleted, OFFERS),
      store
    );
    expect(result.applied).toBe(true);
    expect(directory.getUser("user-maria-1")?.planTier).toBe("premium");
    expect(directory.getLead("maria@example.com")).toBeNull();
  });
});
