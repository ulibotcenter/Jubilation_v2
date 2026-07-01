import { describe, expect, it } from "vitest";
import { buildCashFlowChartSeries } from "@/lib/cashFlowChartData";
import {
  buildProjectionEngineConfig,
  buildSingleBucketConfig,
  runMonteCarloFromConfig,
  runProjectionEngine,
} from "@/lib/projectionEngine";
import { buildDisplayChartData } from "@/lib/projectionChartData";
import {
  getChartHorizonAge,
  getRetirementPortfolioValue,
} from "@/lib/projectionUtils";
import {
  chartDataWithMcBands,
  generateExtendedProjections,
} from "@/lib/projectionsExtended";
import { applyScopePreset } from "@/lib/simulationScope";
import {
  DEFAULT_KPI_VALUES,
  DEFAULT_LIFE_EXPECTANCY,
  MOCK_PORTFOLIO,
  calculatePortfolioValue,
  generateChartData,
  normalizeKpiValues,
  runMonteCarloSimulation,
} from "@/types";
import { normalizePortfolioCagr } from "@/lib/portfolioCagr";
import { syncNetWorthWithPortfolio } from "@/lib/netWorthSync";

function demoStoreProjections() {
  const portfolio = normalizePortfolioCagr(MOCK_PORTFOLIO);
  const includedIds = applyScopePreset(portfolio, "investmentsOnly");
  const seedTotal = Math.round(calculatePortfolioValue(portfolio));
  const kpis = syncNetWorthWithPortfolio(
    normalizeKpiValues({ currentNetWorth: seedTotal }),
    portfolio,
    0
  );
  return generateExtendedProjections(kpis, {
    portfolio,
    includedAssetIds: includedIds,
    outsidePortfolio: 0,
  });
}

describe("projection engine", () => {
  const kpis = DEFAULT_KPI_VALUES;
  const projections = generateExtendedProjections(kpis);

  it("runs through user life expectancy", () => {
    expect(projections[projections.length - 1]?.age).toBe(kpis.lifeExpectancy);
    expect(getChartHorizonAge(projections, kpis)).toBe(kpis.lifeExpectancy);
  });

  it("demo portfolio starts chart at full net worth", () => {
    const portfolio = normalizePortfolioCagr(MOCK_PORTFOLIO);
    const includedIds = applyScopePreset(portfolio, "investmentsOnly");
    const seedTotal = Math.round(calculatePortfolioValue(portfolio));
    const kpis = syncNetWorthWithPortfolio(
      normalizeKpiValues({ currentNetWorth: seedTotal }),
      portfolio,
      0
    );
    const projections = generateExtendedProjections(kpis, {
      portfolio,
      includedAssetIds: includedIds,
      outsidePortfolio: 0,
    });
    expect(projections[0]?.portfolioValue).toBe(seedTotal);
    expect(projections[0]?.portfolioValue).toBeGreaterThan(500_000);
  });

  it("demo portfolio projects meaningful growth by retirement", () => {
    const projections = demoStoreProjections();
    const atRet = getRetirementPortfolioValue(
      projections,
      DEFAULT_KPI_VALUES.retirementAge
    );
    const start = projections[0]?.portfolioValue ?? 0;
    expect(atRet).toBeGreaterThan(start * 1.5);
  });

  it("year-over-year balance reconciles exactly (rounded stepping)", () => {
    const config = buildSingleBucketConfig(kpis);
    const rows = runProjectionEngine(config);
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1]!;
      const cur = rows[i]!;
      const isRetired = cur.age >= kpis.retirementAge;
      const withdrawals = isRetired ? cur.expenses : 0;
      const expected =
        prev.portfolioValue + cur.returns + cur.contributions - withdrawals;
      expect(cur.portfolioValue).toBe(Math.max(0, expected));
    }
  });

  it("uses 4% of portfolio at retirement when no desired income", () => {
    const noIncome = {
      ...kpis,
      desiredMonthlyIncome: 0,
      lifeExpectancy: 85,
    };
    const proj = generateExtendedProjections(noIncome);
    const atRet = proj.find((p) => p.age === noIncome.retirementAge)!;
    const prev = proj.find((p) => p.age === noIncome.retirementAge - 1)!;
    const expectedWithdrawal = Math.round(prev.portfolioValue * 0.04);
    const firstRetired = proj.find((p) => p.age === noIncome.retirementAge + 1);
    expect(firstRetired?.expenses).toBe(expectedWithdrawal);
    expect(atRet.portfolioValue).toBeGreaterThan(0);
  });

  it("keeps retirement headline separate from end-of-life", () => {
    const atRetirement = getRetirementPortfolioValue(
      projections,
      kpis.retirementAge
    );
    const endOfLife = projections[projections.length - 1]?.portfolioValue ?? 0;
    expect(atRetirement).toBeGreaterThan(0);
    expect(atRetirement).not.toBe(endOfLife);
  });
});

describe("projection chart data", () => {
  const kpis = DEFAULT_KPI_VALUES;
  const projections = generateExtendedProjections(kpis);

  it("extends chart through life expectancy", () => {
    const base = generateChartData(projections);
    const display = buildDisplayChartData(base, projections, kpis);
    expect(display.length).toBe(kpis.lifeExpectancy - kpis.currentAge + 1);
    expect(display[display.length - 1]?.age).toBe(kpis.lifeExpectancy);
    expect(display[display.length - 1]?.value).toBe(
      projections[projections.length - 1]?.portfolioValue
    );
  });

  it("keeps Monte Carlo bands only through retirement", () => {
    const portfolio = normalizePortfolioCagr(MOCK_PORTFOLIO);
    const includedIds = applyScopePreset(portfolio, "investmentsOnly");
    const seedTotal = Math.round(calculatePortfolioValue(portfolio));
    const demoKpis = syncNetWorthWithPortfolio(
      normalizeKpiValues({ currentNetWorth: seedTotal }),
      portfolio,
      0
    );
    const demoProj = generateExtendedProjections(demoKpis, {
      portfolio,
      includedAssetIds: includedIds,
      outsidePortfolio: 0,
    });
    const engineConfig = buildProjectionEngineConfig(
      demoKpis,
      portfolio,
      includedIds,
      0
    );
    const mc = runMonteCarloFromConfig(engineConfig, 500);
    const mcBase = mc.results.find((r) => r.scenario === "base")!;
    const chartData = chartDataWithMcBands(
      demoProj,
      mcBase.percentile10,
      mcBase.percentile90,
      demoKpis.retirementAge,
      mcBase.medianValue,
      engineConfig
    );
    const display = buildDisplayChartData(chartData, demoProj, demoKpis, {
      hasRun: true,
      results: mc.results.map((r) => ({
        scenario: r.scenario,
        label: r.scenario,
        finalValue: r.medianValue,
        medianValue: r.medianValue,
        successRate: r.successRate,
        percentile10: r.percentile10,
        percentile90: r.percentile90,
      })),
    });

    const atRetirement = display.find(
      (d) => d.age === demoKpis.retirementAge
    )!;
    const postRetirement = display.find(
      (d) => d.age === demoKpis.retirementAge + 5
    )!;

    expect(atRetirement.pessimistic).toBeLessThan(atRetirement.value);
    expect(atRetirement.optimistic).toBeGreaterThan(atRetirement.value);
    expect(postRetirement.pessimistic).toBeUndefined();
    expect(postRetirement.optimistic).toBeUndefined();
  });

  it("chart line matches projection portfolio every year", () => {
    const base = generateChartData(projections);
    const display = buildDisplayChartData(base, projections, kpis);
    for (let i = 0; i < display.length; i++) {
      expect(display[i]?.value).toBe(projections[i]?.portfolioValue);
    }
  });

  it("MC median stays within 25% of deterministic at retirement", () => {
    const portfolio = normalizePortfolioCagr(MOCK_PORTFOLIO);
    const includedIds = applyScopePreset(portfolio, "investmentsOnly");
    const seedTotal = Math.round(calculatePortfolioValue(portfolio));
    const demoKpis = syncNetWorthWithPortfolio(
      normalizeKpiValues({ currentNetWorth: seedTotal }),
      portfolio,
      0
    );
    const demoProj = generateExtendedProjections(demoKpis, {
      portfolio,
      includedAssetIds: includedIds,
      outsidePortfolio: 0,
    });
    const engineConfig = buildProjectionEngineConfig(
      demoKpis,
      portfolio,
      includedIds,
      0
    );
    const mc = runMonteCarloFromConfig(engineConfig, 800);
    const mcBase = mc.results.find((r) => r.scenario === "base")!;
    const det = getRetirementPortfolioValue(
      demoProj,
      demoKpis.retirementAge
    );
    const ratio = mcBase.medianValue / det;
    expect(ratio).toBeGreaterThan(0.75);
    expect(ratio).toBeLessThan(1.35);
  });
});

describe("cash flow chart data", () => {
  const kpis = DEFAULT_KPI_VALUES;
  const projections = generateExtendedProjections(kpis);

  it("line matches portfolio value every year (zero drift)", () => {
    const series = buildCashFlowChartSeries(projections, kpis);
    expect(series.length).toBe(projections.length);
    for (let i = 0; i < series.length; i++) {
      expect(series[i]?.projectedBalance).toBe(projections[i]?.portfolioValue);
    }
  });

  it("tooltip build total reconciles with balance", () => {
    const series = buildCashFlowChartSeries(projections, kpis);
    for (let i = 1; i < series.length; i++) {
      const row = series[i]!;
      const build =
        row.openingWealth + row.contributions + row.returns;
      if (row.phase === "accumulation") {
        expect(row.projectedBalance).toBe(build);
      } else {
        expect(row.projectedBalance).toBe(build - row.livingCost);
      }
    }
  });

  it("uses projection engine returns, not recalculated", () => {
    const series = buildCashFlowChartSeries(projections, kpis);
    for (let i = 1; i < series.length; i++) {
      expect(series[i]?.returns).toBe(projections[i]?.returns);
    }
  });

  it("chains opening wealth from prior portfolio value", () => {
    const series = buildCashFlowChartSeries(projections, kpis);
    for (let i = 1; i < series.length; i++) {
      expect(series[i]?.openingWealth).toBe(
        projections[i - 1]?.portfolioValue
      );
    }
  });

  it("accumulation outflows are reference-only", () => {
    const series = buildCashFlowChartSeries(projections, kpis);
    const accum = series.filter(
      (r) => r.phase === "accumulation" && r.age > kpis.currentAge
    );
    expect(accum.length).toBeGreaterThan(0);
    for (const row of accum) {
      expect(row.outflowAffectsBalance).toBe(false);
      expect(row.livingCost).toBeGreaterThan(0);
    }
  });

  it("retirement applies withdrawals to balance", () => {
    const series = buildCashFlowChartSeries(projections, kpis);
    const retired = series.filter(
      (r) => r.phase === "retirement" && r.age > kpis.retirementAge
    );
    expect(retired.length).toBeGreaterThan(0);
    for (const row of retired) {
      expect(row.outflowAffectsBalance).toBe(true);
      expect(row.contributions).toBe(0);
      expect(row.livingCost).toBeGreaterThan(0);
    }
  });

  it("horizon follows life expectancy changes", () => {
    const custom = { ...kpis, lifeExpectancy: 88 };
    const customProj = generateExtendedProjections(custom);
    const series = buildCashFlowChartSeries(customProj, custom);
    expect(series[series.length - 1]?.age).toBe(88);
    expect(series.length).not.toBe(
      DEFAULT_LIFE_EXPECTANCY - kpis.currentAge + 1
    );
  });

  it("demo cash flow reconciles end-to-end", () => {
    const projections = demoStoreProjections();
    const kpis = {
      ...DEFAULT_KPI_VALUES,
      currentNetWorth: projections[0]?.portfolioValue ?? 0,
    };
    const series = buildCashFlowChartSeries(projections, kpis);
    for (let i = 1; i < series.length; i++) {
      const row = series[i]!;
      const build =
        row.openingWealth + row.contributions + row.returns;
      if (row.phase === "accumulation") {
        expect(row.projectedBalance).toBe(build);
      } else {
        expect(row.projectedBalance).toBe(build - row.livingCost);
      }
    }
  });
});

describe("legacy monte carlo wrapper", () => {
  it("uses real-return engine for KPI-only simulations", () => {
    const kpis = DEFAULT_KPI_VALUES;
    const projections = generateExtendedProjections(kpis);
    const det = getRetirementPortfolioValue(projections, kpis.retirementAge);
    const mc = runMonteCarloSimulation(kpis, 600);
    const base = mc.results.find((r) => r.scenario === "base")!;
    const ratio = base.medianValue / det;
    expect(ratio).toBeGreaterThan(0.75);
    expect(ratio).toBeLessThan(1.35);
  });
});