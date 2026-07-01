import { describe, expect, it } from "vitest";
import { DEFAULT_KPI_VALUES, runMonteCarloSimulation } from "@/types";
import { buildCashFlowChartSeries } from "@/lib/cashFlowChartData";
import { buildDisplayChartData } from "@/lib/projectionChartData";
import { getRetirementPortfolioValue } from "@/lib/projectionUtils";
import {
  chartDataWithMcBands,
  generateExtendedProjections,
} from "@/lib/projectionsExtended";
import { generateChartData } from "@/types";

describe("projection chart data", () => {
  const kpis = DEFAULT_KPI_VALUES;
  const projections = generateExtendedProjections(kpis);

  it("uses retirement age for headline portfolio value, not end-of-life", () => {
    const atRetirement = getRetirementPortfolioValue(
      projections,
      kpis.retirementAge
    );
    const endOfLife = projections[projections.length - 1]?.portfolioValue ?? 0;
    expect(atRetirement).toBeGreaterThan(0);
    expect(atRetirement).not.toBe(endOfLife);
  });

  it("keeps Monte Carlo pessimistic below base and optimistic above base", () => {
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
    const last = display[display.length - 1]!;
    expect(last.pessimistic).toBeLessThan(last.value);
    expect(last.optimistic).toBeGreaterThan(last.value);
    expect(last.band).toBeGreaterThan(0);
  });

  it("slices accumulation chart through retirement age", () => {
    const base = generateChartData(projections);
    const display = buildDisplayChartData(base, projections, kpis);
    expect(display.length).toBe(kpis.retirementAge - kpis.currentAge + 1);
    expect(display[display.length - 1]?.age).toBe(kpis.retirementAge);
  });
});

describe("cash flow chart data", () => {
  const kpis = DEFAULT_KPI_VALUES;
  const projections = generateExtendedProjections(kpis);

  it("balances line equals stacked inflows minus living cost", () => {
    const series = buildCashFlowChartSeries(projections, kpis, {
      untilAge: kpis.retirementAge,
    });

    for (const row of series.slice(1)) {
      const expected =
        row.openingWealth + row.contributions + row.returns - row.livingCost;
      expect(row.projectedBalance).toBe(Math.max(0, Math.round(expected)));
    }
  });

  it("chains opening wealth from prior projected balance", () => {
    const series = buildCashFlowChartSeries(projections, kpis, {
      untilAge: kpis.retirementAge,
    });

    for (let i = 1; i < series.length; i++) {
      expect(series[i]?.openingWealth).toBe(series[i - 1]?.projectedBalance);
    }
  });

  it("starts with current net worth at current age", () => {
    const [first] = buildCashFlowChartSeries(projections, kpis, {
      untilAge: kpis.retirementAge,
    });
    expect(first?.openingWealth).toBe(kpis.currentNetWorth);
    expect(first?.projectedBalance).toBe(kpis.currentNetWorth);
  });
});