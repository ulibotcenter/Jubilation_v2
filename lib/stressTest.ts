import { buildSingleBucketConfig, type ProjectionEngineConfig } from "@/lib/projectionEngine";
import { runStressOnPlan } from "@/lib/engine/stress";
import {
  STRESS_TESTS,
  type KPIValues,
  type ProjectionYear,
  type StressTestId,
  type StressTestResult,
} from "@/types";

function toResult(
  testId: StressTestId,
  raw: ReturnType<typeof runStressOnPlan>
): StressTestResult {
  return {
    testId,
    originalValue: raw.originalValue,
    stressedValue: raw.stressedValue,
    shortfall: raw.shortfall,
    stillOnTrack: raw.stillOnTrack,
    ruinAge: raw.ruinAge,
    target: raw.target,
  };
}

export function runStressTestFromConfig(
  testId: StressTestId,
  config: ProjectionEngineConfig
): StressTestResult {
  if (!STRESS_TESTS.some((t) => t.id === testId)) {
    throw new Error(`Unknown stress test: ${testId}`);
  }
  return toResult(testId, runStressOnPlan(testId, config.plan));
}

export function runStressTest(
  testId: StressTestId,
  kpis: KPIValues,
  _projections: ProjectionYear[]
): StressTestResult {
  return runStressTestFromConfig(testId, buildSingleBucketConfig(kpis));
}
