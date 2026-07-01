import { describe, expect, it } from "vitest";
import { DEFAULT_KPI_VALUES, runMonteCarloSimulation } from "@/types";
import { buildCashFlowChartSeries } from "@/lib/cashFlowChartData";
import { buildDisplayChartData } from "@/lib/projectionChartData";
import {
  getChartHorizonAge,
  getRetirementPortfolioValue,
} from "@/lib/projectionUtils";
import {
  chartDataWithMcBands,
  generateExtendedProjections,
  PROJECTION_END_AGE,
} from "@/lib/projectionsExtended";
import { generateChartData } from "@/types";

describe("projection chart data", () => {
  const kpis = DEFAULT_KPI_VALUES;
  const projections = generateExtendedProjections(kpis);
  const horizon = PROJECTION_END_AGE;

  it("uses retirement age for headline KPI, not end-of-life", () => {
    const atRetirement = getRetirementPortfolioValue(
      projections,
      kpis.retirementAge
    );
    const endOfLife = projections[projections.length - 1]?.portfolioValue ?? 0;
    expect(atRetirement).toBeGreaterThan(0);
    expect(atRetirement).not.toBe(endOfLife);
  });

  it("extends chart through full lifecycle horizon", () => {
    const base = generateChartData(projections);
    const display = buildDisplayChartData(base, projections, kpis);
    expect(display.length).toBe(horizon - kpis.currentAge + 1);
    expect(display[0]?.age).toBe(kpis.currentAge);
    expect(display[display.length - 1]?.age).toBe(horizon);
    expect(getChartHorizonAge(projections)).toBe(horizon);
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
    expect(postRetirement.band).toBe(0);
  });

  it("shows post-retirement drawdown in base line", () => {
    const base = generateChartData(projections);
    const display = buildDisplayChartData(base, projections, kpis);
    const atRetirement = display.find((d) => d.age === kpis.retirementAge)!;
    const atHorizon = display[display.length - 1]!;
    expect(atHorizon.age).toBeGreaterThan(kpis.retirementAge);
    expect(atHorizon.value).toBeGreaterThan(0);
    expect(atRetirement.value).not.toBe(atHorizon.value);
  });
});

describe("cash flow chart data", () => {
  const kpis = DEFAULT_KPI_VALUES;
  const projections = generateExtendedProjections(kpis);
  const horizon = PROJECTION_END_AGE;

  it("extends through full horizon", () => {
    const series = buildCashFlowChartSeries(projections, kpis, {
      untilAge: horizon,
    });
    expect(series[series.length - 1]?.age).toBe(horizon);
    expect(series.length).toBe(horizon - kpis.currentAge + 1);
  });

  it("balances line equals stacked inflows minus living cost", () => {
    const series = buildCashFlowChartSeries(projections, kpis, {
      untilAge: horizon,
    });

    for (const row of series.slice(1)) {
      const expected =
        row.openingWealth + row.contributions + row.returns - row.livingCost;
      expect(row.projectedBalance).toBe(Math.max(0, Math.round(expected)));
    }
  });

  it("chains opening wealth from prior projected balance", () => {
    const series = buildCashFlowChartSeries(projections, kpis, {
      untilAge: horizon,
    });

    for (let i = 1; i < series.length; i++) {
      expect(series[i]?.openingWealth).toBe(series[i - 1]?.projectedBalance);
    }
  });

  it("marks post-retirement rows and uses withdrawals as outflows", () => {
    const series = buildCashFlowChartSeries(projections, kpis, {
      untilAge: horizon,
    });
    const retired = series.filter((r) => r.phase === "retirement");
    expect(retired.length).toBeGreaterThan(0);
    for (const row of retired) {
      expect(row.contributions).toBe(0);
      expect(row.livingCost).toBeGreaterThan(0);
    }
  });

  it("starts with current net worth at current age", () => {
    const [first] = buildCashFlowChartSeries(projections, kpis, {
      untilAge: horizon,
    });
    expect(first?.openingWealth).toBe(kpis.currentNetWorth);
    expect(first?.projectedBalance).toBe(kpis.currentNetWorth);
    expect(first?.phase).toBe("accumulation");
  });
});