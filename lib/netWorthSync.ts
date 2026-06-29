import { calculatePortfolioValue, type KPIValues, type PortfolioAsset } from "@/types";

/** Wealth held outside tracked portfolio holdings (property, pensions, etc.) */
export function computeOutsidePortfolio(
  kpis: KPIValues,
  portfolio: PortfolioAsset[]
): number {
  const total = calculatePortfolioValue(portfolio);
  return Math.round(kpis.currentNetWorth - total);
}

export function syncNetWorthWithPortfolio(
  kpis: KPIValues,
  portfolio: PortfolioAsset[],
  outsidePortfolio: number
): KPIValues {
  const total = calculatePortfolioValue(portfolio);
  return {
    ...kpis,
    currentNetWorth: Math.round(total + outsidePortfolio),
  };
}

export function deriveOutsideFromManualNetWorth(
  netWorth: number,
  portfolio: PortfolioAsset[]
): number {
  return Math.round(netWorth - calculatePortfolioValue(portfolio));
}