import {
  DEFAULT_LIFE_EXPECTANCY_AGE,
  DEFAULT_PORTFOLIO_REAL_RETURN,
} from "@/lib/engine/assumptions";
import { defaultPlan, type EnginePlan } from "@/lib/engine/plan";
import { annualToMonthly } from "@/lib/engine/rates";
import type { ProjectOptions } from "@/lib/engine/project";
import { solvePlan, type SolveResult } from "@/lib/engine/solve";
import { PUBLIC_CALCULATOR_AS_OF } from "@/lib/calculators/seo";

/** Real return after contributions stop. Public calculator default. */
export const DEFAULT_WITHDRAWAL_REAL_RETURN = 0.02;

export interface PublicIndependenceInput {
  currentAge: number;
  liquidWealth: number;
  monthlyContribution: number;
  monthlySpending: number;
  retirementAge: number;
  lifeExpectancy: number;
  realReturn: number;
  /** Real return while drawing down. Defaults to 2% on the freedom calculator. */
  withdrawalRealReturn: number;
}

export const FREEDOM_DEFAULTS: PublicIndependenceInput = {
  currentAge: 32,
  liquidWealth: 50_000,
  monthlyContribution: 2_000,
  monthlySpending: 6_000,
  retirementAge: 65,
  lifeExpectancy: DEFAULT_LIFE_EXPECTANCY_AGE,
  realReturn: DEFAULT_PORTFOLIO_REAL_RETURN,
  withdrawalRealReturn: DEFAULT_WITHDRAWAL_REAL_RETURN,
};

export const INCOME_DEFAULTS: PublicIndependenceInput = {
  currentAge: 45,
  liquidWealth: 200_000,
  monthlyContribution: 2_500,
  monthlySpending: 8_000,
  retirementAge: 65,
  lifeExpectancy: DEFAULT_LIFE_EXPECTANCY_AGE,
  realReturn: DEFAULT_PORTFOLIO_REAL_RETURN,
  withdrawalRealReturn: DEFAULT_WITHDRAWAL_REAL_RETURN,
};

function toCents(reais: number): number {
  return Math.round(reais * 100);
}

/** Build the same EnginePlan the app uses. Does not change engine math. */
export function publicIndependencePlan(
  input: PublicIndependenceInput
): EnginePlan {
  const spending = toCents(input.monthlySpending);
  return defaultPlan({
    currentAge: input.currentAge,
    retirementAge: input.retirementAge,
    lifeExpectancy: input.lifeExpectancy,
    asOf: PUBLIC_CALCULATOR_AS_OF,
    liquidCents: toCents(input.liquidWealth),
    monthlyContributionCents: toCents(input.monthlyContribution),
    monthlySpendingCents: spending,
    monthlyLifestyleCents: spending,
    liquidRealReturn: input.realReturn,
    applyTaxes: false,
  });
}

/** Accumulation yield until retirementAge, withdrawal yield after. Same engine. */
export function twoPhaseReturnOptions(
  plan: EnginePlan,
  withdrawalRealReturn = DEFAULT_WITHDRAWAL_REAL_RETURN
): ProjectOptions {
  const accum = annualToMonthly(plan.liquidRealReturn);
  const withdraw = annualToMonthly(withdrawalRealReturn);
  return {
    liquidMonthlyReturnAt: (month) => {
      const ageAtEnd = plan.currentAge + Math.ceil(month / 12);
      return ageAtEnd >= plan.retirementAge ? withdraw : accum;
    },
  };
}

/**
 * One growth percent for the public freedom page.
 * Accumulation and withdrawal both receive `realReturn`.
 * This does not change the bisection or the yearly projection.
 */
export function shareRealReturn(
  input: PublicIndependenceInput
): PublicIndependenceInput {
  return { ...input, withdrawalRealReturn: input.realReturn };
}

/** Contribution and lifestyle fixed; solve the earliest feasible retirement age. */
export function solveFreedomDate(input: PublicIndependenceInput): SolveResult {
  const withdraw = input.withdrawalRealReturn;
  return solvePlan(publicIndependencePlan(input), "date", (trial) =>
    twoPhaseReturnOptions(trial, withdraw)
  );
}

/** Retirement date fixed; solve the largest sustainable monthly spending. */
export function solveRetirementIncome(
  input: PublicIndependenceInput
): SolveResult {
  return solvePlan(publicIndependencePlan(input), "income");
}
