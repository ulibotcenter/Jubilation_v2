import type { Currency, KPIValues, PortfolioAsset } from "@/types";
import type { FxRates } from "@/lib/fx/types";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getCrossRate(
  from: Currency,
  to: Currency,
  rates: FxRates
): number {
  if (from === to) return 1;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return 1;
  return toRate / fromRate;
}

export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  rates: FxRates
): number {
  if (from === to) return amount;
  return roundMoney(amount * getCrossRate(from, to, rates));
}

export function convertKpis(
  kpis: KPIValues,
  from: Currency,
  to: Currency,
  rates: FxRates
): KPIValues {
  const fields: (keyof KPIValues)[] = [
    "currentNetWorth",
    "monthlyContribution",
    "desiredMonthlyIncome",
  ];
  const next = { ...kpis };
  for (const field of fields) {
    next[field] = Math.round(convertAmount(kpis[field], from, to, rates));
  }
  return next;
}

export function convertPortfolio(
  portfolio: PortfolioAsset[],
  to: Currency,
  rates: FxRates
): PortfolioAsset[] {
  return portfolio.map((asset) => ({
    ...asset,
    currentPrice: convertAmount(asset.currentPrice, asset.currency, to, rates),
    costBasis: convertAmount(asset.costBasis, asset.currency, to, rates),
    currency: to,
  }));
}