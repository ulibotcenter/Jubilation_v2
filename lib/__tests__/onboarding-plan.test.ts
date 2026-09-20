import { describe, expect, it } from "vitest";
import { createPerson, householdFromKpis } from "@/lib/engine/household";
import {
  emptyHoldings,
  householdFromOnboarding,
  kpisFromOnboarding,
} from "@/lib/onboarding/plan";
import { DEFAULT_LIFE_EXPECTANCY } from "@/types";
import { partializePersistedState } from "@/lib/persist/partialize";

describe("onboarding plan", () => {
  it("maps country, locale, currency, age and target retirement 90 — no salary", () => {
    const kpis = kpisFromOnboarding({
      country: "US",
      locale: "en",
      currency: "USD",
      age: 52,
      retirementAge: 90,
    });
    expect(kpis.currentAge).toBe(52);
    expect(kpis.retirementAge).toBe(90);
    expect(kpis.lifeExpectancy).toBe(DEFAULT_LIFE_EXPECTANCY);
    expect(kpis.monthlyExpenses).toBe(0);
    expect(kpis.monthlyContribution).toBe(0);
    expect(kpis.desiredMonthlyIncome).toBe(0);
    expect(kpis.currentNetWorth).toBe(0);
  });

  it("keeps retirement after current age when the person is already older", () => {
    const kpis = kpisFromOnboarding({
      country: "BR",
      locale: "pt",
      currency: "BRL",
      age: 70,
      retirementAge: 90,
    });
    expect(kpis.currentAge).toBe(70);
    expect(kpis.retirementAge).toBeGreaterThan(70);
    expect(kpis.lifeExpectancy).toBeGreaterThanOrEqual(kpis.retirementAge);
  });

  it("starts with empty holdings helper for Clear all", () => {
    expect(emptyHoldings()).toEqual([]);
  });

  it("builds a household from the typed age and keeps an existing spouse", () => {
    const asOf = "2026-01-01";
    const current = householdFromKpis(
      { currentAge: 40, lifeExpectancy: 90 },
      asOf
    );
    current.scope = "both";
    current.spouse = createPerson({
      role: "spouse",
      displayName: "Ana Costa",
      sex: "F",
      birthDate: "1978-04-01",
      asOf,
    });

    const next = householdFromOnboarding(
      {
        country: "BR",
        locale: "pt",
        currency: "BRL",
        age: 52,
        retirementAge: 90,
      },
      asOf,
      current
    );

    expect(next.scope).toBe("both");
    expect(next.spouse?.displayName).toBe("Ana Costa");
    expect(next.holder.displayName).toBe("Você");
    expect(next.holder.birthDate).toBe("1974-01-01");
    expect(next.holder.lifeExpectancy).toBe(90);
  });

  it("partializes country, locale, currency and empty clear so they survive reload", () => {
    const asOf = "2026-01-01";
    const household = householdFromOnboarding(
      {
        country: "US",
        locale: "en",
        currency: "USD",
        age: 48,
        retirementAge: 90,
      },
      asOf
    );
    const persisted = partializePersistedState({
      locale: "en",
      currency: "USD",
      country: "US",
      manualEffectiveTaxRatePct: 22,
      modelSeedActive: false,
      fxSnapshot: null,
      onboarding: { completed: true, currentStep: 2, disclaimerAccepted: true },
      sidebarCollapsed: false,
      persistVersion: 1,
      tenant: { dataRegion: "eu" },
      institutions: [],
      accounts: [],
      entitlements: [],
      consents: [],
      consentAuditLog: [],
      connectorSync: {},
      household,
      user: {
        id: "local-user",
        name: "Você",
        email: "",
        avatarUrl: null,
        plan: "free",
        subscriptionStatus: "none",
        createdAt: asOf,
      },
      explainSimple: false,
      theme: "light",
      coachMarksDismissed: false,
      sensitivity: { cagr: null, inflation: null },
      netWorthSnapshots: [],
      aiChatHistory: [],
      savedScenarios: [],
      kpis: kpisFromOnboarding({
        country: "US",
        locale: "en",
        currency: "USD",
        age: 48,
        retirementAge: 90,
      }),
      kpiOutsidePortfolio: 0,
      portfolio: [],
      portfolioLastRefreshedAt: null,
      simulationIncludedAssetIds: [],
      monteCarlo: { hasRun: false },
      simPlayground: {},
    });

    expect(persisted.onboarding).toEqual({
      completed: true,
      currentStep: 2,
      disclaimerAccepted: true,
    });
    expect(persisted.portfolio).toEqual([]);
    expect(persisted.country).toBe("US");
    expect(persisted.manualEffectiveTaxRatePct).toBe(22);
    expect(persisted.currency).toBe("USD");
    expect(persisted.locale).toBe("en");
    expect(persisted.modelSeedActive).toBe(false);
    expect((persisted.kpis as { monthlyContribution: number }).monthlyContribution).toBe(
      0
    );
  });
});
