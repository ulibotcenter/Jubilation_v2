import { describe, expect, it } from "vitest";
import { migratePersistedState } from "@/lib/persist/migrate";

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
    expect((next.tenant as { dataRegion: string }).dataRegion).toBe("eu");
  });

  it("maps yearly → horizon and keeps free as free", () => {
    expect(migratePersistedState({ planTier: "yearly" }, 0).planTier).toBe(
      "horizon"
    );
    expect(migratePersistedState({ planTier: "free" }, 0).planTier).toBe("free");
  });

  it("does not invent a portfolio when none was persisted", () => {
    const next = migratePersistedState({ kpis: { currentAge: 40 } }, 0);
    expect(next.portfolio).toBeUndefined();
  });
});
