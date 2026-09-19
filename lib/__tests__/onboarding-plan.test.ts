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
  it("maps the four fields into KPIs a Brazilian typed, with longevity 90", () => {
    const kpis = kpisFromOnboarding({
      age: 52,
      income: 12_000,
      contribution: 1_500,
      lifeExpectancy: 90,
    });
    expect(kpis.currentAge).toBe(52);
    expect(kpis.monthlyExpenses).toBe(12_000);
    expect(kpis.desiredMonthlyIncome).toBe(12_000);
    expect(kpis.monthlyContribution).toBe(1_500);
    expect(kpis.lifeExpectancy).toBe(DEFAULT_LIFE_EXPECTANCY);
    expect(kpis.retirementAge).toBe(65);
    expect(kpis.currentNetWorth).toBe(0);
  });

  it("pushes retirement past current age when the person is already older than 65", () => {
    const kpis = kpisFromOnboarding({
      age: 70,
      income: 8_000,
      contribution: 0,
      lifeExpectancy: 90,
    });
    expect(kpis.currentAge).toBe(70);
    expect(kpis.retirementAge).toBeGreaterThan(70);
    expect(kpis.lifeExpectancy).toBeGreaterThan(kpis.retirementAge);
  });

  it("starts with empty holdings — no Lamborghini seed", () => {
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
        age: 52,
        income: 10_000,
        contribution: 800,
        lifeExpectancy: 90,
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

  it("partializes onboarding answers so household survives reload", () => {
    const asOf = "2026-01-01";
    const household = householdFromOnboarding(
      {
        age: 48,
        income: 9_000,
        contribution: 600,
        lifeExpectancy: 90,
      },
      asOf
    );
    const persisted = partializePersistedState({
      locale: "pt",
      currency: "BRL",
      fxSnapshot: null,
      onboarding: { completed: true, currentStep: 2, disclaimerAccepted: true },
      sidebarCollapsed: false,
      persistVersion: 1,
      tenant: { dataRegion: "eu" },
      institutions: [],
      accounts: [],
      entitlements: [],
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
        age: 48,
        income: 9_000,
        contribution: 600,
        lifeExpectancy: 90,
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
    expect((persisted.household as typeof household).holder.displayName).toBe(
      "Você"
    );
    expect((persisted.kpis as { monthlyContribution: number }).monthlyContribution).toBe(
      600
    );
    expect(persisted.locale).toBe("pt");
    expect(persisted.currency).toBe("BRL");
  });
});
