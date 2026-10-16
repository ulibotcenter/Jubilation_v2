import { describe, expect, it } from "vitest";
import { createMemoryDirectory } from "@/lib/accounts/memoryDirectory";
import {
  parseProfilePreferences,
  sanitizePlanDocument,
} from "@/lib/accounts/planDocument";
import { billingConfig, publicBillingStatus } from "@/lib/billing/config";
import { commandFromStripeEvent } from "@/lib/billing/events";
import { persistBillingCommand } from "@/lib/billing/persist";
import {
  hashToken,
  issueMagicLink,
  lookupMagicLink,
  MAGIC_LINK_TTL_MS,
} from "@/lib/cloud/magicLink";
import { buildRetirementReportCsv } from "@/lib/exportReport";
import {
  canUseAdvancedExport,
  canUseConnectors,
  manualPlanningOpen,
  planTierAfterBrowserReturn,
} from "@/lib/plans";
import {
  DEFAULT_KPI_VALUES,
  DEFAULT_USER,
  type PortfolioAsset,
} from "@/types";
import checkoutCompleted from "./fixtures/stripe-checkout-session-completed.json";

const LIVE_ENV = {
  DATABASE_URL: "postgres://u:p@db.eu-central-1.aws.neon.tech/jubilation",
  AUTH_SECRET: "a-very-long-auth-secret",
  STRIPE_SECRET_KEY: "sk_test_billing",
  STRIPE_WEBHOOK_SECRET: "whsec_test_fixture_secret",
  STRIPE_PRICE_PREMIUM_YEARLY: "price_premium_yearly_brl",
  STRIPE_PRICE_PREMIUM_MONTHLY: "price_premium_monthly_brl",
  STRIPE_PRICE_HORIZON_YEARLY: "price_horizon_yearly_brl",
  STRIPE_PRICE_PREMIUM_YEARLY_USD: "price_premium_yearly_usd",
  STRIPE_PRICE_PREMIUM_MONTHLY_USD: "price_premium_monthly_usd",
  STRIPE_PRICE_HORIZON_YEARLY_USD: "price_horizon_yearly_usd",
  STRIPE_PRICE_PREMIUM_YEARLY_EUR: "price_premium_yearly_eur",
  STRIPE_PRICE_PREMIUM_MONTHLY_EUR: "price_premium_monthly_eur",
  STRIPE_PRICE_HORIZON_YEARLY_EUR: "price_horizon_yearly_eur",
};

const OFFERS = billingConfig(LIVE_ENV).offers;

const PLAN_BODY = {
  kpis: { ...DEFAULT_KPI_VALUES, currentAge: 42 },
  household: { scope: "individual" },
  country: "BR",
  locale: "pt",
  currency: "BRL",
};

describe("magic-link token", () => {
  it("issues a token and verifies it once, creating a free account", () => {
    const directory = createMemoryDirectory();
    const now = Date.parse("2026-10-15T12:00:00Z");
    const token = directory.issueMagicLink("Ada@Example.com", now);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(token)).not.toBe(token);

    const user = directory.completeMagicLink(token, now + 1000);
    expect(user?.email).toBe("ada@example.com");
    expect(user?.planTier).toBe("free");
    expect(directory.completeMagicLink(token, now + 2000)).toBeNull();
  });

  it("rejects an expired link and an unknown token", () => {
    const directory = createMemoryDirectory();
    const now = Date.parse("2026-10-15T12:00:00Z");
    const token = directory.issueMagicLink("ada@example.com", now);
    expect(
      directory.completeMagicLink(token, now + MAGIC_LINK_TTL_MS + 1)
    ).toBeNull();
    expect(directory.completeMagicLink("not-a-real-token", now)).toBeNull();
  });

  it("signs in an existing user instead of creating a second one", () => {
    const directory = createMemoryDirectory();
    const existing = directory.createUser({
      id: "user-ada",
      email: "ada@example.com",
    });
    const token = directory.issueMagicLink("ada@example.com");
    const signedIn = directory.completeMagicLink(token);
    expect(signedIn?.id).toBe(existing.id);
  });

  it("shares issue and lookup rules with the stored record", () => {
    const now = 1_700_000_000_000;
    const issued = issueMagicLink("ada@example.com", now);
    expect(lookupMagicLink(issued.record, now)).toEqual({
      ok: true,
      email: "ada@example.com",
    });
    expect(
      lookupMagicLink(issued.record, now + MAGIC_LINK_TTL_MS)
    ).toEqual({ ok: false, reason: "expired" });
    expect(
      lookupMagicLink({ ...issued.record, consumedAt: now }, now)
    ).toEqual({ ok: false, reason: "consumed" });
    expect(lookupMagicLink(undefined, now)).toEqual({
      ok: false,
      reason: "missing",
    });
  });
});

describe("plan persist", () => {
  it("saves profile preferences and the retirement plan without granting a tier", () => {
    const directory = createMemoryDirectory();
    const user = directory.createUser({
      email: "ada@example.com",
    });
    const prefs = directory.saveProfile(user.id, {
      country: "PT",
      locale: "pt",
      currency: "EUR",
      planTier: "premium",
    });
    expect(prefs).toEqual({ country: "PT", locale: "pt", currency: "EUR" });
    expect(directory.getUser(user.id)?.preferredCountry).toBe("PT");
    expect(directory.getUser(user.id)?.preferredLocale).toBe("pt");
    expect(directory.getUser(user.id)?.preferredCurrency).toBe("EUR");
    expect(directory.getUser(user.id)?.planTier).toBe("free");

    expect(directory.savePlan(user.id, PLAN_BODY)).toBeNull();
    expect(directory.getPlan(user.id)).toBeNull();
    expect(directory.getUser(user.id)?.planTier).toBe("free");

    const paid = directory.createUser({
      email: "paid@example.com",
      planTier: "premium",
    });
    const stored = directory.savePlan(paid.id, {
      ...PLAN_BODY,
      planTier: "horizon",
      billingLive: true,
      user: { name: "Ada", email: "ada@example.com", plan: "premium" },
    });
    expect(stored?.document.planTier).toBeUndefined();
    expect(stored?.document.billingLive).toBeUndefined();
    expect(stored?.document.kpis).toMatchObject({ currentAge: 42 });
    const userDoc = stored?.document.user as { plan?: string; name?: string };
    expect(userDoc.plan).toBeUndefined();
    expect(userDoc.name).toBe("Ada");
    expect(directory.getPlan(paid.id)?.document).toEqual(stored?.document);
    expect(directory.getUser(paid.id)?.planTier).toBe("premium");
    expect(directory.getUser(user.id)?.planTier).toBe("free");
  });

  it("rejects a body that is only a plan grant", () => {
    expect(parseProfilePreferences({ planTier: "premium" })).toBeNull();
    expect(sanitizePlanDocument({ planTier: "premium" })).toBeNull();
    expect(
      parseProfilePreferences({
        country: "BR",
        locale: "pt",
        currency: "BRL",
        planTier: "horizon",
      })
    ).toEqual({ country: "BR", locale: "pt", currency: "BRL" });
  });
});

describe("webhook activates plan", () => {
  it("sets premium from checkout.session.completed and ignores a replay grant", async () => {
    const directory = createMemoryDirectory();
    directory.createUser({
      id: "user-maria-1",
      email: "maria@example.com",
    });
    const command = commandFromStripeEvent(checkoutCompleted, OFFERS);
    const first = await persistBillingCommand(command, directory.billingStore);
    expect(first).toMatchObject({
      applied: true,
      duplicate: false,
      userId: "user-maria-1",
    });
    expect(directory.getUser("user-maria-1")?.planTier).toBe("premium");
    expect(directory.getUser("user-maria-1")?.subscriptionStatus).toBe("active");

    const second = await persistBillingCommand(command, directory.billingStore);
    expect(second.duplicate).toBe(true);
    expect(directory.getUser("user-maria-1")?.planTier).toBe("premium");
  });

  it("does not create a paid user when nobody matches the event", async () => {
    const directory = createMemoryDirectory();
    const command = commandFromStripeEvent(checkoutCompleted, OFFERS);
    const result = await persistBillingCommand(command, directory.billingStore);
    expect(result).toEqual({ applied: false, duplicate: false, userId: null });
    expect(directory.getUser("user-maria-1")).toBeNull();
  });
});

describe("connector and export gates", () => {
  it("hides connectors and advanced export except on Completo", () => {
    expect(manualPlanningOpen()).toBe(true);
    expect(canUseConnectors("free")).toBe(false);
    expect(canUseAdvancedExport("free")).toBe(false);
    expect(canUseConnectors("premium")).toBe(false);
    expect(canUseAdvancedExport("premium")).toBe(false);
    expect(canUseConnectors("horizon")).toBe(true);
    expect(canUseAdvancedExport("horizon")).toBe(true);
  });

  it("keeps holdings and Monte Carlo out of the basic CSV", () => {
    const holding = {
      id: "h1",
      ticker: "CASH",
      name: "Cash",
      assetClass: "cash",
      quantity: 1,
      currentPrice: 10,
      costBasis: 10,
      currency: "BRL",
      allocation: 100,
    } as PortfolioAsset;
    const snapshot = {
      kpis: DEFAULT_KPI_VALUES,
      currency: "BRL" as const,
      projections: [],
      portfolio: [holding],
      simulationIncludedAssetIds: ["h1"],
      monteCarlo: {
        hasRun: true,
        lastRunAt: "2026-10-15T00:00:00.000Z",
        results: [
          {
            scenario: "base" as const,
            label: "Base",
            finalValue: 1,
            medianValue: 1,
            successRate: 50,
            percentile10: 1,
            percentile90: 2,
          },
        ],
      },
      stressTestResults: [],
      user: DEFAULT_USER,
    };
    const basic = buildRetirementReportCsv(snapshot);
    expect(basic).toContain("KEY ASSUMPTIONS");
    expect(basic).toContain("YEAR-BY-YEAR PROJECTIONS");
    expect(basic).not.toContain("PORTFOLIO HOLDINGS");
    expect(basic).not.toContain("MONTE CARLO");
    const advanced = buildRetirementReportCsv(snapshot, { advanced: true });
    expect(advanced).toContain("PORTFOLIO HOLDINGS");
    expect(advanced).toContain("MONTE CARLO RESULTS");
  });
});

describe("missing env does not grant", () => {
  it("leaves billing off and the plan free without Stripe, a webhook, or a success URL", async () => {
    const status = await publicBillingStatus({});
    expect(status.enabled).toBe(false);
    expect(status.reason).toBe("missing_env");

    const directory = createMemoryDirectory();
    const user = directory.createUser({
      id: "user-maria-1",
      email: "maria@example.com",
    });
    const unpaid = structuredClone(checkoutCompleted);
    unpaid.data.object.payment_status = "unpaid";
    const ignored = commandFromStripeEvent(unpaid, OFFERS);
    const result = await persistBillingCommand(ignored, directory.billingStore);
    expect(result.applied).toBe(false);
    expect(directory.getUser(user.id)?.planTier).toBe("free");
    expect(planTierAfterBrowserReturn("free", "success")).toBe("free");
    expect(canUseConnectors(planTierAfterBrowserReturn("free", "success"))).toBe(
      false
    );
  });
});
