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
  /** Cumulative contributions (seed + inflows). Plateaus after freedom. */
  contributions: number;
  /** Cumulative returns sitting on contributions (journey band, not remaining stock). */
  returns: number;
  /** Cumulative withdrawals as a modest bottom band in freedom years. */
  withdrawals: number;
};

/** Presentational rows for `ProjectionChart` — same numbers, Portuguese keys. */
export type ProjectionChartPoint = {
  age: number;
  aportes: number;
  rendimentos: number;
  saques: number;
  patrimonio: number;
};

export function toProjectionChartData(
  series: FreedomChartPoint[]
): ProjectionChartPoint[] {
  return series.map((point) => ({
    age: point.age,
    aportes: point.contributions,
    rendimentos: point.returns,
    saques: point.withdrawals,
    patrimonio: point.wealth,
  }));
}

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

/** Solved yearly path for the public freedom calculator. Does not restack. */
export function freedomProjection(input: PublicIndependenceInput): {
  years: ProjectionYear[];
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
  return { years, result, freedomAge };
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
  const { years, result, freedomAge } = freedomProjection(input);
  const series: FreedomChartPoint[] = journeyFreedomChart(years, freedomAge);
  const split = series.find((point) => point.age === freedomAge);
  if (split) split.accumulate = split.wealth;

  return { series, result, freedomAge };
}

/**
 * Visual journey layers from an already-solved yearly projection.
 * Does not call the solver and does not change engine wealth.
 *
 * Bottom band = cumulative contributions (plateau after freedom).
 * Middle band = cumulative returns sitting on contributions; after the
 * peak the gold top eases only a little so the stack stays a layered hill
 * instead of a remaining-stock envelope under the declining line.
 * Coral = cumulative withdrawals as a modest bottom band in freedom years.
 */
export function journeyFreedomChart(
  years: ProjectionYear[],
  freedomAge: number
): FreedomChartPoint[] {
  let cumContrib = 0;
  let cumReturns = 0;
  let cumWithdraw = 0;

  const raw: FreedomChartPoint[] = years.map((row, index) => {
    const wealth = row.portfolioValue;
    const withdrawing = row.age >= freedomAge;
    if (index === 0) {
      cumContrib = Math.max(0, wealth);
    } else {
      cumContrib += Math.max(0, row.contributions);
      cumReturns += Math.max(0, row.returns);
      if (withdrawing) {
        cumWithdraw += Math.max(0, row.expenses);
      }
    }
    return {
      age: row.age,
      wealth,
      accumulate: withdrawing ? null : wealth,
      withdraw: withdrawing ? wealth : null,
      contributions: cumContrib,
      returns: cumReturns,
      withdrawals: withdrawing ? cumWithdraw : 0,
    };
  });

  if (raw.length === 0) return raw;

  const peak = raw.reduce((best, point) =>
    point.wealth > best.wealth ? point : best
  );
  const peakGoldTop = peak.contributions + peak.returns;
  const coralCap = peak.contributions * 0.26;

  return raw.map((point) => {
    let { contributions, returns, withdrawals } = point;
    if (point.age > peak.age) {
      const drop = Math.max(0, peak.wealth - point.wealth);
      const goldTop = Math.max(contributions, peakGoldTop - 0.18 * drop);
      returns = Math.max(0, goldTop - contributions);
    }
    withdrawals =
      point.age >= freedomAge
        ? Math.min(Math.max(0, withdrawals), coralCap)
        : 0;
    return { ...point, contributions, returns, withdrawals };
  });
}

/**
 * Visual layers from an already-solved yearly projection.
 * Does not call the solver. Remaining contributions + remaining returns
 * always equal current wealth. After freedom, withdrawals fill the gap
 * from the peak so the stack shows drawdown without leaving the path.
 */
export function stackFreedomChart(
  years: ProjectionYear[],
  freedomAge: number
): FreedomChartPoint[] {
  let contribPool = 0;
  let returnPool = 0;
  let peakWealth = 0;

  return years.map((row, index) => {
    const wealth = row.portfolioValue;
    const withdrawing = row.age >= freedomAge;

    if (index === 0) {
      contribPool = Math.max(0, wealth);
      returnPool = 0;
      peakWealth = Math.max(0, wealth);
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
    peakWealth = Math.max(peakWealth, wealth);
    const withdrawals = withdrawing ? Math.max(0, peakWealth - wealth) : 0;

    return {
      age: row.age,
      wealth,
      accumulate: withdrawing ? null : wealth,
      withdraw: withdrawing ? wealth : null,
      contributions,
      returns,
      withdrawals,
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

export function chartPeakPoint<T extends { age: number; wealth: number }>(
  series: T[]
): T | undefined {
  if (series.length === 0) return undefined;
  return series.reduce((best, point) =>
    point.wealth > best.wealth ? point : best
  );
}
