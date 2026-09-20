import type { Currency } from "@/types";
import type { FxRates } from "@/lib/fx/types";
import { crossRate, MissingFxRateError } from "@/lib/engine/money";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getCrossRate(
  from: Currency,
  to: Currency,
  rates: FxRates
): number {
  return crossRate(from, to, rates);
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

export function convertHoldingMajor(
  amount: number,
  from: Currency,
  quote: { currency: Currency; rates: FxRates }
): number {
  return convertAmount(amount, from, quote.currency, quote.rates);
}

export { MissingFxRateError };

/** Display-only: KPI fields live in the app's display currency. */
export function convertKpis(
  kpis: import("@/types").KPIValues,
  from: Currency,
  to: Currency,
  rates: FxRates
): import("@/types").KPIValues {
  const fields: (keyof import("@/types").KPIValues)[] = [
    "currentNetWorth",
    "monthlyContribution",
    "monthlyExpenses",
    "desiredMonthlyIncome",
  ];
  const next = { ...kpis };
  for (const field of fields) {
    next[field] = Math.round(convertAmount(kpis[field], from, to, rates));
  }
  return next;
}

/**
 * @deprecated Native currency is immutable. Do not rewrite holdings on
 * display-currency change — convert at the aggregation boundary instead.
 */
export function convertPortfolio(
  portfolio: import("@/types").PortfolioAsset[],
  _to: Currency,
  _rates: FxRates
): import("@/types").PortfolioAsset[] {
  return portfolio;
}
