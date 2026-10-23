import { chartDataWithMcBands } from "@/lib/projectionsExtended";
import { getChartHorizonAge } from "@/lib/projectionUtils";
import {
  DEFAULT_LIFE_EXPECTANCY,
  MONTE_CARLO_SCENARIO_MULTIPLIERS,
  type ChartDataPoint,
  type KPIValues,
  type MonteCarloResult,
  type ProjectionYear,
} from "@/types";

function hasDistinctBands(point: ChartDataPoint): boolean {
  return (
    point.pessimistic != null &&
    point.optimistic != null &&
    (point.pessimistic !== point.value || point.optimistic !== point.value)
  );
}

/**
 * Display-only scenario lines from the engine's base path. Uses the same
 * CAGR offsets as Monte Carlo labels without resampling or changing KPIs.
 */
export function attachDisplayScenarioLines(
  points: ChartDataPoint[]
): ChartDataPoint[] {
  if (points.length === 0) return points;
  if (points.some(hasDistinctBands)) return points;
  const start = points[0]!.value;
  const pessOffset = MONTE_CARLO_SCENARIO_MULTIPLIERS.pessimistic.cagrOffset / 100;
  const optOffset = MONTE_CARLO_SCENARIO_MULTIPLIERS.optimistic.cagrOffset / 100;
  return points.map((point, index) => {
    if (index === 0 || start <= 0) {
      return {
        ...point,
        pessimistic: point.value,
        optimistic: point.value,
        band: 0,
      };
    }
    const impliedCagr = Math.pow(point.value / start, 1 / index) - 1;
    const pessimistic = Math.max(
      0,
      start * Math.pow(1 + impliedCagr + pessOffset, index)
    );
    const optimistic = Math.max(
      0,
      start * Math.pow(1 + impliedCagr + optOffset, index)
    );
    return {
      ...point,
      pessimistic,
      optimistic,
      band: Math.max(0, optimistic - pessimistic),
    };
  });
}

/** Visual-only midpoints so Recharts paints a smoother curve. */
export function densifyChartLine(
  points: ChartDataPoint[],
  steps = 3
): ChartDataPoint[] {
  if (points.length < 2 || steps < 1) return points;
  const out: ChartDataPoint[] = [];
  const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    out.push(a);
    for (let step = 1; step <= steps; step++) {
      const t = step / (steps + 1);
      const pessimistic =
        a.pessimistic != null && b.pessimistic != null
          ? lerp(a.pessimistic, b.pessimistic, t)
          : undefined;
      const optimistic =
        a.optimistic != null && b.optimistic != null
          ? lerp(a.optimistic, b.optimistic, t)
          : undefined;
      out.push({
        year: lerp(a.year, b.year, t),
        age: lerp(a.age, b.age, t),
        value: lerp(a.value, b.value, t),
        pessimistic,
        optimistic,
        band:
          pessimistic != null && optimistic != null
            ? Math.max(0, optimistic - pessimistic)
            : undefined,
        expenses:
          a.expenses != null && b.expenses != null
            ? lerp(a.expenses, b.expenses, t)
            : a.expenses,
        invested:
          a.invested != null && b.invested != null
            ? lerp(a.invested, b.invested, t)
            : a.invested,
        returns:
          a.returns != null && b.returns != null
            ? lerp(a.returns, b.returns, t)
            : a.returns,
        requiredIncome:
          a.requiredIncome != null && b.requiredIncome != null
            ? lerp(a.requiredIncome, b.requiredIncome, t)
            : a.requiredIncome,
      });
    }
  }
  out.push(points[points.length - 1]!);
  return out;
}

/** Full lifecycle chart points (accumulation + post-retirement drawdown). */
export function sliceProjectionsForChart(
  projections: ProjectionYear[],
  endAge?: number
): ProjectionYear[] {
  const horizon =
    endAge ?? getChartHorizonAge(projections) ?? DEFAULT_LIFE_EXPECTANCY;
  return projections.filter((p) => p.age <= horizon);
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

  const hasBands = fullChart.some(
    (d) =>
      d.pessimistic != null &&
      d.optimistic != null &&
      (d.pessimistic !== d.value || d.optimistic !== d.value)
  );

  if (hasBands) return fullChart;

  if (monteCarlo?.hasRun && monteCarlo.results.length > 0) {
    const mcBase = monteCarlo.results.find((r) => r.scenario === "base");
    if (mcBase?.percentile10 != null && mcBase?.percentile90 != null) {
      return chartDataWithMcBands(
        fullProjections,
        mcBase.percentile10,
        mcBase.percentile90,
        kpis.lifeExpectancy,
        mcBase.medianValue
      );
    }
  }

  return attachDisplayScenarioLines(fullChart);
}