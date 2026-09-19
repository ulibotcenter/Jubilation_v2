import { projectPlan } from "@/lib/engine/project";
import type { EnginePlan } from "@/lib/engine/plan";
import { retirementTarget } from "@/lib/engine/target";
import type { StressTestId, StressTestResult } from "@/types";

export interface StressSpec {
  id: StressTestId;
  /** Applied to liquid wealth at the start of retirement (sequence risk). */
  retirementDrawdown: number;
  cagrDelta: number;
  inflationDelta: number;
  retirementAgeDelta: number;
  contributionFactor: number;
}

export const STRESS_SPECS: Record<StressTestId, StressSpec> = {
  "market-crash": {
    id: "market-crash",
    retirementDrawdown: 0.4,
    cagrDelta: 0,
    inflationDelta: 0,
    retirementAgeDelta: 0,
    contributionFactor: 1,
  },
  stagflation: {
    id: "stagflation",
    retirementDrawdown: 0.15,
    cagrDelta: -0.02,
    inflationDelta: 0.05,
    retirementAgeDelta: 0,
    contributionFactor: 1,
  },
  "early-retirement": {
    id: "early-retirement",
    retirementDrawdown: 0,
    cagrDelta: 0,
    inflationDelta: 0,
    retirementAgeDelta: -5,
    contributionFactor: 0.5,
  },
};

function withStress(plan: EnginePlan, spec: StressSpec): EnginePlan {
  const retirementAge = Math.max(
    plan.currentAge + 1,
    plan.retirementAge + spec.retirementAgeDelta
  );
  return {
    ...plan,
    retirementAge,
    liquidRealReturn: plan.liquidRealReturn + spec.cagrDelta,
    inflation: plan.inflation + spec.inflationDelta,
    monthlyContributionCents: Math.round(
      plan.monthlyContributionCents * spec.contributionFactor
    ),
  };
}

/**
 * Same engine on both sides. Crash hits the first retirement month, not today.
 * "On track" means the stressed plan still funds spending without ruin —
 * never `currentNetWorth × 25`.
 */
export function runStressOnPlan(
  testId: StressTestId,
  plan: EnginePlan
): StressTestResult & { ruinAge: number | null; target: number | null } {
  const spec = STRESS_SPECS[testId];
  if (!spec) {
    throw new Error(`Unknown stress test: ${testId}`);
  }

  const baseline = projectPlan(plan);
  const atRet =
    baseline.years.find((y) => y.age === plan.retirementAge) ??
    baseline.years[0];
  const originalValue = atRet?.portfolioValue ?? 0;

  const stressedPlan = withStress(plan, spec);
  const retireMonth = Math.max(
    1,
    (stressedPlan.retirementAge - stressedPlan.currentAge) * 12 - 11
  );

  const stressed = projectPlan(stressedPlan, {
    liquidMonthlyReturnAt: (month) => {
      const base =
        Math.pow(1 + stressedPlan.liquidRealReturn, 1 / 12) - 1;
      if (month === retireMonth && spec.retirementDrawdown > 0) {
        return (1 + base) * (1 - spec.retirementDrawdown) - 1;
      }
      return base;
    },
  });

  const stressedRow =
    stressed.years.find((y) => y.age === stressedPlan.retirementAge) ??
    stressed.years[stressed.years.length - 1];
  const stressedValue = stressedRow?.portfolioValue ?? 0;

  const target = retirementTarget({
    desiredMonthlyIncome: plan.monthlySpendingCents / 100,
    monthlyExpenses: plan.monthlyLifestyleCents / 100,
  });

  const hasGoal = target.annualSpending != null && target.annualSpending > 0;
  const stillOnTrack = hasGoal && stressed.ruinAge == null;
  const shortfall = hasGoal
    ? Math.max(0, Math.round((target.capitalTarget ?? 0) - stressedValue))
    : 0;

  return {
    testId,
    originalValue,
    stressedValue,
    shortfall,
    stillOnTrack,
    ruinAge: stressed.ruinAge,
    target: target.capitalTarget,
  };
}
