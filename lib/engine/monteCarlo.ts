import { projectPlan } from "@/lib/engine/project";
import { planMeta, type EnginePlan } from "@/lib/engine/plan";
import { mulberry32, shockReturn } from "@/lib/engine/rng";
import { annualToMonthly } from "@/lib/engine/rates";
import { retirementTarget } from "@/lib/engine/target";
import type { MonteCarloScenario } from "@/types";

export const MONTE_CARLO_SCENARIO_SHOCKS: Record<
  MonteCarloScenario,
  { cagrOffset: number; volatility: number }
> = {
  pessimistic: { cagrOffset: -0.02, volatility: 0.18 },
  base: { cagrOffset: 0, volatility: 0.15 },
  optimistic: { cagrOffset: 0.02, volatility: 0.12 },
};

export interface MonteCarloPathStats {
  finalLiquidCents: number;
  finalTotalCents: number;
  ruinAge: number | null;
  succeeded: boolean;
  byAgeTotal: Map<number, number>;
}

export interface MonteCarloEngineResult {
  scenario: MonteCarloScenario;
  medianValue: number;
  successRate: number;
  percentile10: number;
  percentile90: number;
  ruinAgeP50: number | null;
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(sorted.length * p))
  );
  return sorted[idx] ?? 0;
}

function scenarioSeed(plan: EnginePlan, scenario: MonteCarloScenario, extra = 0): number {
  const tag = scenario === "base" ? 1 : scenario === "pessimistic" ? 2 : 3;
  return (plan.seed * 1_000_003 + tag * 97 + extra) >>> 0;
}

export function simulateOnePath(
  plan: EnginePlan,
  rng: () => number,
  volatility: number,
  meanOffset = 0
): MonteCarloPathStats {
  const meanMonthly = annualToMonthly(plan.liquidRealReturn + meanOffset);
  const illiquidMonthly = annualToMonthly(plan.illiquidRealReturn);
  const monthlyVol = volatility / Math.sqrt(12);

  const result = projectPlan(plan, {
    liquidMonthlyReturnAt: () => shockReturn(meanMonthly, monthlyVol, rng, true),
    illiquidMonthlyReturnAt: () => illiquidMonthly,
  });

  const target = retirementTarget({
    desiredMonthlyIncome: plan.monthlySpendingCents / 100,
    monthlyExpenses: plan.monthlyLifestyleCents / 100,
  });
  const hasGoal = target.annualSpending != null && target.annualSpending > 0;
  const succeeded = hasGoal && result.ruinAge == null;

  const byAgeTotal = new Map<number, number>();
  for (const row of result.years) {
    byAgeTotal.set(row.age, Math.round(row.portfolioValue * 100));
  }

  return {
    finalLiquidCents: result.liquidEndCents,
    finalTotalCents: result.liquidEndCents + result.illiquidEndCents,
    ruinAge: result.ruinAge,
    succeeded,
    byAgeTotal,
  };
}

export function runMonteCarloPlan(
  plan: EnginePlan,
  options: {
    iterations?: number;
    scenario?: MonteCarloScenario;
    volatility?: number;
    cagrOffset?: number;
  } = {}
): {
  finals: number[];
  successRate: number;
  medianValue: number;
  percentile10: number;
  percentile90: number;
  ruinAges: Array<number | null>;
  pathsByAge: Map<number, number[]>;
} {
  const scenario = options.scenario ?? "base";
  const shock = MONTE_CARLO_SCENARIO_SHOCKS[scenario];
  const iterations = options.iterations ?? 1000;
  const volatility = options.volatility ?? shock.volatility;
  const cagrOffset = options.cagrOffset ?? shock.cagrOffset;
  const rng = mulberry32(scenarioSeed(plan, scenario));

  const finals: number[] = [];
  const ruinAges: Array<number | null> = [];
  const pathsByAge = new Map<number, number[]>();
  let successes = 0;

  for (let i = 0; i < iterations; i++) {
    const path = simulateOnePath(plan, rng, volatility, cagrOffset);
    const major = Math.round(path.finalTotalCents / 100);
    finals.push(major);
    ruinAges.push(path.ruinAge);
    if (path.succeeded) successes += 1;
    for (const [age, cents] of path.byAgeTotal) {
      const list = pathsByAge.get(age) ?? [];
      list.push(Math.round(cents / 100));
      pathsByAge.set(age, list);
    }
  }

  const sorted = [...finals].sort((a, b) => a - b);
  return {
    finals: sorted,
    successRate: Math.round((successes / Math.max(1, iterations)) * 100),
    medianValue: Math.round(percentile(sorted, 0.5)),
    percentile10: Math.round(percentile(sorted, 0.1)),
    percentile90: Math.round(percentile(sorted, 0.9)),
    ruinAges,
    pathsByAge,
  };
}

export function runMonteCarloFromPlan(
  plan: EnginePlan,
  iterations = 1000
): {
  results: MonteCarloEngineResult[];
  finalValuesByScenario: Record<MonteCarloScenario, number[]>;
  target: number | null;
  pathsByAgeBase: Map<number, number[]>;
  meta: ReturnType<typeof planMeta>;
} {
  const targetInfo = retirementTarget({
    desiredMonthlyIncome: plan.monthlySpendingCents / 100,
    monthlyExpenses: plan.monthlyLifestyleCents / 100,
  });
  const scenarios: MonteCarloScenario[] = ["pessimistic", "base", "optimistic"];
  const results: MonteCarloEngineResult[] = [];
  const finalValuesByScenario = {} as Record<MonteCarloScenario, number[]>;
  let pathsByAgeBase = new Map<number, number[]>();

  for (const scenario of scenarios) {
    const run = runMonteCarloPlan(plan, { iterations, scenario });
    finalValuesByScenario[scenario] = run.finals;
    const ruinSorted = run.ruinAges
      .filter((a): a is number => a != null)
      .sort((a, b) => a - b);
    results.push({
      scenario,
      medianValue: run.medianValue,
      successRate: run.successRate,
      percentile10: run.percentile10,
      percentile90: run.percentile90,
      ruinAgeP50:
        ruinSorted.length > 0
          ? ruinSorted[Math.floor(ruinSorted.length / 2)] ?? null
          : null,
    });
    if (scenario === "base") pathsByAgeBase = run.pathsByAge;
  }

  return {
    results,
    finalValuesByScenario,
    target: targetInfo.capitalTarget,
    pathsByAgeBase,
    meta: planMeta(plan, iterations),
  };
}
