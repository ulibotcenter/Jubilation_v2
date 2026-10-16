import {
  DEFAULT_WITHDRAWAL_REAL_RETURN,
  publicIndependencePlan,
  solveFreedomDate,
  twoPhaseReturnOptions,
  type PublicIndependenceInput,
} from "@/lib/calculators/independence";
import { projectPlan, projectYears } from "@/lib/engine/project";
import { convertAmount } from "@/lib/fx/convert";
import type { FxRates } from "@/lib/fx/types";
import type { Currency, ProjectionYear } from "@/types";
import type { SolveResult } from "@/lib/engine/solve";

export type IndependenceChartPoint = { age: number; wealth: number };

export type FreedomChartPoint = {
  age: number;
  wealth: number;
  accumulate: number | null;
  withdraw: number | null;
  /** Remaining money in (seed + contributions), scaled to current wealth. */
  contributions: number;
  /** Remaining compound interest, scaled to current wealth. */
  returns: number;
  /** Cumulative freedom-phase portfolio draws (0 while contributing). */
  withdrawals: number;
};

/**
 * Accumulation path from the public calculator engine.
 * `retirementAge` is pinned at the visible horizon so spending does not
 * pull the series down — the landing chart is growth, including from zero wealth.
 */
export function independenceChartSeries(
  input: PublicIndependenceInput,
  untilAge = input.lifeExpectancy
): IndependenceChartPoint[] {
  const horizon = Math.max(input.currentAge, untilAge);
  return projectYears(
    publicIndependencePlan({
      ...input,
      retirementAge: horizon,
      lifeExpectancy: Math.max(input.lifeExpectancy, horizon),
    })
  )
    .filter((row) => row.age <= horizon)
    .map((row) => ({ age: row.age, wealth: row.portfolioValue }));
}

/**
 * Freedom calculator path: contribute until the solved date, then draw down
 * at the withdrawal-phase real yield through the target age.
 */
export function freedomChartSeries(input: PublicIndependenceInput): {
  series: FreedomChartPoint[];
  result: SolveResult;
  freedomAge: number;
} {
  const result = solveFreedomDate(input);
  const freedomAge = result.feasible
    ? Math.max(input.currentAge, Math.round(result.value))
    : Math.max(input.currentAge, input.lifeExpectancy);
  const plan = publicIndependencePlan({
    ...input,
    retirementAge: freedomAge,
    lifeExpectancy: Math.max(input.lifeExpectancy, freedomAge),
  });
  const years = projectPlan(
    plan,
    twoPhaseReturnOptions(
      plan,
      input.withdrawalRealReturn ?? DEFAULT_WITHDRAWAL_REAL_RETURN
    )
  ).years;

  const series: FreedomChartPoint[] = stackFreedomChart(years, freedomAge);
  const split = series.find((point) => point.age === freedomAge);
  if (split) split.accumulate = split.wealth;

  return { series, result, freedomAge };
}

/**
 * Visual layers from an already-solved yearly projection.
 * Does not call the solver. Remaining contributions + remaining returns
 * always equal current wealth; withdrawals accumulate only after freedom.
 */
export function stackFreedomChart(
  years: ProjectionYear[],
  freedomAge: number
): FreedomChartPoint[] {
  let contribPool = 0;
  let returnPool = 0;
  let cumWithdrawals = 0;
  let prevWealth = 0;

  return years.map((row, index) => {
    const wealth = row.portfolioValue;
    const withdrawing = row.age >= freedomAge;

    if (index === 0) {
      contribPool = Math.max(0, wealth);
      returnPool = 0;
      prevWealth = wealth;
      return {
        age: row.age,
        wealth,
        accumulate: wealth,
        withdraw: withdrawing ? wealth : null,
        contributions: contribPool,
        returns: 0,
        withdrawals: 0,
      };
    }

    contribPool += Math.max(0, row.contributions);
    returnPool += row.returns;

    const expected = prevWealth + row.contributions + row.returns;
    const drawn = Math.max(0, expected - wealth);
    if (withdrawing) cumWithdrawals += drawn;

    const pool = contribPool + returnPool;
    if (pool > 0 && wealth > 0) {
      const scale = wealth / pool;
      contribPool *= scale;
      returnPool *= scale;
    } else if (wealth <= 0) {
      contribPool = 0;
      returnPool = 0;
    }

    const contributions = Math.max(0, contribPool);
    const returns = Math.max(0, wealth - contributions);
    contribPool = contributions;
    returnPool = returns;
    prevWealth = wealth;

    return {
      age: row.age,
      wealth,
      accumulate: withdrawing ? null : wealth,
      withdraw: withdrawing ? wealth : null,
      contributions,
      returns,
      withdrawals: withdrawing ? cumWithdrawals : 0,
    };
  });
}

export function convertChartSeries(
  series: IndependenceChartPoint[],
  from: Currency,
  to: Currency,
  rates: FxRates
): IndependenceChartPoint[] {
  if (from === to) return series;
  return series.map((point) => ({
    age: point.age,
    wealth: convertAmount(point.wealth, from, to, rates),
  }));
}

export function chartPeakWealth(
  series: IndependenceChartPoint[],
  age: number
): number {
  return series.find((point) => point.age === age)?.wealth ?? series.at(-1)?.wealth ?? 0;
}
