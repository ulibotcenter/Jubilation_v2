import { chartDataWithMcBands } from "@/lib/projectionsExtended";
import { getChartHorizonAge } from "@/lib/projectionUtils";
import { DEFAULT_LIFE_EXPECTANCY } from "@/types";
import type {
  ChartDataPoint,
  KPIValues,
  MonteCarloResult,
  ProjectionYear,
} from "@/types";

/** Full lifecycle chart points (accumulation + post-retirement drawdown). */
export function sliceProjectionsForChart(
  projections: ProjectionYear[],
  endAge?: number
): ProjectionYear[] {
  const horizon =
    endAge ?? getChartHorizonAge(projections) ?? DEFAULT_LIFE_EXPECTANCY;
  return projections.filter((p) => p.age <= horizon);
}

function stripBandsAfterRetirement(
  points: ChartDataPoint[],
  retirementAge: number
): ChartDataPoint[] {
  return points.map((p) =>
    p.age > retirementAge
      ? { ...p, pessimistic: undefined, optimistic: undefined, band: 0 }
      : p
  );
}

export function buildDisplayChartData(
  chartData: ChartDataPoint[],
  projections: ProjectionYear[],
  kpis: KPIValues,
  monteCarlo?: {
    hasRun: boolean;
    results: MonteCarloResult[];
  }
): ChartDataPoint[] {
  const horizon = getChartHorizonAge(projections, kpis);
  const fullProjections = sliceProjectionsForChart(projections, horizon);
  const fullChart = chartData.filter((d) => d.age <= horizon);

  const accumulationChart = fullChart.filter(
    (d) => d.age <= kpis.retirementAge
  );
  const hasBands = accumulationChart.some(
    (d) =>
      d.pessimistic != null &&
      d.optimistic != null &&
      (d.pessimistic !== d.value || d.optimistic !== d.value)
  );

  if (hasBands) return stripBandsAfterRetirement(fullChart, kpis.retirementAge);

  if (monteCarlo?.hasRun && monteCarlo.results.length > 0) {
    const mcBase = monteCarlo.results.find((r) => r.scenario === "base");
    if (mcBase?.percentile10 != null && mcBase?.percentile90 != null) {
      const withBands = chartDataWithMcBands(
        fullProjections,
        mcBase.percentile10,
        mcBase.percentile90,
        kpis.retirementAge,
        mcBase.medianValue
      );
      return stripBandsAfterRetirement(withBands, kpis.retirementAge);
    }
  }

  return fullChart;
}