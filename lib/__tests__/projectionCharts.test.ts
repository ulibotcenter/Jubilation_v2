import { describe, expect, it } from "vitest";
import {
  DEFAULT_KPI_VALUES,
  DEFAULT_LIFE_EXPECTANCY,
  runMonteCarloSimulation,
} from "@/types";
import { buildCashFlowChartSeries } from "@/lib/cashFlowChartData";
import { buildDisplayChartData } from "@/lib/projectionChartData";
import {
  getChartHorizonAge,
  getRetirementPortfolioValue,
} from "@/lib/projectionUtils";
import {
  chartDataWithMcBands,
  generateExtendedProjections,
} from "@/lib/projectionsExtended";
import { generateChartData } from "@/types";

describe("projection engine", () => {
  const kpis = DEFAULT_KPI_VALUES;
  const projections = generateExtendedProjections(kpis);

  it("runs through user life expectancy", () => {
    expect(projections[projections.length - 1]?.age).toBe(kpis.lifeExpectancy);
    expect(getChartHorizonAge(projections, kpis)).toBe(kpis.lifeExpectancy);
  });

  it("respects custom life expectancy", () => {
    const custom = { ...kpis, lifeExpectancy: 95 };
    const customProj = generateExtendedProjections(custom);
    expect(customProj[customProj.length - 1]?.age).toBe(95);
    expect(customProj.length).toBe(95 - kpis.currentAge + 1);
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
    const mc = runMonteCarloSimulation(kpis, 500);
    const mcBase = mc.results.find((r) => r.scenario === "base")!;
    const chartData = chartDataWithMcBands(
      projections,
      mcBase.percentile10,
      mcBase.percentile90,
      kpis.retirementAge,
      mcBase.medianValue
    );
    const display = buildDisplayChartData(chartData, projections, kpis, {
      hasRun: true,
      results: mc.results,
    });

    const atRetirement = display.find((d) => d.age === kpis.retirementAge)!;
    const postRetirement = display.find(
      (d) => d.age === kpis.retirementAge + 5
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
      expect(row.projectedBalance).toBeGreaterThanOrEqual(
        row.openingWealth + row.contributions + row.returns - 1
      );
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
});