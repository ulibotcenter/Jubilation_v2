import type { Currency } from "@/types";

export type FxRates = Record<Currency, number>;

/** Last-resort display rates when a live snapshot is not loaded yet. Not 1:1. */
export const FALLBACK_FX_RATES: FxRates = {
  USD: 1,
  BRL: 5.45,
  EUR: 0.92,
};

export interface FxSnapshot {
  base: Currency;
  date: string;
  rates: FxRates;
  fetchedAt: string;
}

export function liveFxQuote(
  currency: Currency,
  snapshot?: FxSnapshot | null
): { currency: Currency; rates: FxRates } {
  return {
    currency,
    rates: snapshot?.rates ?? FALLBACK_FX_RATES,
  };
}