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
  /** Share of current wealth from cumulative contributions. */
  contributions: number;
  /** Share of current wealth from cumulative returns. */
  returns: number;
  /** Share of current wealth from cumulative withdrawals. Zero before freedom. */
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
  const series: FreedomChartPoint[] = underLineFreedomChart(years, freedomAge);
  const split = series.find((point) => point.age === freedomAge);
  if (split) split.accumulate = split.wealth;

  return { series, result, freedomAge };
}

/**
 * Visual layers under the wealth line. Real cumulative contributions,
 * returns, and withdrawals are scaled so the three bands sum to that year's
 * patrimonio. Nothing is added on top of the engine balance. Coral is zero
 * before freedom. Does not call the solver.
 */
export function underLineFreedomChart(
  years: ProjectionYear[],
  freedomAge: number
): FreedomChartPoint[] {
  let contributed = 0;
  let earned = 0;
  let drawn = 0;

  return years.map((row, index) => {
    const wealth = row.portfolioValue;
    const withdrawing = row.age >= freedomAge;
    const safe = Math.max(0, wealth);
    if (index === 0) {
      contributed = safe;
      earned = 0;
      drawn = 0;
    } else {
      contributed += Math.max(0, row.contributions);
      earned += Math.max(0, row.returns);
      if (withdrawing) drawn += Math.max(0, row.expenses);
    }
    const rawWithdrawn = withdrawing ? drawn : 0;
    const flow = contributed + earned + rawWithdrawn;
    let contributions = 0;
    let returns = 0;
    let withdrawals = 0;
    if (safe > 0 && flow > 0) {
      contributions = (safe * contributed) / flow;
      withdrawals = (safe * rawWithdrawn) / flow;
      returns = safe - contributions - withdrawals;
      if (returns < 0) {
        contributions = Math.max(0, contributions + returns);
        returns = 0;
      }
    } else if (safe > 0) {
      returns = safe;
    }
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
    const { contributions } = point;
    let { returns, withdrawals } = point;
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
