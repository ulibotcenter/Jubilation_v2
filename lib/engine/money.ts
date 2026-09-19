import type { Currency } from "@/types";

export type MoneyBase = "real" | "nominal";

export class CurrencyMismatchError extends Error {
  constructor(left: Currency, right: Currency) {
    super(`Cannot combine ${left} with ${right}`);
    this.name = "CurrencyMismatchError";
  }
}

export class MoneyBaseMismatchError extends Error {
  constructor(left: MoneyBase, right: MoneyBase) {
    super(`Cannot combine ${left} money with ${right} money`);
    this.name = "MoneyBaseMismatchError";
  }
}

export class MissingFxRateError extends Error {
  constructor(from: Currency, to: Currency) {
    super(`No FX rate for ${from}→${to}`);
    this.name = "MissingFxRateError";
  }
}

/** 1:1 USD/BRL/EUR is how M7 hid mixed-currency sums. Never use as a quote. */
export class IdentityFxRatesError extends Error {
  constructor() {
    super("Refusing to aggregate mixed currencies at 1:1 FX");
    this.name = "IdentityFxRatesError";
  }
}

/**
 * Integer cents + native currency + real/nominal + as-of date.
 * Arithmetic that would recreate M1 (double deflation) or M7 (summing
 * mixed currencies) throws instead of silently producing a number.
 */
export interface Money {
  readonly cents: number;
  readonly currency: Currency;
  readonly base: MoneyBase;
  readonly asOf: string;
}

export function money(
  cents: number,
  currency: Currency,
  base: MoneyBase,
  asOf: string
): Money {
  return {
    cents: Math.round(cents),
    currency,
    base,
    asOf,
  };
}

export function fromMajor(
  major: number,
  currency: Currency,
  base: MoneyBase,
  asOf: string
): Money {
  return money(Math.round(major * 100), currency, base, asOf);
}

export function toMajor(value: Money): number {
  return value.cents / 100;
}

export function assertSameUnit(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
  if (a.base !== b.base) {
    throw new MoneyBaseMismatchError(a.base, b.base);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameUnit(a, b);
  return money(a.cents + b.cents, a.currency, a.base, a.asOf);
}

export function subMoney(a: Money, b: Money): Money {
  assertSameUnit(a, b);
  return money(a.cents - b.cents, a.currency, a.base, a.asOf);
}

export function inflateToNominal(real: Money, inflationFactor: number): Money {
  if (real.base !== "real") {
    throw new MoneyBaseMismatchError(real.base, "real");
  }
  return money(
    Math.round(real.cents * inflationFactor),
    real.currency,
    "nominal",
    real.asOf
  );
}

export function deflateToReal(nominal: Money, inflationFactor: number): Money {
  if (nominal.base !== "nominal") {
    throw new MoneyBaseMismatchError(nominal.base, "nominal");
  }
  if (inflationFactor === 0) {
    throw new Error("Inflation factor must be positive");
  }
  return money(
    Math.round(nominal.cents / inflationFactor),
    nominal.currency,
    "real",
    nominal.asOf
  );
}

export type FxRates = Record<Currency, number>;

export function crossRate(
  from: Currency,
  to: Currency,
  rates: FxRates
): number {
  if (from === to) return 1;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) {
    throw new MissingFxRateError(from, to);
  }
  return toRate / fromRate;
}

/** Convert at the aggregation boundary only — never inside the monthly loop. */
export function convertMoney(
  value: Money,
  to: Currency,
  rates: FxRates
): Money {
  if (value.currency === to) return value;
  const rate = crossRate(value.currency, to, rates);
  return money(Math.round(value.cents * rate), to, value.base, value.asOf);
}
