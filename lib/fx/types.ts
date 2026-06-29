import type { Currency } from "@/types";

export type FxRates = Record<Currency, number>;

export interface FxSnapshot {
  base: Currency;
  date: string;
  rates: FxRates;
  fetchedAt: string;
}