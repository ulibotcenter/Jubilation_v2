import { describe, expect, it } from "vitest";
import { buildProjectionEngineConfig } from "@/lib/projectionEngine";
import { applyIrpfHoldings } from "@/lib/connectors/irpf/map";
import { mapAllowlistedB3 } from "@/lib/connectors/b3/map";
import { allowlistB3Payload } from "@/lib/connectors/b3/allowlist";
import { B3_FIXTURE_AS_OF, B3_FIXTURE_RAW } from "@/lib/connectors/b3/fixture";
import { reconcileHoldings } from "@/lib/connectors/reconcile";
import {
  buildOriginTotals,
  canonicalOrigin,
  holdingProjectableMajor,
  isEngineIncludedByDefault,
  isProjectable,
  originOf,
  projectablePortfolioValue,
} from "@/lib/holdings/origin";
import {
  createModelSeed,
  dropSeedIfUserHoldings,
  isModelSeedPortfolio,
} from "@/lib/onboarding/seed";
import { migratePersistedState } from "@/lib/persist/migrate";
import { normalizePortfolioAssets } from "@/lib/engine/liquidity";
import { createModelSeed as seedAgain } from "@/lib/onboarding/seed";
import { mergePersistedAppState, useAppStore } from "@/store/useAppStore";
import { normalizeKpiValues, type PortfolioAsset } from "@/types";

function holding(partial: Partial<PortfolioAsset> & Pick<PortfolioAsset, "id" | "ticker">): PortfolioAsset {
  return {
    name: partial.name ?? partial.ticker,
    assetClass: partial.assetClass ?? "stocks",
    quantity: partial.quantity ?? 10,
    currentPrice: partial.currentPrice ?? 100,
    costBasis: partial.costBasis ?? 80,
    currency: partial.currency ?? "BRL",
    nativeCurrency: partial.nativeCurrency ?? "BRL",
    allocation: 0,
    ...partial,
  };
}

describe("origin aliases and migration", () => {
  it("maps imported_file to irpf and never mixes origins", () => {
    expect(canonicalOrigin("imported_file")).toBe("irpf");
    expect(canonicalOrigin("FILE_IRPF")).toBe("irpf");
    expect(canonicalOrigin("B3_API")).toBe("b3");
    expect(canonicalOrigin("MANUAL")).toBe("manual");
    expect(canonicalOrigin("YAHOO")).toBeNull();
    const row = holding({
      id: "asset-user-1",
      ticker: "PETR4",
      source: "imported_file" as never,
    });
    const [migrated] = normalizePortfolioAssets([row]);
    expect(migrated.origin).toBe("irpf");
    expect(migrated.valueType).toBe("cost");
    expect(migrated.asOf).toBeTruthy();
  });

  it("migrates an untagged persisted holding to manual + user_estimate", () => {
    const next = migratePersistedState(
      {
        kpis: { currentAge: 51 },
        portfolio: [
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
        ],
      },
      1
    );
    const petr = (next.portfolio as PortfolioAsset[])[0];
    expect(petr.origin).toBe("manual");
    expect(petr.valueType).toBe("user_estimate");
    expect(petr.asOf).toBeTruthy();
  });
});

describe("merge precedence b3 > irpf > manual", () => {
  it("B3 market value wins the same ticker over IRPF and manual", () => {
    const manual = holding({
      id: "manual-petr",
      ticker: "PETR4",
      origin: "manual",
      source: "MANUAL",
      valueType: "user_estimate",
      currentPrice: 30,
      quantity: 10,
      expectedCAGR: 9.1,
      asOf: "2026-01-01",
    });
    const irpf = holding({
      id: "irpf-petr",
      ticker: "PETR4",
      origin: "irpf",
      source: "FILE_IRPF",
      valueType: "cost",
      currentPrice: 32,
      quantity: 10,
      asOf: "2024-12-31",
    });
    const afterIrpf = applyIrpfHoldings({
      existing: [manual],
      incoming: [irpf],
    });
    expect(afterIrpf).toHaveLength(1);
    expect(originOf(afterIrpf[0]!)).toBe("irpf");
    expect(afterIrpf[0]!.currentPrice).toBe(32);

    const allowlisted = allowlistB3Payload(B3_FIXTURE_RAW, B3_FIXTURE_AS_OF);
    const incoming = mapAllowlistedB3(allowlisted);
    const afterB3 = reconcileHoldings({
      existing: afterIrpf,
      incoming: incoming.holdings,
      institutions: incoming.institutions,
      accounts: incoming.accounts,
    });
    const petr = afterB3.portfolio.find((a) => a.ticker === "PETR4")!;
    expect(originOf(petr)).toBe("b3");
    expect(petr.valueType).toBe("market");
    expect(petr.quantity).toBe(200);
    expect(petr.currentPrice).toBe(38.12);
    expect(petr.expectedCAGR).toBe(9.1);
    expect(afterB3.portfolio.filter((a) => a.ticker === "PETR4")).toHaveLength(1);
  });

  it("IRPF does not overwrite an existing B3 line", () => {
    const b3 = holding({
      id: "b3-vale",
      ticker: "VALE3",
      origin: "b3",
      source: "B3_API",
      valueType: "market",
      currentPrice: 62.4,
      quantity: 100,
      asOf: "2026-09-18",
    });
    const irpf = holding({
      id: "irpf-vale",
      ticker: "VALE3",
      origin: "irpf",
      source: "FILE_IRPF",
      valueType: "cost",
      currentPrice: 50,
      quantity: 80,
      asOf: "2024-12-31",
    });
    const next = applyIrpfHoldings({ existing: [b3], incoming: [irpf] });
    expect(next).toHaveLength(1);
    expect(originOf(next[0]!)).toBe("b3");
    expect(next[0]!.currentPrice).toBe(62.4);
  });

  it("matches the same issuer by CNPJ when tickers differ in spelling", () => {
    const manual = holding({
      id: "manual-cdb",
      ticker: "CDB INTER",
      origin: "manual",
      source: "MANUAL",
      cnpj: "00416968000101",
      currentPrice: 20_000,
      quantity: 1,
    });
    const b3 = holding({
      id: "b3-cdb",
      ticker: "CDB-INT",
      origin: "b3",
      source: "B3_API",
      valueType: "market",
      cnpj: "00.416.968/0001-01",
      currentPrice: 25_000,
      quantity: 1,
      asOf: "2026-09-18",
    });
    const result = reconcileHoldings({
      existing: [manual],
      incoming: [b3],
      institutions: [],
      accounts: [],
    });
    expect(result.portfolio).toHaveLength(1);
    expect(result.portfolio[0]!.id).toBe("manual-cdb");
    expect(originOf(result.portfolio[0]!)).toBe("b3");
    expect(result.portfolio[0]!.currentPrice).toBe(25_000);
  });

  it("maps B3 holdings as holder-only with origin b3 and market value", () => {
    const mapped = mapAllowlistedB3(
      allowlistB3Payload(B3_FIXTURE_RAW, B3_FIXTURE_AS_OF)
    );
    expect(mapped.holdings.length).toBeGreaterThan(0);
    expect(mapped.holdings.every((h) => h.ownership === "holder")).toBe(true);
    expect(mapped.holdings.every((h) => originOf(h) === "b3")).toBe(true);
    expect(mapped.holdings.every((h) => h.valueType === "market")).toBe(true);
    expect(mapped.holdings.some((h) => h.ownership === "joint")).toBe(false);
  });
});

describe("seed clears on the first real holding", () => {
  it("keeps the model while there is no manual / b3 / irpf row", () => {
    const seed = createModelSeed();
    expect(isModelSeedPortfolio(seed)).toBe(true);
    expect(dropSeedIfUserHoldings(seed)).toEqual(seed);
    expect(seed.every((row) => originOf(row) === null)).toBe(true);
  });

  it("drops every seed row as soon as one user holding exists", () => {
    const mixed = [
      ...createModelSeed(),
      holding({
        id: "asset-user-petr",
        ticker: "PETR4",
        origin: "manual",
        source: "MANUAL",
        valueType: "user_estimate",
      }),
    ];
    const next = dropSeedIfUserHoldings(mixed);
    expect(next).toHaveLength(1);
    expect(next[0]!.ticker).toBe("PETR4");
    expect(isModelSeedPortfolio(next)).toBe(false);
  });

  it("addPortfolioAsset on the store hides the seed", () => {
    useAppStore.setState({
      portfolio: createModelSeed(),
      simulationIncludedAssetIds: createModelSeed().map((a) => a.id),
      modelSeedActive: true,
    });
    useAppStore.getState().addPortfolioAsset(
      holding({
        id: "asset-first-real",
        ticker: "WEGE3",
        origin: "manual",
        source: "MANUAL",
        valueType: "user_estimate",
        asOf: "2026-09-20",
      })
    );
    const state = useAppStore.getState();
    expect(state.modelSeedActive).toBe(false);
    expect(state.portfolio.some((a) => a.id.startsWith("seed-"))).toBe(false);
    expect(state.portfolio.some((a) => a.ticker === "WEGE3")).toBe(true);
  });

  it("reload of a seed-only book does not invent an empty first visit", () => {
    const seed = seedAgain();
    const merged = mergePersistedAppState(
      { portfolio: seed, modelSeedActive: true, kpis: { currentAge: 40 } },
      useAppStore.getState()
    );
    expect(isModelSeedPortfolio(merged.portfolio)).toBe(true);
    expect(merged.portfolio.length).toBeGreaterThan(0);
  });

  it("migrates a v1 seed book (Tesouro/CASA MANUAL) and keeps the model until WEGE3", () => {
    const v1Seed = [
      {
        id: "seed-aapl",
        ticker: "AAPL",
        name: "Apple Inc.",
        assetClass: "stocks",
        quantity: 40,
        currentPrice: 198.75,
        costBasis: 145.2,
        currency: "USD",
        allocation: 0,
        source: "YAHOO",
      },
      {
        id: "seed-btc",
        ticker: "BTC",
        name: "Bitcoin",
        assetClass: "crypto",
        quantity: 0.75,
        currentPrice: 67_500,
        costBasis: 41_200,
        currency: "USD",
        allocation: 0,
        source: "COINGECKO",
      },
      {
        id: "seed-tesouro",
        ticker: "TESOURO",
        name: "Tesouro IPCA+",
        assetClass: "bonds",
        quantity: 80,
        currentPrice: 1_150,
        costBasis: 980,
        currency: "BRL",
        allocation: 0,
        source: "MANUAL",
      },
      {
        id: "seed-spy",
        ticker: "SPY",
        name: "SPDR S&P 500 ETF Trust",
        assetClass: "etf",
        quantity: 18,
        currentPrice: 542.18,
        costBasis: 412.5,
        currency: "USD",
        allocation: 0,
        source: "YAHOO",
      },
      {
        id: "seed-spacex",
        ticker: "SPCX",
        name: "SpaceX",
        assetClass: "stocks",
        quantity: 315,
        currentPrice: 152.71,
        costBasis: 135,
        currency: "USD",
        allocation: 0,
        source: "YAHOO",
      },
      {
        id: "seed-home",
        ticker: "CASA",
        name: "Apartamento — São Paulo",
        assetClass: "real_estate",
        quantity: 1,
        currentPrice: 850_000,
        costBasis: 620_000,
        currency: "BRL",
        allocation: 0,
        source: "MANUAL",
      },
    ];
    const migrated = migratePersistedState(
      {
        kpis: { currentAge: 48 },
        portfolio: v1Seed,
        modelSeedActive: true,
      },
      1
    );
    const book = migrated.portfolio as PortfolioAsset[];
    expect(book).toHaveLength(6);
    expect(isModelSeedPortfolio(book)).toBe(true);
    expect(book.every((row) => originOf(row) === null)).toBe(true);
    expect(book.find((row) => row.id === "seed-tesouro")?.source).toBe("MANUAL");
    expect(book.find((row) => row.id === "seed-home")?.source).toBe("MANUAL");
    expect(book.some((row) => row.origin === "manual")).toBe(false);

    const withWege = dropSeedIfUserHoldings([
      ...book,
      holding({
        id: "asset-wege3",
        ticker: "WEGE3",
        origin: "manual",
        source: "MANUAL",
        valueType: "user_estimate",
        asOf: "2026-09-20",
      }),
    ]);
    expect(withWege).toHaveLength(1);
    expect(withWege[0]!.ticker).toBe("WEGE3");
    expect(isModelSeedPortfolio(withWege)).toBe(false);
  });
});

describe("engine ignores IRPF cost, B3 cashFlows, gravame and derivatives", () => {
  const quote = {
    currency: "BRL" as const,
    rates: { BRL: 1, USD: 1, EUR: 1 },
  };

  it("does not treat IRPF 31/12 cost as today's wealth", () => {
    const irpfHome = holding({
      id: "irpf-home",
      ticker: "CASA",
      name: "Apto",
      assetClass: "real_estate",
      origin: "irpf",
      source: "FILE_IRPF",
      valueType: "cost",
      quantity: 1,
      currentPrice: 850_000,
      asOf: "2024-12-31",
    });
    const b3 = holding({
      id: "b3-petr",
      ticker: "PETR4",
      origin: "b3",
      source: "B3_API",
      valueType: "market",
      quantity: 100,
      currentPrice: 40,
    });
    expect(isProjectable(irpfHome)).toBe(false);
    expect(holdingProjectableMajor(irpfHome)).toBe(0);
    expect(projectablePortfolioValue([irpfHome, b3], quote)).toBe(4_000);

    const kpis = normalizeKpiValues({
      currentNetWorth: 0,
      monthlyContribution: 1_500,
    });
    const cfg = buildProjectionEngineConfig(
      kpis,
      [irpfHome, b3],
      [irpfHome.id, b3.id],
      0,
      quote
    );
    expect(cfg.plan.liquidCents + cfg.plan.illiquidCents).toBe(400_000);
    expect(cfg.plan.monthlyContributionCents).toBe(150_000);
  });

  it("never plugs persisted B3 cashFlows into the contribution", () => {
    const kpis = normalizeKpiValues({
      currentNetWorth: 10_000,
      monthlyContribution: 2_000,
    });
    const cfg = buildProjectionEngineConfig(kpis, [], [], 10_000, quote);
    expect(cfg.plan.monthlyContributionCents).toBe(200_000);
    expect(cfg.kpis.monthlyContribution).toBe(2_000);
  });

  it("shows gravame but subtracts it from projectable net", () => {
    const pledged = holding({
      id: "b3-pledged",
      ticker: "VALE3",
      origin: "b3",
      source: "B3_API",
      valueType: "market",
      quantity: 100,
      currentPrice: 60,
      gravameValue: 1_200,
    });
    expect(pledged.quantity * pledged.currentPrice).toBe(6_000);
    expect(holdingProjectableMajor(pledged)).toBe(4_800);
    const totals = buildOriginTotals([pledged], quote);
    expect(totals.b3.value).toBe(6_000);
    const cfg = buildProjectionEngineConfig(
      normalizeKpiValues({ monthlyContribution: 0 }),
      [pledged],
      [pledged.id],
      0,
      quote
    );
    expect(cfg.plan.liquidCents).toBe(480_000);
  });

  it("keeps derivatives out of the engine unless the user opts in", () => {
    const option = holding({
      id: "b3-opt",
      ticker: "PETRK22",
      assetClass: "derivatives",
      origin: "b3",
      source: "B3_API",
      valueType: "market",
      quantity: 100,
      currentPrice: 2.5,
    });
    expect(isEngineIncludedByDefault(option)).toBe(false);
    expect(projectablePortfolioValue([option], quote)).toBe(0);
    const opted = { ...option, includeInEngine: true };
    expect(isEngineIncludedByDefault(opted)).toBe(true);
    expect(holdingProjectableMajor(opted)).toBe(250);
    const cfg = buildProjectionEngineConfig(
      normalizeKpiValues({ monthlyContribution: 0 }),
      [option],
      [option.id],
      0,
      quote
    );
    expect(cfg.plan.liquidCents).toBe(0);
  });
});
