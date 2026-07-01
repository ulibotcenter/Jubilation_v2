import {
  computeWeightedPortfolioCagr,
  resolveAssetExpectedCagr,
} from "@/lib/portfolioCagr";
import {
  calculatePortfolioValue,
  type KPIValues,
  type PortfolioAsset,
  type ProjectionYear,
} from "@/types";

export interface ProjectionBuckets {
  investable: number;
  static: number;
}

export interface ProjectionEngineConfig {
  kpis: KPIValues;
  buckets: ProjectionBuckets;
  /** Real annual return decimals (already net of inflation) */
  investableRealReturn: number;
  staticRealReturn: number;
}

/** Split wealth into fast-growing (included) vs slow/static (excluded) buckets */
export function buildProjectionEngineConfig(
  kpis: KPIValues,
  portfolio: PortfolioAsset[],
  includedAssetIds: string[],
  outsidePortfolio = 0
): ProjectionEngineConfig {
  const included = new Set(includedAssetIds);
  const includedAssets = portfolio.filter((a) => included.has(a.id));
  const staticAssets = portfolio.filter((a) => !included.has(a.id));

  const includedValue = calculatePortfolioValue(includedAssets);
  const staticValue = calculatePortfolioValue(staticAssets);
  const totalValue = calculatePortfolioValue(portfolio);

  const investable = Math.round(includedValue + outsidePortfolio);
  let staticWealth = Math.round(staticValue);

  // Reconcile rounding vs synced net worth
  const expectedTotal = Math.round(totalValue + outsidePortfolio);
  const bucketTotal = investable + staticWealth;
  if (bucketTotal !== expectedTotal && staticAssets.length > 0) {
    staticWealth += expectedTotal - bucketTotal;
  }

  const inflation = kpis.annualInflation / 100;
  const investableCagr =
    computeWeightedPortfolioCagr(portfolio, includedAssetIds) ??
    kpis.expectedCAGR;
  const staticCagr =
    computeWeightedPortfolioCagr(
      portfolio,
      staticAssets.map((a) => a.id)
    ) ??
    weightedCagrForAssets(staticAssets) ??
    0;

  return {
    kpis,
    buckets: {
      investable: Math.max(0, investable),
      static: Math.max(0, staticWealth),
    },
    investableRealReturn: (investableCagr / 100 - inflation),
    staticRealReturn: staticCagr / 100 - inflation,
  };
}

function weightedCagrForAssets(assets: PortfolioAsset[]): number | null {
  let total = 0;
  let weighted = 0;
  for (const asset of assets) {
    const mv = asset.quantity * asset.currentPrice;
    if (mv <= 0) continue;
    total += mv;
    weighted += mv * resolveAssetExpectedCagr(asset);
  }
  if (total <= 0) return null;
  return weighted / total;
}

function resolveAnnualWithdrawal(
  kpis: KPIValues,
  totalBeforeWithdrawal: number,
  annualWithdrawal: number
): number {
  if (annualWithdrawal > 0) return annualWithdrawal;
  if (kpis.desiredMonthlyIncome > 0) {
    return kpis.desiredMonthlyIncome * 12;
  }
  return Math.round(totalBeforeWithdrawal * 0.04);
}

function applyWithdrawal(
  investable: number,
  staticWealth: number,
  amount: number
): ProjectionBuckets {
  let remaining = amount;
  let inv = investable;
  let st = staticWealth;

  const fromInvestable = Math.min(inv, remaining);
  inv -= fromInvestable;
  remaining -= fromInvestable;

  if (remaining > 0) {
    const fromStatic = Math.min(st, remaining);
    st -= fromStatic;
    remaining -= fromStatic;
  }

  return {
    investable: Math.max(0, Math.round(inv)),
    static: Math.max(0, Math.round(st)),
  };
}

export interface ProjectionStepOptions {
  /** Override investable return for stochastic MC paths */
  investableReturnOverride?: number;
  staticReturnOverride?: number;
}

/**
 * Single source of truth for wealth projections.
 * Uses rounded year-stepping so chart tooltips reconcile exactly.
 */
export function runProjectionEngine(
  config: ProjectionEngineConfig,
  options?: ProjectionStepOptions
): ProjectionYear[] {
  const { kpis, buckets, investableRealReturn, staticRealReturn } = config;
  const projections: ProjectionYear[] = [];
  const annualContribution = kpis.monthlyContribution * 12;
  const annualLiving = kpis.monthlyExpenses * 12;
  const endAge = kpis.lifeExpectancy;
  const startYear = new Date().getFullYear();

  let investable = buckets.investable;
  let staticWealth = buckets.static;
  let annualWithdrawal = 0;

  for (let age = kpis.currentAge; age <= endAge; age++) {
    const i = age - kpis.currentAge;
    const year = startYear + i;
    const isRetired = age >= kpis.retirementAge;

    const openingInvestable = Math.round(investable);
    const openingStatic = Math.round(staticWealth);
    const openingTotal = openingInvestable + openingStatic;

    const invRate =
      options?.investableReturnOverride ?? investableRealReturn;
    const stRate = options?.staticReturnOverride ?? staticRealReturn;

    const investableReturns =
      i === 0 ? 0 : Math.round(openingInvestable * invRate);
    const staticReturns = i === 0 ? 0 : Math.round(openingStatic * stRate);
    const returns = investableReturns + staticReturns;

    const contributions = i === 0 || isRetired ? 0 : annualContribution;
    const lifestyleExpenses = i === 0 ? 0 : isRetired ? 0 : annualLiving;

    if (isRetired && annualWithdrawal === 0) {
      annualWithdrawal = resolveAnnualWithdrawal(
        kpis,
        openingTotal,
        annualWithdrawal
      );
    }

    const withdrawals = i === 0 || !isRetired ? 0 : annualWithdrawal;
    const invested = contributions;
    const requiredIncome = lifestyleExpenses + invested;

    if (i > 0) {
      investable = openingInvestable + investableReturns + contributions;
      staticWealth = openingStatic + staticReturns;

      if (withdrawals > 0) {
        const after = applyWithdrawal(investable, staticWealth, withdrawals);
        investable = after.investable;
        staticWealth = after.static;
      }
    }

    const portfolioValue = Math.round(investable + staticWealth);
    const inflationFactor = Math.pow(1 + kpis.annualInflation / 100, i);

    projections.push({
      year,
      age,
      portfolioValue,
      contributions: Math.round(contributions),
      returns: Math.round(returns),
      inflationAdjusted: Math.round(portfolioValue / inflationFactor),
      expenses: Math.round(lifestyleExpenses + withdrawals),
      invested: Math.round(invested),
      requiredIncome: Math.round(requiredIncome),
    });
  }

  return projections;
}

/** KPI-only fallback when portfolio context is unavailable (tests) */
export function buildSingleBucketConfig(kpis: KPIValues): ProjectionEngineConfig {
  const realReturn = (kpis.expectedCAGR - kpis.annualInflation) / 100;
  return {
    kpis,
    buckets: {
      investable: kpis.currentNetWorth,
      static: 0,
    },
    investableRealReturn: realReturn,
    staticRealReturn: 0,
  };
}

export function simulateMonteCarloFinalValues(
  config: ProjectionEngineConfig,
  options: {
    iterations: number;
    cagrOffset?: number;
    volatility?: number;
  }
): number[] {
  const { kpis, buckets, investableRealReturn, staticRealReturn } = config;
  const years = kpis.retirementAge - kpis.currentAge;
  const annualContribution = kpis.monthlyContribution * 12;
  const cagrOffset = (options.cagrOffset ?? 0) / 100;
  const volatility = options.volatility ?? 0.15;
  const finalValues: number[] = [];

  for (let iter = 0; iter < options.iterations; iter++) {
    let investable = buckets.investable;
    let staticWealth = buckets.static;

    for (let y = 1; y <= years; y++) {
      const invReturn =
        investableRealReturn +
        cagrOffset +
        (Math.random() - 0.5) * volatility;
      const stReturn =
        staticRealReturn + (Math.random() - 0.5) * (volatility * 0.35);

      investable = Math.max(
        0,
        Math.round(investable * (1 + invReturn))
      );
      staticWealth = Math.max(
        0,
        Math.round(staticWealth * (1 + stReturn))
      );

      if (y < years) {
        investable += annualContribution;
      }
    }

    finalValues.push(Math.round(investable + staticWealth));
  }

  return finalValues;
}

/** Per-age MC percentiles for chart confidence bands (accumulation phase) */
export function simulateMonteCarloPathsByAge(
  config: ProjectionEngineConfig,
  options: { iterations: number; volatility?: number }
): Map<number, number[]> {
  const { kpis, buckets, investableRealReturn, staticRealReturn } = config;
  const volatility = options.volatility ?? 0.15;
  const byAge = new Map<number, number[]>();

  for (let iter = 0; iter < options.iterations; iter++) {
    let investable = buckets.investable;
    let staticWealth = buckets.static;

    for (let age = kpis.currentAge; age <= kpis.retirementAge; age++) {
      const i = age - kpis.currentAge;
      const openingInv = Math.round(investable);
      const openingSt = Math.round(staticWealth);

      if (i > 0) {
        const invReturn =
          investableRealReturn + (Math.random() - 0.5) * volatility;
        const stReturn =
          staticRealReturn + (Math.random() - 0.5) * (volatility * 0.35);

        investable =
          openingInv +
          Math.round(openingInv * invReturn) +
          (age < kpis.retirementAge ? kpis.monthlyContribution * 12 : 0);
        staticWealth = openingSt + Math.round(openingSt * stReturn);
      }

      const total = Math.round(investable + staticWealth);
      const list = byAge.get(age) ?? [];
      list.push(total);
      byAge.set(age, list);
    }
  }

  return byAge;
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(sorted.length * p))
  );
  return sorted[idx] ?? 0;
}

export type MonteCarloScenario = "pessimistic" | "base" | "optimistic";

export const MONTE_CARLO_SCENARIO_MULTIPLIERS: Record<
  MonteCarloScenario,
  { cagrOffset: number; volatility: number }
> = {
  pessimistic: { cagrOffset: -2.0, volatility: 0.18 },
  base: { cagrOffset: 0, volatility: 0.15 },
  optimistic: { cagrOffset: 2.0, volatility: 0.12 },
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
  target: number;
} {
  const { kpis } = config;
  const target =
    kpis.desiredMonthlyIncome > 0
      ? kpis.desiredMonthlyIncome * 12 * 25
      : kpis.currentNetWorth * 25;

  const scenarios: MonteCarloScenario[] = [
    "pessimistic",
    "base",
    "optimistic",
  ];

  const results: MonteCarloEngineResult[] = [];
  const finalValuesByScenario = {} as Record<MonteCarloScenario, number[]>;

  for (const scenario of scenarios) {
    const mult = MONTE_CARLO_SCENARIO_MULTIPLIERS[scenario];
    const finalValues = simulateMonteCarloFinalValues(config, {
      iterations,
      cagrOffset: mult.cagrOffset,
      volatility: mult.volatility,
    });
    finalValues.sort((a, b) => a - b);
    finalValuesByScenario[scenario] = finalValues;

    const median = finalValues[Math.floor(iterations / 2)] ?? 0;
    const p10 = finalValues[Math.floor(iterations * 0.1)] ?? 0;
    const p90 = finalValues[Math.floor(iterations * 0.9)] ?? 0;
    const successCount = finalValues.filter((v) => v >= target).length;

    results.push({
      scenario,
      medianValue: Math.round(median),
      successRate: Math.round((successCount / iterations) * 100),
      percentile10: Math.round(p10),
      percentile90: Math.round(p90),
    });
  }

  return { results, finalValuesByScenario, target };
}