import { describe, expect, it } from "vitest";
import { addMoney, convertMoney, fromMajor, CurrencyMismatchError, MissingFxRateError, IdentityFxRatesError } from "@/lib/engine/money";
import { fisherReal, annualToMonthly } from "@/lib/engine/rates";
import { defaultPlan } from "@/lib/engine/plan";
import { projectPlan } from "@/lib/engine/project";
import { runMonteCarloFromPlan, runMonteCarloPlan } from "@/lib/engine/monteCarlo";
import { runStressOnPlan } from "@/lib/engine/stress";
import { solvePlan } from "@/lib/engine/solve";
import { shockReturn, mulberry32 } from "@/lib/engine/rng";
import { applyPortfolioCagrToKpis } from "@/lib/portfolioCagr";
import { calculatePortfolioValue, normalizeKpiValues } from "@/types";
import { buildProjectionEngineConfig } from "@/lib/projectionEngine";
import { buildPlaygroundProjections } from "@/lib/simulationPlayground";

const TOL_BRL = 2;

function fisherGrow(principal: number, nominal: number, inflation: number, years: number): number {
  const real = fisherReal(nominal, inflation);
  const rm = annualToMonthly(real);
  let v = Math.round(principal * 100);
  for (let m = 0; m < years * 12; m++) {
    v = Math.max(0, v + Math.round(v * rm));
  }
  return v / 100;
}

describe("M1 — no double deflation", () => {
  it("keeps inflationAdjusted equal to the real series", () => {
    const plan = defaultPlan({
      currentAge: 40,
      retirementAge: 65,
      lifeExpectancy: 65,
      liquidCents: 100_000_000,
      monthlyContributionCents: 0,
      monthlySpendingCents: 0,
      liquidRealReturn: fisherReal(0.1, 0.05),
      inflation: 0.05,
      applyTaxes: false,
    });
    const { years } = projectPlan(plan);
    const at65 = years.find((y) => y.age === 65)!;
    const expectedReal = fisherGrow(1_000_000, 0.1, 0.05, 25);
    expect(Math.abs(at65.portfolioValue - expectedReal)).toBeLessThan(TOL_BRL);
    expect(at65.inflationAdjusted).toBe(at65.portfolioValue);
    const inf = 1.05 ** 25;
    expect(at65.nominalValue).toBe(Math.round(at65.portfolioValue * inf));
    // Old engine showed ~964_564 by dividing a real series again.
    expect(at65.inflationAdjusted).toBeGreaterThan(2_500_000);
    expect(at65.inflationAdjusted / (at65.portfolioValue / inf)).toBeGreaterThan(3);
  });
});

describe("M2 — aggregated CAGR is not overwritten", () => {
  it("keeps a typed KPI CAGR when applyPortfolioCagrToKpis runs", () => {
    const kpis = normalizeKpiValues({ expectedCAGR: 25 });
    const next = applyPortfolioCagrToKpis(kpis, [
      {
        id: "etf-1",
        ticker: "BOVA11",
        name: "BOVA11",
        assetClass: "etf",
        quantity: 100,
        currentPrice: 100,
        costBasis: 80,
        currency: "BRL",
        allocation: 100,
      },
    ]);
    expect(next.expectedCAGR).toBe(25);
  });

  it("uses the typed 25% when there is no portfolio", () => {
    const plan = defaultPlan({
      liquidCents: 100_000_000,
      monthlyContributionCents: 0,
      monthlySpendingCents: 0,
      liquidRealReturn: fisherReal(0.25, 0.05),
      inflation: 0.05,
      currentAge: 40,
      retirementAge: 41,
      lifeExpectancy: 41,
    });
    const row = projectPlan(plan).years.find((y) => y.age === 41)!;
    const expected = fisherGrow(1_000_000, 0.25, 0.05, 1);
    expect(Math.abs(row.portfolioValue - expected)).toBeLessThan(TOL_BRL);
  });
});

describe("M3 — Monte Carlo has declared σ and tails", () => {
  it("realizes σ near 15% with crashes below -7.5%", () => {
    const rng = mulberry32(42);
    const samples: number[] = [];
    for (let i = 0; i < 40_000; i++) {
      samples.push(shockReturn(0, 0.15, rng, true));
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance =
      samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
    const sigma = Math.sqrt(variance);
    expect(sigma).toBeGreaterThan(0.12);
    expect(sigma).toBeLessThan(0.19);
    expect(Math.min(...samples)).toBeLessThan(-0.075);
    expect(Math.max(...samples)).toBeGreaterThan(0.075);
  });
});

describe("M4 — Monte Carlo simulates the withdrawal phase", () => {
  it("keeps paths through life expectancy, not just retirement", () => {
    const plan = defaultPlan({
      currentAge: 60,
      retirementAge: 65,
      lifeExpectancy: 90,
      liquidCents: 200_000_000,
      monthlySpendingCents: 800_000,
      liquidRealReturn: 0.04,
      inflation: 0.03,
    });
    const run = runMonteCarloPlan(plan, { iterations: 40, scenario: "base" });
    expect(run.pathsByAge.has(90)).toBe(true);
    expect(run.pathsByAge.has(65)).toBe(true);
    expect([...run.pathsByAge.keys()].sort((a, b) => a - b).at(-1)).toBe(90);
  });
});

describe("M5 — success is not netWorth × 25", () => {
  it("does not congratulate a zero plan", () => {
    const plan = defaultPlan({
      currentAge: 40,
      retirementAge: 65,
      lifeExpectancy: 90,
      liquidCents: 0,
      monthlySpendingCents: 0,
      monthlyLifestyleCents: 0,
    });
    const { results, target } = runMonteCarloFromPlan(plan, 50);
    expect(target).toBeNull();
    const base = results.find((r) => r.scenario === "base")!;
    expect(base.successRate).toBe(0);
  });

  it("targets 25× desired annual income", () => {
    const plan = defaultPlan({
      monthlySpendingCents: 1_000_000,
      monthlyLifestyleCents: 0,
      liquidCents: 0,
    });
    const { target } = runMonteCarloFromPlan(plan, 20);
    expect(target).toBe(3_000_000);
  });
});

describe("M6 — stress test uses spending, same engine, sequence risk", () => {
  it("does not use currentNetWorth × 25 as the target", () => {
    const plan = defaultPlan({
      currentAge: 40,
      retirementAge: 65,
      lifeExpectancy: 90,
      liquidCents: 100_000_000,
      monthlySpendingCents: 1_000_000,
      liquidRealReturn: 0.04,
    });
    const result = runStressOnPlan("market-crash", plan);
    expect(result.target).toBe(3_000_000);
    expect(result.shortfall).toBeLessThan(20_000_000);
  });

  it("does not mark a broke household as on track", () => {
    const plan = defaultPlan({
      liquidCents: 0,
      monthlySpendingCents: 1_000_000,
      currentAge: 64,
      retirementAge: 65,
      lifeExpectancy: 90,
    });
    const result = runStressOnPlan("market-crash", plan);
    expect(result.stillOnTrack).toBe(false);
  });
});

describe("M7 — mixed currency is converted", () => {
  it("converts USD into BRL instead of summing 40k+40k", () => {
    const assets = [
      {
        id: "br",
        ticker: "CASH-BRL",
        name: "Cash BRL",
        assetClass: "cash" as const,
        quantity: 1000,
        currentPrice: 40,
        costBasis: 40,
        currency: "BRL" as const,
        allocation: 50,
      },
      {
        id: "us",
        ticker: "CASH-USD",
        name: "Cash USD",
        assetClass: "cash" as const,
        quantity: 1000,
        currentPrice: 40,
        costBasis: 40,
        currency: "USD" as const,
        allocation: 50,
      },
    ];
    const total = calculatePortfolioValue(assets, {
      currency: "BRL",
      rates: { USD: 1, BRL: 5, EUR: 0.9 },
    });
    expect(total).toBe(240_000);
    expect(total).not.toBe(80_000);
  });

  it("refuses to add BRL money to USD money", () => {
    expect(() =>
      addMoney(
        fromMajor(40, "BRL", "real", "2026-01-01"),
        fromMajor(40, "USD", "real", "2026-01-01")
      )
    ).toThrow(CurrencyMismatchError);
  });

  it("converts at the boundary with an explicit rate", () => {
    const usd = fromMajor(40_000, "USD", "real", "2026-01-01");
    const brl = convertMoney(usd, "BRL", { USD: 1, BRL: 5, EUR: 0.9 });
    expect(brl.cents).toBe(20_000_000);
  });
});

describe("M7 — sandbox must not sum mixed FX at 1:1", () => {
  const mixed = [
    {
      id: "br",
      ticker: "CASH-BRL",
      name: "Cash BRL",
      assetClass: "cash" as const,
      quantity: 1000,
      currentPrice: 40,
      costBasis: 40,
      currency: "BRL" as const,
      nativeCurrency: "BRL" as const,
      allocation: 50,
    },
    {
      id: "us",
      ticker: "CASH-USD",
      name: "Cash USD",
      assetClass: "cash" as const,
      quantity: 1000,
      currentPrice: 40,
      costBasis: 40,
      currency: "USD" as const,
      nativeCurrency: "USD" as const,
      allocation: 50,
    },
  ];
  const kpis = normalizeKpiValues({ currentNetWorth: 80_000 });
  const ids = mixed.map((a) => a.id);

  it("refuses IDENTITY_RATES instead of reporting 80_000", () => {
    expect(() =>
      buildProjectionEngineConfig(kpis, mixed, ids, 0)
    ).toThrow(MissingFxRateError);
    expect(() =>
      buildProjectionEngineConfig(kpis, mixed, ids, 0, {
        currency: "BRL",
        rates: { USD: 1, BRL: 1, EUR: 1 },
      })
    ).toThrow(IdentityFxRatesError);
  });

  it("playground converts 1_000×40 BRL + 1_000×40 USD to 240_000 BRL", () => {
    // 40_000 BRL + 40_000 USD × 5 = 240_000. Old IDENTITY path summed 80_000.
    const built = buildPlaygroundProjections({
      kpis,
      portfolio: mixed,
      simulationIncludedAssetIds: ids,
      kpiOutsidePortfolio: 0,
      currency: "BRL",
      fxSnapshot: {
        base: "USD",
        date: "2026-01-01",
        fetchedAt: "2026-01-01T00:00:00.000Z",
        rates: { USD: 1, BRL: 5, EUR: 0.9 },
      },
    });
    expect(built.engineConfig.buckets.investable).toBe(240_000);
    expect(built.engineConfig.buckets.investable).not.toBe(80_000);
    expect(built.engineConfig.plan.liquidCents).toBe(24_000_000);
  });
});

describe("M8 — illiquid assets are not sliced to fund retirement", () => {
  it("goes to ruin while the house is still standing", () => {
    const plan = defaultPlan({
      currentAge: 64,
      retirementAge: 65,
      lifeExpectancy: 90,
      liquidCents: 20_000_000,
      illiquidCents: 100_000_000,
      monthlySpendingCents: 1_000_000,
      liquidRealReturn: 0.04,
      illiquidRealReturn: 0,
      allowIlliquidSale: false,
      applyTaxes: false,
    });
    const result = projectPlan(plan);
    expect(result.ruinAge).not.toBeNull();
    expect(result.ruinAge!).toBeLessThan(80);
    const last = result.years[result.years.length - 1]!;
    expect(last.illiquidValue).toBeGreaterThan(0);
    expect(last.liquidValue).toBe(0);
  });
});

describe("M12 — Fisher, not subtraction", () => {
  it("25y growth at 10%/5% is ~3.20M not the 3.27M subtraction result", () => {
    const subtract = 1_000_000 * 1.05 ** 25;
    const fisher = fisherGrow(1_000_000, 0.1, 0.05, 25);
    expect(subtract).toBeCloseTo(3_386_354.94, 0);
    expect(fisher).toBeLessThan(3_250_000);
    expect(fisher).toBeGreaterThan(3_150_000);
  });
});

describe("solve()", () => {
  it("finds a contribution that funds a given income", () => {
    const plan = defaultPlan({
      currentAge: 40,
      retirementAge: 65,
      lifeExpectancy: 90,
      liquidCents: 20_000_000,
      monthlySpendingCents: 1_500_000,
      monthlyContributionCents: 0,
      liquidRealReturn: 0.04,
    });
    const needed = solvePlan(plan, "contribution");
    expect(needed.feasible).toBe(true);
    expect(needed.value).toBeGreaterThan(0);
    const funded = projectPlan({
      ...plan,
      monthlyContributionCents: Math.round(needed.value * 100),
    });
    expect(funded.ruinAge).toBeNull();
  });
});

describe("adapter does not use American 8.5% for a 25% typed KPI without holdings", () => {
  it("buildProjectionEngineConfig falls back to KPI CAGR", () => {
    const kpis = normalizeKpiValues({
      expectedCAGR: 25,
      annualInflation: 5,
      currentNetWorth: 1_000_000,
    });
    const cfg = buildProjectionEngineConfig(kpis, [], [], 1_000_000);
    expect(cfg.investableRealReturn).toBeCloseTo(fisherReal(0.25, 0.05), 8);
  });
});

describe("defaults and reproducibility", () => {
  it("plans to age 90 by default", () => {
    expect(defaultPlan().lifeExpectancy).toBe(90);
    expect(normalizeKpiValues().lifeExpectancy).toBe(90);
  });

  it("same seed yields the same Monte Carlo finals", () => {
    const plan = defaultPlan({
      liquidCents: 100_000_000,
      monthlySpendingCents: 400_000,
      currentAge: 60,
      retirementAge: 65,
      lifeExpectancy: 90,
      seed: 7,
    });
    const a = runMonteCarloPlan(plan, { iterations: 40, scenario: "base" }).finals;
    const b = runMonteCarloPlan(plan, { iterations: 40, scenario: "base" }).finals;
    expect(a).toEqual(b);
  });

  it("refuses to sum mixed currencies without an FX quote", () => {
    expect(() =>
      calculatePortfolioValue([
        {
          id: "br",
          ticker: "CASH-BRL",
          name: "Cash BRL",
          assetClass: "cash",
          quantity: 1,
          currentPrice: 10,
          costBasis: 10,
          currency: "BRL",
          allocation: 50,
        },
        {
          id: "us",
          ticker: "CASH-USD",
          name: "Cash USD",
          assetClass: "cash",
          quantity: 1,
          currentPrice: 10,
          costBasis: 10,
          currency: "USD",
          allocation: 50,
        },
      ])
    ).toThrow(/Mixed-currency/);
  });
});
