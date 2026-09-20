import { projectablePortfolioValue } from "@/lib/holdings/origin";
import type { KPIValues, PortfolioAsset, PortfolioValueQuote } from "@/types";

/** Wealth held outside tracked portfolio holdings (property, pensions, etc.) */
export function computeOutsidePortfolio(
  kpis: KPIValues,
  portfolio: PortfolioAsset[],
  quote?: PortfolioValueQuote
): number {
  const total = projectablePortfolioValue(portfolio, quote);
  return Math.round(kpis.currentNetWorth - total);
}

export function syncNetWorthWithPortfolio(
  kpis: KPIValues,
  portfolio: PortfolioAsset[],
  outsidePortfolio: number,
  quote?: PortfolioValueQuote
): KPIValues {
  const total = projectablePortfolioValue(portfolio, quote);
  return {
    ...kpis,
    currentNetWorth: Math.round(total + outsidePortfolio),
  };
}

export function deriveOutsideFromManualNetWorth(
  netWorth: number,
  portfolio: PortfolioAsset[],
  quote?: PortfolioValueQuote
): number {
  return Math.round(netWorth - projectablePortfolioValue(portfolio, quote));
}