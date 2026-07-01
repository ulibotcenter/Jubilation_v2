import {
  buildProjectionEngineConfig,
  buildSingleBucketConfig,
  percentile,
  runProjectionEngine,
  simulateMonteCarloPathsByAge,
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

export function chartDataWithMcBands(
  projections: ProjectionYear[],
  mcP10?: number,
  mcP90?: number,
  anchorAge?: number,
  mcMedian?: number,
  engineConfig?: ProjectionEngineConfig
): ChartDataPoint[] {
  const base = generateChartData(projections);
  if (mcP10 == null || mcP90 == null) return base;

  // Prefer per-age path percentiles when engine config is available
  if (engineConfig) {
    const pathsByAge = simulateMonteCarloPathsByAge(engineConfig, {
      iterations: 400,
      volatility: 0.15,
    });
    return base.map((point) => {
      if (anchorAge != null && point.age > anchorAge) {
        return { ...point, pessimistic: undefined, optimistic: undefined, band: 0 };
      }
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
    });
  }

  const spreadBase = mcMedian ?? mcP10;
  if (spreadBase <= 0) return base;

  const p10Ratio = mcP10 / spreadBase;
  const p90Ratio = mcP90 / spreadBase;
  return base.map((p) => {
    if (anchorAge != null && p.age > anchorAge) {
      return { ...p, pessimistic: undefined, optimistic: undefined, band: 0 };
    }
    const pessimistic = Math.round(p.value * p10Ratio);
    const optimistic = Math.round(p.value * p90Ratio);
    return {
      ...p,
      pessimistic,
      optimistic,
      band: optimistic - pessimistic,
    };
  });
}