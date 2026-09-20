import { describe, expect, it } from "vitest";
import { migratePersistedState } from "@/lib/persist/migrate";
import { partializePersistedState } from "@/lib/persist/partialize";
import { createPerson, defaultHousehold } from "@/lib/engine/household";

describe("persist migrate", () => {
  it("never replaces a user portfolio with the demo seed", () => {
    const userPortfolio = [
      {
        id: "asset-user-1",
        ticker: "PETR4",
        name: "Petrobras",
        assetClass: "stocks",
        quantity: 10,
        currentPrice: 38,
        costBasis: 30,
        currency: "BRL",
        allocation: 100,
      },
    ];
    const next = migratePersistedState(
      {
        demoSeedVersion: 2,
        kpis: { currentAge: 51, expectedCAGR: 12 },
        portfolio: userPortfolio,
        planTier: "monthly",
      },
      0
    );
    expect((next.portfolio as typeof userPortfolio)[0]?.ticker).toBe("PETR4");
    expect((next.kpis as { currentAge: number }).currentAge).toBe(51);
    expect(next.planTier).toBe("premium");
    expect((next.tenant as { id: string; dataRegion: string }).id).toBe(
      "b2c-default"
    );
    expect((next.tenant as { dataRegion: string }).dataRegion).toBe("eu");
    expect(next.household).toBeUndefined();
  });

  it("keeps an explicit br tenant region without rewriting it to eu", () => {
    const next = migratePersistedState(
      { tenant: { dataRegion: "br" }, kpis: { currentAge: 40 } },
      0
    );
    const tenant = next.tenant as { id: string; dataRegion: string };
    expect(tenant.id).toBe("b2c-default");
    expect(tenant.dataRegion).toBe("br");
  });

  it("maps yearly → horizon and keeps free as free", () => {
    expect(migratePersistedState({ planTier: "yearly" }, 0).planTier).toBe(
      "horizon"
    );
    expect(migratePersistedState({ planTier: "free" }, 0).planTier).toBe("free");
  });

  it("does not invent a manual tax rate when none was persisted", () => {
    const next = migratePersistedState({ kpis: { currentAge: 40 } }, 0);
    expect(next.manualEffectiveTaxRatePct).toBeNull();
  });

  it("does not invent a portfolio when none was persisted", () => {
    const next = migratePersistedState({ kpis: { currentAge: 40 } }, 0);
    expect(next.portfolio).toBeUndefined();
  });

  it("keeps an explicitly empty portfolio empty", () => {
    const next = migratePersistedState(
      { kpis: { currentAge: 48, monthlyContribution: 600 }, portfolio: [] },
      0
    );
    expect(next.portfolio).toEqual([]);
  });

  it("keeps the named user and the spouse through migrate", () => {
    const asOf = "2026-01-01";
    const household = defaultHousehold(asOf, "1976-06-01", "F");
    household.scope = "both";
    household.marriageDate = "2005-03-12";
    household.spouse = createPerson({
      role: "spouse",
      displayName: "João Silva",
      sex: "M",
      birthDate: "1974-02-01",
      asOf,
    });
    const next = migratePersistedState(
      {
        user: {
          id: "u-maria",
          name: "Maria Silva",
          email: "maria@example.com",
          avatarUrl: null,
          plan: "free",
          subscriptionStatus: "none",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        household,
        kpis: { currentAge: 50 },
      },
      1
    );
    expect((next.user as { name: string }).name).toBe("Maria Silva");
    const kept = next.household as typeof household;
    expect(kept.scope).toBe("both");
    expect(kept.spouse?.displayName).toBe("João Silva");
    expect(kept.marriageDate).toBe("2005-03-12");
  });
});

describe("persist partialize", () => {
  it("writes user and household so the spouse card survives reload", () => {
    const asOf = "2026-01-01";
    const household = defaultHousehold(asOf, "1976-06-01", "F");
    household.spouse = createPerson({
      role: "spouse",
      displayName: "João Silva",
      sex: "M",
      birthDate: "1974-02-01",
      asOf,
    });
    const user = {
      id: "u-maria",
      name: "Maria Silva",
      email: "maria@example.com",
      avatarUrl: null,
      plan: "free" as const,
      subscriptionStatus: "none" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const persisted = partializePersistedState({
      locale: "pt",
      currency: "BRL",
      country: "BR",
      manualEffectiveTaxRatePct: null,
      modelSeedActive: false,
      fxSnapshot: null,
      onboarding: { completed: true },
      sidebarCollapsed: false,
      persistVersion: 1,
      tenant: { dataRegion: "br" },
      institutions: [],
      accounts: [],
      cashFlows: [],
      entitlements: [],
      consents: [],
      consentAuditLog: [],
      connectorSync: {},
      household,
      user,
      explainSimple: false,
      theme: "dark",
      coachMarksDismissed: false,
      sensitivity: { cagr: null, inflation: null },
      netWorthSnapshots: [],
      aiChatHistory: [],
      savedScenarios: [],
      kpis: { currentAge: 50 },
      kpiOutsidePortfolio: 0,
      portfolio: [],
      portfolioLastRefreshedAt: null,
      simulationIncludedAssetIds: [],
      monteCarlo: { hasRun: false },
      simPlayground: {},
    });
    expect(Object.keys(persisted)).toEqual(
      expect.arrayContaining(["user", "household"])
    );
    expect(persisted.user).toEqual(user);
    expect(persisted.household).toEqual(household);
    expect((persisted.household as typeof household).spouse?.displayName).toBe(
      "João Silva"
    );
  });

  it("never persists a paid plan from the client", () => {
    const persisted = partializePersistedState({
      locale: "pt",
      currency: "BRL",
      country: "BR",
      manualEffectiveTaxRatePct: null,
      modelSeedActive: false,
      fxSnapshot: null,
      onboarding: { completed: true },
      sidebarCollapsed: false,
      persistVersion: 1,
      tenant: { dataRegion: "eu" },
      institutions: [],
      accounts: [],
      cashFlows: [],
      entitlements: [],
      consents: [],
      consentAuditLog: [],
      connectorSync: {},
      household: defaultHousehold("2026-01-01", "1976-06-01", "F"),
      user: {
        id: "u-maria",
        name: "Maria Silva",
        email: "maria@example.com",
        avatarUrl: null,
        plan: "premium" as const,
        subscriptionStatus: "active" as const,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      explainSimple: false,
      theme: "dark",
      coachMarksDismissed: false,
      sensitivity: { cagr: null, inflation: null },
      netWorthSnapshots: [],
      aiChatHistory: [],
      savedScenarios: [],
      kpis: { currentAge: 50 },
      kpiOutsidePortfolio: 0,
      portfolio: [],
      portfolioLastRefreshedAt: null,
      simulationIncludedAssetIds: [],
      monteCarlo: { hasRun: false },
      simPlayground: {},
    });
    expect(persisted.planTier).toBe("free");
  });
});
