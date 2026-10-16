import {
  publicIndependencePlan,
  type PublicIndependenceInput,
} from "@/lib/calculators/independence";
import { projectYears } from "@/lib/engine/project";
import { convertAmount } from "@/lib/fx/convert";
import type { FxRates } from "@/lib/fx/types";
import type { Currency } from "@/types";

export type IndependenceChartPoint = { age: number; wealth: number };

/**
 * Accumulation path from the public calculator engine.
 * `retirementAge` is pinned at the visible horizon so spending does not
 * pull the series down — the chart is growth, including from zero wealth.
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
