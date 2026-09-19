import {
  buildProjectionEngineConfig,
  buildSingleBucketConfig,
  percentile,
  runProjectionEngine,
  type ProjectionEngineConfig,
} from "@/lib/projectionEngine";
import {
  generateChartData,
  type ChartDataPoint,
  type KPIValues,
  type PortfolioAsset,
  type ProjectionYear,
} from "@/types";

export interface ProjectionOptions {
  portfolio?: PortfolioAsset[];
  includedAssetIds?: string[];
  outsidePortfolio?: number;
}

function resolveEngineConfig(
  kpis: KPIValues,
  options?: ProjectionOptions
): ProjectionEngineConfig {
  if (
    options?.portfolio &&
    options.includedAssetIds &&
    options.includedAssetIds.length > 0
  ) {
    return buildProjectionEngineConfig(
      kpis,
      options.portfolio,
      options.includedAssetIds,
      options.outsidePortfolio ?? 0
    );
  }
  return buildSingleBucketConfig(kpis);
}

/** Accumulation + drawdown through user-defined life expectancy */
export function generateExtendedProjections(
  kpis: KPIValues,
  options?: ProjectionOptions
): ProjectionYear[] {
  return runProjectionEngine(resolveEngineConfig(kpis, options));
}

/**
 * Attach MC bands from a completed run. Does NOT resample Math.random()
 * during render (M14). Width is 0 at today's age and opens with time.
 */
export function chartDataWithMcBands(
  projections: ProjectionYear[],
  mcP10?: number,
  mcP90?: number,
  anchorAge?: number,
  mcMedian?: number,
  _engineConfig?: ProjectionEngineConfig,
  pathsByAge?: Map<number, number[]> | Record<number, { p10: number; p50: number; p90: number }> | null
): ChartDataPoint[] {
  const base = generateChartData(projections);
  const startAge = projections[0]?.age ?? 0;
  const endAge =
    anchorAge ??
    projections[projections.length - 1]?.age ??
    startAge;

  if (pathsByAge) {
    return base.map((point) => {
      if (pathsByAge instanceof Map) {
        const values = [...(pathsByAge.get(point.age) ?? [])].sort(
          (a, b) => a - b
        );
        if (values.length === 0) return point;
        const pessimistic = Math.round(percentile(values, 0.1));
        const optimistic = Math.round(percentile(values, 0.9));
        return {
          ...point,
          pessimistic,
          optimistic,
          band: optimistic - pessimistic,
        };
      }
      const row = pathsByAge[point.age];
      if (!row) return point;
      return {
        ...point,
        pessimistic: row.p10,
        optimistic: row.p90,
        band: row.p90 - row.p10,
      };
    });
  }

  if (mcP10 == null || mcP90 == null || mcMedian == null || mcMedian <= 0) {
    return base;
  }

  const span = Math.max(1, endAge - startAge);
  return base.map((p) => {
    const t = (p.age - startAge) / span;
    const pessimistic = Math.round(p.value + (mcP10 - mcMedian) * t);
    const optimistic = Math.round(p.value + (mcP90 - mcMedian) * t);
    return {
      ...p,
      pessimistic,
      optimistic,
      band: optimistic - pessimistic,
    };
  });
}
