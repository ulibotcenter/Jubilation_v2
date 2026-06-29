import type { KPIField, KPIValues, PortfolioAsset, ProjectionYear } from "@/types";
import { calculatePortfolioValue } from "@/types";
import type { SimulationPlaygroundState } from "@/lib/simulationPlayground";

const TRACKED_KPI_FIELDS: KPIField[] = [
  "currentAge",
  "retirementAge",
  "currentNetWorth",
  "monthlyContribution",
  "desiredMonthlyIncome",
  "expectedCAGR",
  "annualInflation",
];

export interface PlaygroundKpiDelta {
  field: KPIField;
  label: string;
  real: number;
  sim: number;
  changed: boolean;
}

export interface PlaygroundDiffSummary {
  projectedDelta: number;
  projectedReal: number;
  projectedSim: number;
  netWorthDelta: number;
  portfolioValueDelta: number;
  holdingsDelta: number;
  realHoldings: number;
  simHoldings: number;
  kpiDeltas: PlaygroundKpiDelta[];
  hasChanges: boolean;
}

const KPI_LABELS: Record<KPIField, string> = {
  currentAge: "Current age",
  retirementAge: "Retirement age",
  currentNetWorth: "Net worth",
  monthlyContribution: "Monthly contribution",
  desiredMonthlyIncome: "Retirement income",
  expectedCAGR: "Expected CAGR",
  annualInflation: "Inflation",
};

function finalPortfolioValue(projections: ProjectionYear[]): number {
  return projections[projections.length - 1]?.portfolioValue ?? 0;
}

export function computePlaygroundDiff(
  real: {
    kpis: KPIValues;
    projections: ProjectionYear[];
    portfolio: PortfolioAsset[];
  },
  sim: SimulationPlaygroundState
): PlaygroundDiffSummary {
  const projectedReal = finalPortfolioValue(real.projections);
  const projectedSim = finalPortfolioValue(sim.projections);
  const realPortfolioValue = calculatePortfolioValue(real.portfolio);
  const simPortfolioValue = calculatePortfolioValue(sim.portfolio);

  const kpiDeltas: PlaygroundKpiDelta[] = TRACKED_KPI_FIELDS.map((field) => {
    const realVal = real.kpis[field];
    const simVal = sim.kpis[field];
    const changed =
      field === "expectedCAGR" || field === "annualInflation"
        ? Math.abs(realVal - simVal) > 0.05
        : realVal !== simVal;
    return {
      field,
      label: KPI_LABELS[field],
      real: realVal,
      sim: simVal,
      changed,
    };
  });

  const projectedDelta = projectedSim - projectedReal;
  const netWorthDelta = sim.kpis.currentNetWorth - real.kpis.currentNetWorth;
  const portfolioValueDelta = simPortfolioValue - realPortfolioValue;
  const holdingsDelta = sim.portfolio.length - real.portfolio.length;

  const hasChanges =
    projectedDelta !== 0 ||
    netWorthDelta !== 0 ||
    portfolioValueDelta !== 0 ||
    holdingsDelta !== 0 ||
    kpiDeltas.some((k) => k.changed);

  return {
    projectedDelta,
    projectedReal,
    projectedSim,
    netWorthDelta,
    portfolioValueDelta,
    holdingsDelta,
    realHoldings: real.portfolio.length,
    simHoldings: sim.portfolio.length,
    kpiDeltas,
    hasChanges,
  };
}