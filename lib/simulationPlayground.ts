import { getDefaultIncludedAssetIds } from "@/lib/simulationScope";
import { syncNetWorthWithPortfolio } from "@/lib/netWorthSync";
import { resolveSimulationKpis } from "@/lib/simulationScope";
import {
  DEFAULT_KPI_VALUES,
  normalizeKpiValues,
  generateChartData,
  generateProjections,
  MOCK_PORTFOLIO,
  type ChartDataPoint,
  type DistributionBin,
  type KPIValues,
  type MonteCarloResult,
  type MonteCarloScenario,
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
    lastRunAt: string | null;
    results: MonteCarloResult[];
    distributions: Record<MonteCarloScenario, DistributionBin[]> | null;
    target: number | null;
    iterations: number;
  };
  activeStressTest: StressTestId | null;
  stressTestResults: StressTestResult[];
}

function emptyMonteCarlo(): SimulationPlaygroundState["monteCarlo"] {
  return {
    hasRun: false,
    isRunning: false,
    lastRunAt: null,
    results: [],
    distributions: null,
    target: null,
    iterations: 1000,
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
}) {
  const syncedKpis = syncNetWorthWithPortfolio(
    normalizeKpiValues(state.kpis),
    state.portfolio,
    state.kpiOutsidePortfolio
  );
  const effectiveKpis = resolveSimulationKpis(
    syncedKpis,
    state.portfolio,
    state.simulationIncludedAssetIds,
    state.kpiOutsidePortfolio
  );
  const projections = generateProjections(effectiveKpis);
  return {
    kpis: syncedKpis,
    effectiveKpis,
    projections,
    chartData: generateChartData(projections),
  };
}

export function snapshotFromRealState(real: {
  kpis: KPIValues;
  kpiOutsidePortfolio: number;
  portfolio: PortfolioAsset[];
  simulationIncludedAssetIds: string[];
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
  }
): SimulationPlaygroundState {
  if (!persisted?.isActive || !persisted.portfolio?.length) {
    return snapshotFromRealState(real);
  }

  const merged = mergePersistedPlayground(persisted);
  const built = buildPlaygroundProjections(merged);

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
  simulationIncludedAssetIds: string[]
): SimulationPlaygroundState {
  return snapshotFromRealState({
    kpis,
    kpiOutsidePortfolio,
    portfolio,
    simulationIncludedAssetIds,
  });
}