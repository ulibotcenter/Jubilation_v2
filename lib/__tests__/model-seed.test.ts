import { describe, expect, it } from "vitest";
import { createModelSeed, emptyHoldings, isModelSeedPortfolio } from "@/lib/onboarding/seed";
import { partializePersistedState } from "@/lib/persist/partialize";
import { migratePersistedState } from "@/lib/persist/migrate";
import { mergePersistedAppState, useAppStore } from "@/store/useAppStore";
import { t } from "@/lib/i18n/messages";
import { MOCK_PORTFOLIO } from "@/types";

describe("model seed and Clear all", () => {
  it("keeps the labeled example book short and diverse", () => {
    const seed = createModelSeed();
    expect(seed.length).toBeLessThanOrEqual(12);
    const classes = new Set(seed.map((a) => a.assetClass));
    expect(classes.has("stocks")).toBe(true);
    expect(classes.has("bonds")).toBe(true);
    expect(classes.has("real_estate")).toBe(true);
    expect(seed.filter((a) => a.assetClass === "real_estate")).toHaveLength(1);
    expect(
      seed.some((a) => /watch|rolex|rel[oó]gio/i.test(`${a.name} ${a.ticker}`))
    ).toBe(false);
  });

  it("trims the leftover lifestyle demo (watch, extra house, duplicates)", () => {
    expect(MOCK_PORTFOLIO.length).toBeLessThanOrEqual(12);
    expect(MOCK_PORTFOLIO.some((a) => a.id === "asset-watch")).toBe(false);
    expect(MOCK_PORTFOLIO.some((a) => a.id === "asset-lambo")).toBe(false);
    expect(MOCK_PORTFOLIO.some((a) => a.id === "asset-home-beach")).toBe(false);
    expect(MOCK_PORTFOLIO.some((a) => a.ticker === "AAPL34")).toBe(false);
    expect(
      MOCK_PORTFOLIO.filter((a) => a.assetClass === "real_estate")
    ).toHaveLength(1);
    expect(MOCK_PORTFOLIO.some((a) => a.assetClass === "stocks")).toBe(true);
    expect(MOCK_PORTFOLIO.some((a) => a.assetClass === "bonds")).toBe(true);
  });

  it("seeds Apple, Bitcoin, Tesouro, one ETF, listed SPCX, and a house", () => {
    const seed = createModelSeed();
    expect(isModelSeedPortfolio(seed)).toBe(true);
    const byId = Object.fromEntries(seed.map((a) => [a.id, a]));
    expect(byId["seed-aapl"]?.ticker).toBe("AAPL");
    expect(byId["seed-btc"]?.ticker).toBe("BTC");
    expect(byId["seed-tesouro"]?.name).toMatch(/Tesouro/i);
    expect(byId["seed-tesouro"]?.currency).toBe("BRL");
    expect(byId["seed-spy"]?.assetClass).toBe("etf");
    expect(byId["seed-spacex"]?.name).toBe("SpaceX");
    expect(byId["seed-spacex"]?.ticker).toBe("SPCX");
    expect(byId["seed-spacex"]?.listing).toBe("listed");
    expect(byId["seed-spacex"]?.assetClass).toBe("stocks");
    expect(byId["seed-spacex"]?.currentPrice).toBe(152.71);
    expect(byId["seed-spacex"]?.costBasis).toBe(135);
    expect(byId["seed-home"]?.assetClass).toBe("real_estate");
    expect(byId["seed-home"]?.listing).toBe("unlisted");
    expect(seed.some((a) => a.listing === "unlisted")).toBe(true);
    expect(t("pt", "portfolio.model.banner").toLowerCase()).toMatch(/exemplo/);
    expect(t("en", "portfolio.model.banner").toLowerCase()).toMatch(/example/);
    expect(t("pt", "portfolio.clearAll")).toBe("Zerar tudo");
    expect(t("en", "portfolio.clearAll")).toBe("Clear all");
    expect(t("es", "portfolio.clearAll")).toBe("Vaciar todo");
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

  it("reload merge keeps a completed gate and an empty cleared book", () => {
    const current = useAppStore.getState();
    const merged = mergePersistedAppState(
      {
        locale: "en",
        currency: "USD",
        country: "US",
        modelSeedActive: false,
        onboarding: {
          completed: true,
          currentStep: 2,
          disclaimerAccepted: true,
        },
        portfolio: [],
        simulationIncludedAssetIds: [],
        kpis: { currentAge: 42, retirementAge: 90 },
      },
      current
    );
    expect(merged.portfolio).toEqual([]);
    expect(merged.modelSeedActive).toBe(false);
    expect(merged.onboarding.completed).toBe(true);
    expect(merged.currency).toBe("USD");
    expect(merged.country).toBe("US");
    expect(isModelSeedPortfolio(merged.portfolio)).toBe(false);
  });
});
