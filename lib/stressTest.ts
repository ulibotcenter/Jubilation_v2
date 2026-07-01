import {
  buildSingleBucketConfig,
  runProjectionEngine,
} from "@/lib/projectionEngine";
import {
  STRESS_TESTS,
  type KPIValues,
  type ProjectionYear,
  type StressTestId,
  type StressTestResult,
} from "@/types";

export function runStressTest(
  testId: StressTestId,
  kpis: KPIValues,
  projections: ProjectionYear[]
): StressTestResult {
  const test = STRESS_TESTS.find((t) => t.id === testId)!;
  const baselineRow = projections.find((p) => p.age === kpis.retirementAge);
  const originalValue = baselineRow?.portfolioValue ?? 0;

  const adjustedKpis: KPIValues = {
    ...kpis,
    expectedCAGR: kpis.expectedCAGR + test.cagrImpact,
    annualInflation: kpis.annualInflation + test.inflationImpact,
    retirementAge:
      testId === "early-retirement"
        ? kpis.retirementAge - 5
        : kpis.retirementAge,
    currentNetWorth:
      test.drawdown > 0
        ? kpis.currentNetWorth * (1 - test.drawdown / 100)
        : kpis.currentNetWorth,
    monthlyContribution:
      testId === "early-retirement"
        ? kpis.monthlyContribution * 0.5
        : kpis.monthlyContribution,
  };

  const stressedProjections = runProjectionEngine(
    buildSingleBucketConfig(adjustedKpis)
  );
  const stressedRow = stressedProjections.find(
    (p) => p.age === adjustedKpis.retirementAge
  );
  const stressedValue = stressedRow?.portfolioValue ?? 0;
  const target = kpis.currentNetWorth * 25;

  return {
    testId,
    originalValue,
    stressedValue,
    shortfall: Math.max(0, target - stressedValue),
    stillOnTrack: stressedValue >= target * 0.8,
  };
}