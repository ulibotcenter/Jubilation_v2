import { chartDataWithMcBands } from "@/lib/projectionsExtended";
import type {
  ChartDataPoint,
  KPIValues,
  MonteCarloResult,
  ProjectionYear,
} from "@/types";

/** Chart points from current age through retirement (accumulation focus) */
export function sliceProjectionsForChart(
  projections: ProjectionYear[],
  retirementAge: number
): ProjectionYear[] {
  return projections.filter((p) => p.age <= retirementAge);
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
  const sliced = sliceProjectionsForChart(projections, kpis.retirementAge);
  const slicedChart = chartData.filter((d) => d.age <= kpis.retirementAge);

  const hasBands = slicedChart.some(
    (d) =>
      d.pessimistic != null &&
      d.optimistic != null &&
      (d.pessimistic !== d.value || d.optimistic !== d.value)
  );

  if (hasBands) return slicedChart;

  if (monteCarlo?.hasRun && monteCarlo.results.length > 0) {
    const mcBase = monteCarlo.results.find((r) => r.scenario === "base");
    if (mcBase?.percentile10 != null && mcBase?.percentile90 != null) {
      return chartDataWithMcBands(
        sliced,
        mcBase.percentile10,
        mcBase.percentile90,
        kpis.retirementAge,
        mcBase.medianValue
      );
    }
  }

  return slicedChart;
}