import {
  toProjectionChartData,
  underLineFreedomChart,
  type ProjectionChartPoint,
} from "@/lib/calculators/chartSeries";
import type { KPIValues, ProjectionYear } from "@/types";

export type SimulationProjectionChartInput = {
  data: ProjectionChartPoint[];
  freedomAge: number;
};

/**
 * Maps the already-solved sandbox path onto the public calculator chart
 * rows. Does not re-run the engine or add scenario lines.
 */
export function simulationProjectionChartInput(
  projections: ProjectionYear[],
  kpis: KPIValues
): SimulationProjectionChartInput {
  return {
    data: toProjectionChartData(
      underLineFreedomChart(projections, kpis.retirementAge)
    ),
    freedomAge: kpis.retirementAge,
  };
}
