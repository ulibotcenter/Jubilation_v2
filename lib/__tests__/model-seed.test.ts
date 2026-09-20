import { describe, expect, it } from "vitest";
import { createModelSeed, emptyHoldings, isModelSeedPortfolio } from "@/lib/onboarding/seed";
import { partializePersistedState } from "@/lib/persist/partialize";
import { migratePersistedState } from "@/lib/persist/migrate";
import { useAppStore } from "@/store/useAppStore";

describe("model seed and Clear all", () => {
  it("seeds Apple, Bitcoin, Tesouro, one ETF, unlisted SpaceX, and a house", () => {
    const seed = createModelSeed();
    expect(isModelSeedPortfolio(seed)).toBe(true);
    const byId = Object.fromEntries(seed.map((a) => [a.id, a]));
    expect(byId["seed-aapl"]?.ticker).toBe("AAPL");
    expect(byId["seed-btc"]?.ticker).toBe("BTC");
    expect(byId["seed-tesouro"]?.name).toMatch(/Tesouro/i);
    expect(byId["seed-tesouro"]?.currency).toBe("BRL");
    expect(byId["seed-spy"]?.assetClass).toBe("etf");
    expect(byId["seed-spacex"]?.name).toBe("SpaceX");
    expect(byId["seed-spacex"]?.listing).toBe("unlisted");
    expect(byId["seed-spacex"]?.ticker).toBe("UNLISTED");
    expect(byId["seed-home"]?.assetClass).toBe("real_estate");
    expect(seed.some((a) => a.listing === "unlisted")).toBe(true);
  });

  it("Clear all wipes the seed and persist keeps the empty book", () => {
    useAppStore.setState({
      portfolio: createModelSeed(),
      simulationIncludedAssetIds: createModelSeed().map((a) => a.id),
      modelSeedActive: true,
    });
    expect(useAppStore.getState().portfolio.length).toBeGreaterThan(0);
    useAppStore.getState().clearPortfolio();
    const next = useAppStore.getState();
    expect(next.portfolio).toEqual([]);
    expect(next.modelSeedActive).toBe(false);
    expect(next.simulationIncludedAssetIds).toEqual([]);
    expect(isModelSeedPortfolio(next.portfolio)).toBe(false);
    expect(emptyHoldings()).toEqual([]);

    const persisted = partializePersistedState(next);
    expect(persisted.portfolio).toEqual([]);
    expect(persisted.modelSeedActive).toBe(false);
    const migrated = migratePersistedState(persisted, 1);
    expect(migrated.portfolio).toEqual([]);
  });

  it("does not re-seed an explicitly empty persisted portfolio", () => {
    const migrated = migratePersistedState(
      { kpis: { currentAge: 48 }, portfolio: [], modelSeedActive: false },
      1
    );
    expect(migrated.portfolio).toEqual([]);
    expect(migrated.modelSeedActive).toBe(false);
  });
});
