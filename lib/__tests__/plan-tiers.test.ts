import { describe, expect, it } from "vitest";
import { createMemoryDirectory } from "@/lib/accounts/memoryDirectory";
import { parseSignupLead } from "@/lib/accounts/signupLead";
import { billingConfig } from "@/lib/billing/config";
import { commandFromStripeEvent } from "@/lib/billing/events";
import { buildFormattedPlanPdf } from "@/lib/exportReport";
import { EMAIL_USE_BODY, EMAIL_USE_LABEL } from "@/lib/legal/emailUse";
import { TERMS_BODY } from "@/lib/legal/terms";
import { createModelSeed } from "@/lib/onboarding/seed";
import {
  BASICO_LISTED_CAP,
  holdingAddDecision,
  listedCapCount,
} from "@/lib/plans/holdingCap";
import { readFileSync } from "node:fs";
import {
  PLAN_LABELS,
  canModelCouple,
  canSaveFullPlan,
  canUseAdvancedExport,
  canUseBasicExport,
  canUseConnectors,
  canUseFullPlanner,
  canUseMultipleScenarios,
  plannerGateReady,
  shouldRenderAppPage,
} from "@/lib/plans";
import { PT } from "@/lib/i18n/catalog/pt";
import { useAppStore } from "@/store/useAppStore";
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

function holding(
  partial: Partial<PortfolioAsset> & Pick<PortfolioAsset, "id" | "ticker">
): PortfolioAsset {
  return {
    name: partial.ticker,
    assetClass: "stocks",
    quantity: 1,
    currentPrice: 10,
    costBasis: 10,
    currency: "BRL",
    nativeCurrency: "BRL",
    allocation: 0,
    origin: "manual",
    source: "MANUAL",
    valueType: "user_estimate",
    ...partial,
  };
}

describe("tier gates", () => {
  it("keeps the full plan, export, and connectors off the free calculator", () => {
    expect(canUseFullPlanner("free")).toBe(false);
    expect(canSaveFullPlan("free")).toBe(false);
    expect(canUseBasicExport("free")).toBe(false);
    expect(canUseAdvancedExport("free")).toBe(false);
    expect(canUseConnectors("free")).toBe(false);
    expect(canUseMultipleScenarios("free")).toBe(false);
  });

  it("gives Básico the manual plan and basic export, not connectors or scenarios", () => {
    expect(PLAN_LABELS.premium).toBe("Básico");
    expect(canUseFullPlanner("premium")).toBe(true);
    expect(canSaveFullPlan("premium")).toBe(true);
    expect(canUseBasicExport("premium")).toBe(true);
    expect(canUseConnectors("premium")).toBe(false);
    expect(canUseAdvancedExport("premium")).toBe(false);
    expect(canUseMultipleScenarios("premium")).toBe(false);
  });

  it("gives Completo connectors, scenarios, and the formatted export", () => {
    expect(PLAN_LABELS.horizon).toBe("Completo");
    expect(canUseConnectors("horizon")).toBe(true);
    expect(canUseMultipleScenarios("horizon")).toBe(true);
    expect(canUseAdvancedExport("horizon")).toBe(true);
    expect(canModelCouple("horizon")).toBe(false);
  });

  it("gives Completo+Cônjuge Completo features plus couple modeling, not spouse B3", () => {
    expect(PLAN_LABELS.couple).toBe("Completo+Cônjuge");
    expect(canUseConnectors("couple")).toBe(true);
    expect(canUseMultipleScenarios("couple")).toBe(true);
    expect(canUseAdvancedExport("couple")).toBe(true);
    expect(canModelCouple("couple")).toBe(true);
    expect(canModelCouple("premium")).toBe(false);
  });

  it("never blanks Painel for a paid plan waiting on onboarding", () => {
    expect(
      shouldRenderAppPage({
        legalRoute: false,
        fullPlanner: true,
        onboardingCompleted: false,
      })
    ).toBe(true);
    expect(
      plannerGateReady({
        billingChecked: false,
        billingLive: true,
        planTier: "horizon",
      })
    ).toBe(true);
    expect(
      plannerGateReady({
        billingChecked: false,
        billingLive: true,
        planTier: "couple",
      })
    ).toBe(true);
    expect(
      plannerGateReady({
        billingChecked: false,
        billingLive: false,
        planTier: "free",
      })
    ).toBe(false);
    const shell = readFileSync("components/layout/AppShell.tsx", "utf8");
    expect(shell).toContain("shouldRenderAppPage");
    expect(shell).toContain("{children}");
  });

  it("keeps Completo live after the cloud plan document is applied", () => {
    const before = useAppStore.getState();
    useAppStore.setState({
      planTier: "horizon",
      billingLive: true,
      billingChecked: true,
      user: {
        ...before.user,
        plan: "horizon",
        subscriptionStatus: "active",
      },
    });
    useAppStore.getState().applyServerPlan({
      kpis: before.kpis,
      household: before.household,
      portfolio: before.portfolio,
    });
    const next = useAppStore.getState();
    expect(next.planTier).toBe("horizon");
    expect(next.billingLive).toBe(true);
    expect(next.billingChecked).toBe(true);
    expect(canUseFullPlanner(next.planTier)).toBe(true);
    expect(plannerGateReady(next)).toBe(true);
    useAppStore.setState({
      planTier: before.planTier,
      billingLive: before.billingLive,
      billingChecked: before.billingChecked,
      user: before.user,
    });
  });
});

describe("webhook maps the two existing products", () => {
  const offers = billingConfig(LIVE_ENV).offers;

  it("maps Individual prices to Básico and Couple prices to Completo", () => {
    const individual = commandFromStripeEvent(checkoutCompleted, offers);
    expect(individual).toMatchObject({ action: "set_plan", plan: "premium" });
    if (individual.action === "set_plan") {
      expect(PLAN_LABELS[individual.plan]).toBe("Básico");
      expect(canUseConnectors(individual.plan)).toBe(false);
    }

    const coupleEvent = structuredClone(checkoutCompleted);
    coupleEvent.data.object.metadata.priceId = "price_horizon_yearly_brl";
    coupleEvent.data.object.metadata.offerId = "horizon_yearly";
    coupleEvent.data.object.metadata.planTier = "horizon";
    const couple = commandFromStripeEvent(coupleEvent, offers);
    expect(couple).toMatchObject({ action: "set_plan", plan: "horizon" });
    if (couple.action === "set_plan") {
      expect(PLAN_LABELS[couple.plan]).toBe("Completo");
      expect(canUseConnectors(couple.plan)).toBe(true);
    }
  });
});

describe("básico holding cap", () => {
  const home = holding({
    id: "home-1",
    ticker: "CASA",
    assetClass: "real_estate",
    listing: "unlisted",
    manualKind: "home",
  });

  it("blocks the 6th bolsa or Tesouro holding and ignores property", () => {
    const five = Array.from({ length: BASICO_LISTED_CAP }, (_, index) =>
      holding({ id: `stock-${index}`, ticker: `STK${index}` })
    );
    expect(listedCapCount(five)).toBe(5);
    expect(
      holdingAddDecision("premium", five, holding({ id: "stock-6", ticker: "STK6" }))
    ).toEqual({ ok: false, reason: "listed_cap" });
    expect(holdingAddDecision("premium", five, home)).toEqual({ ok: true });
    expect(
      holdingAddDecision(
        "premium",
        five,
        holding({ id: "rf-1", ticker: "CDB1", assetClass: "bonds" })
      )
    ).toEqual({ ok: false, reason: "listed_cap" });
    expect(
      holdingAddDecision("horizon", five, holding({ id: "stock-6", ticker: "STK6" }))
    ).toEqual({ ok: true });
  });

  it("does not let the model seed block a paying user", () => {
    const seed = createModelSeed();
    expect(listedCapCount(seed)).toBe(0);
    const first = holding({ id: "asset-1", ticker: "PETR4" });
    expect(holdingAddDecision("premium", seed, first)).toEqual({ ok: true });
  });

  it("enforces the cap on the store add path", () => {
    useAppStore.setState({
      planTier: "premium",
      portfolio: [],
      simulationIncludedAssetIds: [],
      modelSeedActive: false,
      holdingCapBlocked: false,
    });
    for (let index = 0; index < BASICO_LISTED_CAP; index += 1) {
      const added = useAppStore.getState().addPortfolioAsset(
        holding({ id: `live-${index}`, ticker: `L${index}` })
      );
      expect(added).toEqual({ ok: true });
    }
    const blocked = useAppStore.getState().addPortfolioAsset(
      holding({ id: "live-6", ticker: "L6" })
    );
    expect(blocked).toEqual({ ok: false, reason: "listed_cap" });
    expect(useAppStore.getState().holdingCapBlocked).toBe(true);
    expect(useAppStore.getState().portfolio).toHaveLength(BASICO_LISTED_CAP);

    const property = useAppStore.getState().addPortfolioAsset(home);
    expect(property).toEqual({ ok: true });
    expect(
      useAppStore.getState().portfolio.some((asset) => asset.ticker === "CASA")
    ).toBe(true);

    useAppStore.setState({
      planTier: "horizon",
      holdingCapBlocked: false,
    });
    const completo = useAppStore.getState().addPortfolioAsset(
      holding({ id: "live-6", ticker: "L6" })
    );
    expect(completo).toEqual({ ok: true });
    expect(useAppStore.getState().portfolio.some((asset) => asset.id === "live-6")).toBe(
      true
    );
  });

  it("drops the seed before counting, so the first real holding is not the sixth", () => {
    useAppStore.setState({
      planTier: "premium",
      portfolio: createModelSeed(),
      simulationIncludedAssetIds: createModelSeed().map((asset) => asset.id),
      modelSeedActive: true,
      holdingCapBlocked: false,
    });
    const added = useAppStore.getState().addPortfolioAsset(
      holding({ id: "asset-real", ticker: "VALE3" })
    );
    expect(added).toEqual({ ok: true });
    const state = useAppStore.getState();
    expect(state.portfolio.some((asset) => asset.id.startsWith("seed-"))).toBe(false);
    expect(state.holdingCapBlocked).toBe(false);
    expect(listedCapCount(state.portfolio)).toBe(1);
  });
});

describe("signup lead and email-use copy", () => {
  it("keeps the exact email-use sentence and the terms line", () => {
    expect(EMAIL_USE_LABEL).toBe("Como usamos seu e-mail");
    expect(EMAIL_USE_BODY).toBe(
      "Usamos seu e-mail apenas para acessar sua conta e enviar avisos importantes sobre o seu plano (ex.: confirmação, atualizações relevantes ou lembrete pontual). Não enviamos newsletter nem marketing contínuo. Você pode sair quando quiser."
    );
    expect(PT["privacy.terms.title"]).toMatch(/planejamento, não consultoria/);
    expect(TERMS_BODY.toLowerCase()).toContain("planejamento educativo");
    expect(TERMS_BODY.toLowerCase()).toContain("não consultoria");
  });

  it("requires age and country and stores them without granting a plan", () => {
    expect(parseSignupLead({ email: "ada@example.com" })).toBeNull();
    expect(parseSignupLead({ age: 17, country: "BR" })).toBeNull();
    expect(parseSignupLead({ age: 42, country: "BR" })).toEqual({
      age: 42,
      country: "BR",
    });

    const directory = createMemoryDirectory();
    const now = Date.parse("2026-10-15T12:00:00Z");
    const token = directory.issueMagicLink("ada@example.com", now, {
      age: 42,
      country: "BR",
    });
    const user = directory.completeMagicLink(token, now + 1000);
    expect(user?.planTier).toBe("free");
    expect(user?.leadAge).toBe(42);
    expect(user?.preferredCountry).toBe("BR");
    expect(directory.savePlan(user!.id, { kpis: DEFAULT_KPI_VALUES })).toBeNull();
  });
});

describe("formatted pdf", () => {
  it("is a PDF that says this is planning, not advice", () => {
    const bytes = buildFormattedPlanPdf({
      kpis: DEFAULT_KPI_VALUES,
      currency: "BRL",
      projections: [],
      portfolio: [],
      simulationIncludedAssetIds: [],
      monteCarlo: { hasRun: false, lastRunAt: null, results: [] },
      stressTestResults: [],
      user: DEFAULT_USER,
    });
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("%PDF")).toBe(true);
    expect(text).toContain("planejamento, nao consultoria");
  });
});
