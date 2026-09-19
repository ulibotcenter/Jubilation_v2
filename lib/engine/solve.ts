import { projectPlan } from "@/lib/engine/project";
import type { EnginePlan } from "@/lib/engine/plan";

export type SolveUnknown = "income" | "date" | "contribution";

export interface SolveResult {
  unknown: SolveUnknown;
  value: number;
  iterations: number;
  feasible: boolean;
}

function survives(plan: EnginePlan): boolean {
  return projectPlan(plan).ruinAge == null;
}

/** Smallest feasible x in [lo, hi]. Used for contribution. */
function bisectMin(
  lo: number,
  hi: number,
  feasible: (x: number) => boolean,
  maxIter = 48
): { value: number; iterations: number; feasible: boolean } {
  if (feasible(lo)) return { value: lo, iterations: 0, feasible: true };
  if (!feasible(hi)) return { value: hi, iterations: 0, feasible: false };
  let a = lo;
  let b = hi;
  let i = 0;
  for (; i < maxIter; i++) {
    const mid = (a + b) / 2;
    if (feasible(mid)) b = mid;
    else a = mid;
    if (b - a < 1) break;
  }
  return { value: b, iterations: i + 1, feasible: true };
}

/** Largest feasible x in [lo, hi]. Used for sustainable income. */
function bisectMax(
  lo: number,
  hi: number,
  feasible: (x: number) => boolean,
  maxIter = 48
): { value: number; iterations: number; feasible: boolean } {
  if (!feasible(lo)) return { value: lo, iterations: 0, feasible: false };
  if (feasible(hi)) return { value: hi, iterations: 0, feasible: true };
  let a = lo;
  let b = hi;
  let i = 0;
  for (; i < maxIter; i++) {
    const mid = (a + b) / 2;
    if (feasible(mid)) a = mid;
    else b = mid;
    if (b - a < 1) break;
  }
  return { value: a, iterations: i + 1, feasible: true };
}

/**
 * One engine, one solver, three questions:
 * - income: max sustainable monthly net spending with date fixed
 * - date: earliest retirement age with contribution fixed
 * - contribution: monthly deposit needed with date and income fixed
 */
export function solvePlan(plan: EnginePlan, unknown: SolveUnknown): SolveResult {
  if (unknown === "income") {
    const hi = Math.max(
      50_000_00,
      plan.liquidCents / 12,
      plan.monthlyContributionCents * 240,
      1_000_00
    );
    // Spending of 0 falls through to lifestyle / 4% inside projectPlan.
    // Zero lifestyle and start at 1 cent so the search is the actual spend.
    const trial = (cents: number) =>
      survives({
        ...plan,
        monthlySpendingCents: Math.round(cents),
        monthlyLifestyleCents: 0,
      });
    const found = bisectMax(1, hi, trial);
    return {
      unknown,
      value: found.feasible ? found.value / 100 : 0,
      iterations: found.iterations,
      feasible: found.feasible,
    };
  }

  if (unknown === "contribution") {
    const hi = Math.max(50_000_00, plan.monthlyContributionCents * 20, 1_000_00);
    const found = bisectMin(0, hi, (cents) =>
      survives({ ...plan, monthlyContributionCents: Math.round(cents) })
    );
    return {
      unknown,
      value: found.value / 100,
      iterations: found.iterations,
      feasible: found.feasible,
    };
  }

  const lo = plan.currentAge + 1;
  const hi = plan.lifeExpectancy - 1;
  if (lo >= hi) {
    return { unknown, value: plan.retirementAge, iterations: 0, feasible: false };
  }
  if (!survives({ ...plan, retirementAge: hi })) {
    return { unknown, value: hi, iterations: 0, feasible: false };
  }
  let a = lo;
  let b = hi;
  let i = 0;
  for (; i < 40; i++) {
    const mid = Math.floor((a + b) / 2);
    if (survives({ ...plan, retirementAge: mid })) b = mid;
    else a = mid + 1;
    if (a >= b) break;
  }
  return { unknown, value: b, iterations: i + 1, feasible: true };
}
