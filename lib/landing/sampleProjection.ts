import {
  independenceChartSeries,
  type IndependenceChartPoint,
} from "@/lib/calculators/chartSeries";
import {
  DEFAULT_WITHDRAWAL_REAL_RETURN,
  type PublicIndependenceInput,
} from "@/lib/calculators/independence";
import { CALCULATOR_PATHS } from "@/lib/calculators/seo";
import {
  DEFAULT_LIFE_EXPECTANCY_AGE,
  DEFAULT_PORTFOLIO_REAL_RETURN,
} from "@/lib/engine/assumptions";

/** Chart stops at 60 — growth to freedom, not a drawdown story. */
export const LANDING_HORIZON_AGE = 60;

/**
 * Illustrative professional path. Same engine as the public calculators
 * (`publicIndependencePlan` + `projectYears`). Not a second solver.
 */
export const LANDING_SAMPLE_INPUT: PublicIndependenceInput = {
  currentAge: 32,
  liquidWealth: 180_000,
  monthlyContribution: 4_000,
  monthlySpending: 7_500,
  retirementAge: LANDING_HORIZON_AGE,
  lifeExpectancy: DEFAULT_LIFE_EXPECTANCY_AGE,
  realReturn: DEFAULT_PORTFOLIO_REAL_RETURN,
  withdrawalRealReturn: DEFAULT_WITHDRAWAL_REAL_RETURN,
};

export type LandingChartPoint = IndependenceChartPoint;

export function buildLandingSampleSeries(
  input: PublicIndependenceInput = LANDING_SAMPLE_INPUT,
  untilAge = LANDING_HORIZON_AGE
): LandingChartPoint[] {
  return independenceChartSeries(input, untilAge);
}

export function landingWealthAt(
  series: LandingChartPoint[],
  age: number
): number | undefined {
  return series.find((point) => point.age === age)?.wealth;
}

export function landingCalculatorHref(
  input: PublicIndependenceInput = LANDING_SAMPLE_INPUT
): string {
  const params = new URLSearchParams({
    idade: String(input.currentAge),
    reserva: String(Math.round(input.liquidWealth)),
    aporte: String(Math.round(input.monthlyContribution)),
    gasto: String(Math.round(input.monthlySpending)),
    alvo: String(input.lifeExpectancy),
    juro: String(Math.round(input.realReturn * 1000) / 10),
  });
  return `${CALCULATOR_PATHS.freedomDate}?${params.toString()}`;
}

export const LANDING_SAMPLE_SERIES = buildLandingSampleSeries();
export const LANDING_WEALTH_AT_HORIZON =
  landingWealthAt(LANDING_SAMPLE_SERIES, LANDING_HORIZON_AGE) ?? 0;
