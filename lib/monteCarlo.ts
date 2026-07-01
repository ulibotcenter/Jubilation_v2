import {
  buildSingleBucketConfig,
  runMonteCarloFromConfig,
} from "@/lib/projectionEngine";
import {
  buildDistributionBins,
  MONTE_CARLO_SCENARIO_LABELS,
  type KPIValues,
  type DistributionBin,
  type MonteCarloResult,
  type MonteCarloScenario,
  type MonteCarloSimulationOutput,
} from "@/types";

export function runMonteCarloSimulation(
  kpis: KPIValues,
  iterations = 1000
): MonteCarloSimulationOutput {
  const target =
    kpis.desiredMonthlyIncome > 0
      ? kpis.desiredMonthlyIncome * 12 * 25
      : kpis.currentNetWorth * 25;
  const output = runMonteCarloFromConfig(
    buildSingleBucketConfig(kpis),
    iterations
  );
  const results: MonteCarloResult[] = output.results.map((row) => ({
    scenario: row.scenario,
    label: MONTE_CARLO_SCENARIO_LABELS[row.scenario],
    finalValue: row.medianValue,
    medianValue: row.medianValue,
    successRate: row.successRate,
    percentile10: row.percentile10,
    percentile90: row.percentile90,
  }));
  const distributions = {} as Record<MonteCarloScenario, DistributionBin[]>;
  for (const row of output.results) {
    distributions[row.scenario] = buildDistributionBins(
      output.finalValuesByScenario[row.scenario],
      target
    );
  }

  return { results, distributions, target };
}