import {
  toProjectionChartData,
  underLineFreedomChart,
  type ProjectionChartPoint,
} from "@/lib/calculators/chartSeries";
import { buildDisplayChartData } from "@/lib/projectionChartData";
import type {
  ChartDataPoint,
  KPIValues,
  MonteCarloResult,
  ProjectionYear,
} from "@/types";

export type ScenarioWealthPoint = { age: number; wealth: number };

export type SimulationProjectionChartInput = {
  data: ProjectionChartPoint[];
  freedomAge: number;
  scenarios: {
    optimistic: ScenarioWealthPoint[];
    pessimistic: ScenarioWealthPoint[];
  };
};

/**
 * Maps the already-solved sandbox path onto the public calculator chart
 * rows, plus display-only optimistic / pessimistic wealth lines.
 * Does not re-run the engine.
 */
export function simulationProjectionChartInput(
  projections: ProjectionYear[],
  chartData: ChartDataPoint[],
  kpis: KPIValues,
  monteCarlo?: {
    hasRun: boolean;
    results: MonteCarloResult[];
  }
): SimulationProjectionChartInput {
  const data = toProjectionChartData(
    underLineFreedomChart(projections, kpis.retirementAge)
  );
  const display = buildDisplayChartData(
    chartData,
    projections,
    kpis,
    monteCarlo
  );
  return {
    data,
    freedomAge: kpis.retirementAge,
    scenarios: {
      optimistic: display.map((point) => ({
        age: point.age,
        wealth: point.optimistic ?? point.value,
      })),
      pessimistic: display.map((point) => ({
        age: point.age,
        wealth: point.pessimistic ?? point.value,
      })),
    },
  };
}
