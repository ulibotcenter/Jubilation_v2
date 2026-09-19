import type { Currency, KPIValues, PortfolioAsset } from "@/types";
import type { FxRates } from "@/lib/fx/types";
import { convertMoney, fromMajor, toMajor } from "@/lib/engine/money";
import { fisherReal } from "@/lib/engine/rates";
import { defaultPlan, type EnginePlan } from "@/lib/engine/plan";
import { resolveLiquidity } from "@/lib/engine/liquidity";
import { resolveAssetExpectedCagr } from "@/lib/portfolioCagr";
import { DEFAULT_PARAMETER_SET } from "@/lib/engine/parameters";
import { todayIsoDate } from "@/lib/engine/provenance";

export interface FxQuote {
  currency: Currency;
  rates: FxRates;
}

export interface EngineBuildInput {
  kpis: KPIValues;
  portfolio: PortfolioAsset[];
  includedAssetIds: string[];
  outsidePortfolio?: number;
  quote: FxQuote;
  asOf?: string;
  applyTaxes?: boolean;
  inssMonthly?: number;
  seed?: number;
  /** When set (sensitivity slider), replaces portfolio-implied liquid return. */
  nominalReturnOverride?: number;
}

function assetValueInQuote(asset: PortfolioAsset, quote: FxQuote): number {
  const native = fromMajor(
    asset.quantity * asset.currentPrice,
    asset.nativeCurrency ?? asset.currency,
    "real",
    asset.asOf ?? todayIsoDate()
  );
  return toMajor(convertMoney(native, quote.currency, quote.rates));
}

function weightedNominalCagr(
  assets: PortfolioAsset[],
  quote: FxQuote
): number | null {
  let total = 0;
  let weighted = 0;
  for (const asset of assets) {
    const mv = assetValueInQuote(asset, quote);
    if (mv <= 0) continue;
    total += mv;
    weighted += mv * resolveAssetExpectedCagr(asset);
  }
  if (total <= 0) return null;
  return weighted / total;
}

export function aggregatePortfolioMajor(
  assets: PortfolioAsset[],
  quote: FxQuote
): number {
  let cents = 0;
  for (const asset of assets) {
    const native = fromMajor(
      asset.quantity * asset.currentPrice,
      asset.nativeCurrency ?? asset.currency,
      "real",
      asset.asOf ?? todayIsoDate()
    );
    cents += convertMoney(native, quote.currency, quote.rates).cents;
  }
  return Math.round(cents) / 100;
}

export function buildEnginePlan(input: EngineBuildInput): EnginePlan {
  const included = new Set(input.includedAssetIds);
  const liquidAssets = input.portfolio.filter(
    (a) => included.has(a.id) && resolveLiquidity(a) === "liquid"
  );
  // Illiquid holdings stay in the static bucket even when the scope
  // filter is "investments only". They are never sold (M8).
  const illiquidAssets = input.portfolio.filter(
    (a) => resolveLiquidity(a) === "illiquid"
  );

  const liquidMajor =
    aggregatePortfolioMajor(liquidAssets, input.quote) +
    (input.outsidePortfolio ?? 0);
  const illiquidMajor = aggregatePortfolioMajor(illiquidAssets, input.quote);

  const inflation = input.kpis.annualInflation / 100;
  const portfolioCagr = weightedNominalCagr(liquidAssets, input.quote);
  const illiquidCagr = weightedNominalCagr(illiquidAssets, input.quote);
  const nominal =
    input.nominalReturnOverride ?? portfolioCagr ?? input.kpis.expectedCAGR;

  return defaultPlan({
    currentAge: input.kpis.currentAge,
    retirementAge: input.kpis.retirementAge,
    lifeExpectancy: input.kpis.lifeExpectancy,
    asOf: input.asOf ?? todayIsoDate(),
    currency: input.quote.currency,
    liquidCents: Math.round(liquidMajor * 100),
    illiquidCents: Math.round(illiquidMajor * 100),
    monthlyContributionCents: Math.round(input.kpis.monthlyContribution * 100),
    monthlySpendingCents: Math.round(input.kpis.desiredMonthlyIncome * 100),
    monthlyLifestyleCents: Math.round(input.kpis.monthlyExpenses * 100),
    liquidRealReturn: fisherReal(nominal / 100, inflation),
    illiquidRealReturn: fisherReal((illiquidCagr ?? 0) / 100, inflation),
    inflation,
    allowIlliquidSale: illiquidAssets.some((a) => a.allowSale === true),
    applyTaxes: input.applyTaxes ?? false,
    inssMonthlyCents: Math.round((input.inssMonthly ?? 0) * 100),
    seed: input.seed ?? 1,
    parameterSet: DEFAULT_PARAMETER_SET,
  });
}
