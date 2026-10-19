import { getDefaultIncludedAssetIds } from "@/lib/simulationScope";
import { buildProjectionEngineConfig } from "@/lib/projectionEngine";
import { projectPlan } from "@/lib/engine/project";
import { chartDataWithMcBands } from "@/lib/projectionsExtended";
import { syncNetWorthWithPortfolio } from "@/lib/netWorthSync";
import { resolveSimulationKpis } from "@/lib/simulationScope";
import {
  applyPortfolioCagrToKpis,
  normalizePortfolioCagr,
} from "@/lib/portfolioCagr";
import { liveFxQuote, type FxSnapshot } from "@/lib/fx/types";
import type { Household } from "@/lib/engine/household";
import type { Currency } from "@/types";
import {
  DEFAULT_KPI_VALUES,
  normalizeKpiValues,
  type ChartDataPoint,
  type DistributionBin,
  type KPIValues,
  type MonteCarloResult,
  type MonteCarloScenario,
  type MonteCarloState,
  type PortfolioAsset,
  type ProjectionYear,
  type StressTestId,
  type StressTestResult,
} from "@/types";

export interface SimulationPlaygroundState {
  isActive: boolean;
  copiedAt: string | null;
  kpis: KPIValues;
  kpiOutsidePortfolio: number;
  portfolio: PortfolioAsset[];
  portfolioSearchQuery: string;
  portfolioLastRefreshedAt: string | null;
  simulationIncludedAssetIds: string[];
  projections: ProjectionYear[];
  chartData: ChartDataPoint[];
  projectionRevision: number;
  monteCarlo: {
    hasRun: boolean;
    isRunning: boolean;
    stale: boolean;
    lastRunAt: string | null;
    results: MonteCarloResult[];
    distributions: Record<MonteCarloScenario, DistributionBin[]> | null;
    target: number | null;
    iterations: number;
    pathsByAge?: MonteCarloState["pathsByAge"];
  };
  activeStressTest: StressTestId | null;
  stressTestResults: StressTestResult[];
}

function emptyMonteCarlo(): SimulationPlaygroundState["monteCarlo"] {
  return {
    hasRun: false,
    isRunning: false,
    stale: false,
    lastRunAt: null,
    results: [],
    distributions: null,
    target: null,
    iterations: 1000,
    pathsByAge: null,
  };
}

export function createEmptyPlayground(): SimulationPlaygroundState {
  return {
    isActive: false,
    copiedAt: null,
    kpis: { ...DEFAULT_KPI_VALUES },
    kpiOutsidePortfolio: 0,
    portfolio: [],
    portfolioSearchQuery: "",
    portfolioLastRefreshedAt: null,
    simulationIncludedAssetIds: [],
    projections: [],
    chartData: [],
    projectionRevision: 0,
    monteCarlo: emptyMonteCarlo(),
    activeStressTest: null,
    stressTestResults: [],
  };
}

/** Active blank sim: product KPI defaults, no holdings, projections rebuilt. */
export function blankPlaygroundFromDefaults(fx: {
  currency?: Currency;
  fxSnapshot?: FxSnapshot | null;
  household?: Household | null;
}): SimulationPlaygroundState {
  const kpis = normalizeKpiValues({ ...DEFAULT_KPI_VALUES });
  const built = buildPlaygroundProjections({
    kpis,
    kpiOutsidePortfolio: 0,
    portfolio: [],
    simulationIncludedAssetIds: [],
    currency: fx.currency,
    fxSnapshot: fx.fxSnapshot,
    household: fx.household,
  });
  return {
    isActive: true,
    copiedAt: null,
    kpis: built.kpis,
    kpiOutsidePortfolio: 0,
    portfolio: [],
    portfolioSearchQuery: "",
    portfolioLastRefreshedAt: null,
    simulationIncludedAssetIds: [],
    projections: built.projections,
    chartData: built.chartData,
    projectionRevision: 1,
    monteCarlo: emptyMonteCarlo(),
    activeStressTest: null,
    stressTestResults: [],
  };
}

export function clonePortfolioForSimulation(portfolio: PortfolioAsset[]): {
  portfolio: PortfolioAsset[];
  idMap: Map<string, string>;
} {
  const idMap = new Map<string, string>();
  const cloned = portfolio.map((asset) => {
    const newId = `sim-${asset.id}`;
    idMap.set(asset.id, newId);
    return { ...asset, id: newId };
  });
  return { portfolio: cloned, idMap };
}

export function buildPlaygroundProjections(state: {
  kpis: KPIValues;
  portfolio: PortfolioAsset[];
  simulationIncludedAssetIds: string[];
  kpiOutsidePortfolio: number;
  currency?: Currency;
  fxSnapshot?: FxSnapshot | null;
  household?: Household | null;
  monteCarlo?: {
    hasRun?: boolean;
    results: MonteCarloResult[];
    pathsByAge?: MonteCarloState["pathsByAge"];
  };
}) {
  const quote = liveFxQuote(state.currency ?? "USD", state.fxSnapshot);
  const portfolio = normalizePortfolioCagr(state.portfolio);
  const syncedKpis = applyPortfolioCagrToKpis(
    syncNetWorthWithPortfolio(
      normalizeKpiValues(state.kpis),
      portfolio,
      state.kpiOutsidePortfolio,
      quote
    ),
    portfolio
  );
  const effectiveKpis = resolveSimulationKpis(
    syncedKpis,
    portfolio,
    state.simulationIncludedAssetIds,
    state.kpiOutsidePortfolio,
    quote
  );
  const engineConfig = buildProjectionEngineConfig(
    effectiveKpis,
    portfolio,
    state.simulationIncludedAssetIds,
    state.kpiOutsidePortfolio,
    quote,
    { household: state.household }
  );
  const projections = projectPlan(engineConfig.plan).years;
  const mcBase =
    state.monteCarlo?.hasRun && (state.monteCarlo.results?.length ?? 0) > 0
      ? state.monteCarlo.results.find((r) => r.scenario === "base")
      : undefined;
  const chartData = chartDataWithMcBands(
    projections,
    mcBase?.percentile10,
    mcBase?.percentile90,
    engineConfig.plan.lifeExpectancy,
    mcBase?.medianValue,
    engineConfig,
    state.monteCarlo?.pathsByAge
  );
  return {
    kpis: syncedKpis,
    effectiveKpis,
    engineConfig,
    projections,
    chartData,
  };
}

export function snapshotFromRealState(real: {
  kpis: KPIValues;
  kpiOutsidePortfolio: number;
  portfolio: PortfolioAsset[];
  simulationIncludedAssetIds: string[];
  currency?: Currency;
  fxSnapshot?: FxSnapshot | null;
  household?: Household | null;
}): SimulationPlaygroundState {
  const { portfolio, idMap } = clonePortfolioForSimulation(real.portfolio);
  const simulationIncludedAssetIds = real.simulationIncludedAssetIds
    .map((id) => idMap.get(id))
    .filter((id): id is string => Boolean(id));

  const included =
    simulationIncludedAssetIds.length > 0
      ? simulationIncludedAssetIds
      : getDefaultIncludedAssetIds(portfolio);

  const built = buildPlaygroundProjections({
    kpis: { ...real.kpis },
    kpiOutsidePortfolio: real.kpiOutsidePortfolio,
    portfolio,
    simulationIncludedAssetIds: included,
    currency: real.currency,
    fxSnapshot: real.fxSnapshot,
    household: real.household,
  });

  return {
    isActive: true,
    copiedAt: new Date().toISOString(),
    kpis: built.kpis,
    kpiOutsidePortfolio: real.kpiOutsidePortfolio,
    portfolio,
    portfolioSearchQuery: "",
    portfolioLastRefreshedAt: null,
    simulationIncludedAssetIds: included,
    projections: built.projections,
    chartData: built.chartData,
    projectionRevision: 1,
    monteCarlo: emptyMonteCarlo(),
    activeStressTest: null,
    stressTestResults: [],
  };
}

function mergePersistedPlayground(
  persisted: Partial<SimulationPlaygroundState>
): SimulationPlaygroundState {
  const empty = createEmptyPlayground();
  return {
    ...empty,
    ...persisted,
    kpis: normalizeKpiValues(persisted.kpis),
    portfolio: persisted.portfolio ?? [],
    portfolioSearchQuery: persisted.portfolioSearchQuery ?? "",
    portfolioLastRefreshedAt: persisted.portfolioLastRefreshedAt ?? null,
    simulationIncludedAssetIds: persisted.simulationIncludedAssetIds ?? [],
    projections: persisted.projections ?? [],
    chartData: persisted.chartData ?? [],
    monteCarlo: { ...empty.monteCarlo, ...persisted.monteCarlo },
    stressTestResults: persisted.stressTestResults ?? [],
  };
}

/** Restore sandbox from localStorage and rebuild projections (survives sessions until reset). */
export function normalizeSimPlayground(
  persisted: Partial<SimulationPlaygroundState> | undefined,
  real: {
    kpis: KPIValues;
    kpiOutsidePortfolio: number;
    portfolio: PortfolioAsset[];
    simulationIncludedAssetIds: string[];
    currency?: Currency;
    fxSnapshot?: FxSnapshot | null;
    household?: Household | null;
  }
): SimulationPlaygroundState {
  if (!persisted?.isActive) {
    return snapshotFromRealState(real);
  }

  const merged = mergePersistedPlayground(persisted);
  const built = buildPlaygroundProjections({
    ...merged,
    currency: real.currency,
    fxSnapshot: real.fxSnapshot,
    household: real.household,
  });

  return {
    ...merged,
    isActive: true,
    kpis: built.kpis,
    projections: built.projections,
    chartData: built.chartData,
  };
}

export function initialPlaygroundFromMock(
  kpis: KPIValues,
  kpiOutsidePortfolio: number,
  portfolio: PortfolioAsset[],
  simulationIncludedAssetIds: string[],
  currency?: Currency,
  fxSnapshot?: FxSnapshot | null,
  household?: Household | null
): SimulationPlaygroundState {
  return snapshotFromRealState({
    kpis,
    kpiOutsidePortfolio,
    portfolio,
    simulationIncludedAssetIds,
    currency,
    fxSnapshot,
    household,
  });
}