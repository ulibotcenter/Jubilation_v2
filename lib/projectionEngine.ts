import { projectPlan } from "@/lib/engine/project";
import { buildEnginePlan, type EngineBuildInput } from "@/lib/engine/adapter";
import { defaultPlan, type EnginePlan } from "@/lib/engine/plan";
import { fisherReal } from "@/lib/engine/rates";
import {
  runMonteCarloFromPlan,
  runMonteCarloPlan,
  percentile,
  MONTE_CARLO_SCENARIO_SHOCKS,
} from "@/lib/engine/monteCarlo";
import { computeWeightedPortfolioCagr } from "@/lib/portfolioCagr";
import { resolveLiquidity } from "@/lib/engine/liquidity";
import { aggregatePortfolioMajor } from "@/lib/engine/adapter";
import { MissingFxRateError } from "@/lib/engine/money";
import {
  type KPIValues,
  type PortfolioAsset,
  type ProjectionYear,
  type Currency,
} from "@/types";

export interface ProjectionBuckets {
  investable: number;
  static: number;
}

export interface ProjectionEngineConfig {
  kpis: KPIValues;
  buckets: ProjectionBuckets;
  investableRealReturn: number;
  staticRealReturn: number;
  plan: EnginePlan;
}

export type { EnginePlan };

function sameCurrencyQuote(
  portfolio: PortfolioAsset[]
): EngineBuildInput["quote"] {
  const currencies = [
    ...new Set(portfolio.map((a) => a.nativeCurrency ?? a.currency)),
  ];
  if (currencies.length > 1) {
    throw new MissingFxRateError(currencies[0]!, currencies[1]!);
  }
  const currency = (currencies[0] ?? "USD") as Currency;
  return { currency, rates: { USD: 1, BRL: 1, EUR: 1 } };
}

/** Split wealth into liquid (in-scope) vs illiquid. Illiquid is never sold. */
export function buildProjectionEngineConfig(
  kpis: KPIValues,
  portfolio: PortfolioAsset[],
  includedAssetIds: string[],
  outsidePortfolio = 0,
  quote?: EngineBuildInput["quote"]
): ProjectionEngineConfig {
  const fx = quote ?? sameCurrencyQuote(portfolio);
  const plan = buildEnginePlan({
    kpis,
    portfolio,
    includedAssetIds,
    outsidePortfolio,
    quote: fx,
  });
  return {
    kpis,
    buckets: {
      investable: plan.liquidCents / 100,
      static: plan.illiquidCents / 100,
    },
    investableRealReturn: plan.liquidRealReturn,
    staticRealReturn: plan.illiquidRealReturn,
    plan,
  };
}

export function buildSingleBucketConfig(kpis: KPIValues): ProjectionEngineConfig {
  const inflation = kpis.annualInflation / 100;
  const plan = defaultPlan({
    currentAge: kpis.currentAge,
    retirementAge: kpis.retirementAge,
    lifeExpectancy: kpis.lifeExpectancy,
    currency: "BRL",
    liquidCents: Math.round(kpis.currentNetWorth * 100),
    illiquidCents: 0,
    monthlyContributionCents: Math.round(kpis.monthlyContribution * 100),
    monthlySpendingCents: Math.round(kpis.desiredMonthlyIncome * 100),
    monthlyLifestyleCents: Math.round(kpis.monthlyExpenses * 100),
    liquidRealReturn: fisherReal(kpis.expectedCAGR / 100, inflation),
    illiquidRealReturn: 0,
    inflation,
    applyTaxes: true,
  });
  return {
    kpis,
    buckets: { investable: kpis.currentNetWorth, static: 0 },
    investableRealReturn: plan.liquidRealReturn,
    staticRealReturn: 0,
    plan,
  };
}

export function runProjectionEngine(
  config: ProjectionEngineConfig
): ProjectionYear[] {
  return projectPlan(config.plan).years;
}

export function simulateMonteCarloFinalValues(
  config: ProjectionEngineConfig,
  options: {
    iterations: number;
    cagrOffset?: number;
    volatility?: number;
  }
): number[] {
  return runMonteCarloPlan(config.plan, {
    iterations: options.iterations,
    cagrOffset: (options.cagrOffset ?? 0) / 100,
    volatility: options.volatility,
    scenario: "base",
  }).finals;
}

export function simulateMonteCarloPathsByAge(
  config: ProjectionEngineConfig,
  options: { iterations: number; volatility?: number; seed?: number }
): Map<number, number[]> {
  const plan = { ...config.plan, seed: options.seed ?? config.plan.seed };
  return runMonteCarloPlan(plan, {
    iterations: options.iterations,
    volatility: options.volatility,
    scenario: "base",
  }).pathsByAge;
}

export { percentile };

export type MonteCarloScenario = "pessimistic" | "base" | "optimistic";

export const MONTE_CARLO_SCENARIO_MULTIPLIERS: Record<
  MonteCarloScenario,
  { cagrOffset: number; volatility: number }
> = {
  pessimistic: {
    cagrOffset: MONTE_CARLO_SCENARIO_SHOCKS.pessimistic.cagrOffset * 100,
    volatility: MONTE_CARLO_SCENARIO_SHOCKS.pessimistic.volatility,
  },
  base: {
    cagrOffset: 0,
    volatility: MONTE_CARLO_SCENARIO_SHOCKS.base.volatility,
  },
  optimistic: {
    cagrOffset: MONTE_CARLO_SCENARIO_SHOCKS.optimistic.cagrOffset * 100,
    volatility: MONTE_CARLO_SCENARIO_SHOCKS.optimistic.volatility,
  },
};

export interface MonteCarloEngineResult {
  scenario: MonteCarloScenario;
  medianValue: number;
  successRate: number;
  percentile10: number;
  percentile90: number;
}

export function runMonteCarloFromConfig(
  config: ProjectionEngineConfig,
  iterations = 1000
): {
  results: MonteCarloEngineResult[];
  finalValuesByScenario: Record<MonteCarloScenario, number[]>;
  target: number | null;
  pathsByAge: Map<number, number[]>;
} {
  const output = runMonteCarloFromPlan(config.plan, iterations);
  return {
    results: output.results.map((row) => ({
      scenario: row.scenario,
      medianValue: row.medianValue,
      successRate: row.successRate,
      percentile10: row.percentile10,
      percentile90: row.percentile90,
    })),
    finalValuesByScenario: output.finalValuesByScenario,
    target: output.target,
    pathsByAge: output.pathsByAgeBase,
  };
}

/** @deprecated Use buildEnginePlan — kept so tests can inspect implied returns. */
export function inspectPortfolioReturns(
  _kpis: KPIValues,
  portfolio: PortfolioAsset[],
  includedAssetIds: string[]
) {
  return {
    includedCagr: computeWeightedPortfolioCagr(portfolio, includedAssetIds),
    illiquidCount: portfolio.filter((a) => resolveLiquidity(a) === "illiquid")
      .length,
    liquidValue: aggregatePortfolioMajor(
      portfolio.filter(
        (a) =>
          includedAssetIds.includes(a.id) && resolveLiquidity(a) === "liquid"
      ),
      sameCurrencyQuote(portfolio)
    ),
  };
}
