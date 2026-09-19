import {
  DEFAULT_PARAMETER_SET,
  paramsForYear,
  type ParameterSet,
} from "@/lib/engine/parameters";
import { fgtsBirthdayWithdrawalCents } from "@/lib/engine/tax";
import { ASSUMPTIONS } from "@/lib/engine/assumptions";
import type { DataSource } from "@/lib/engine/provenance";
import { createId } from "@/lib/engine/ids";

/**
 * FGTS: TR + 3% a.a. + discretionary profit (Lei 8.036/1990 art. 13;
 * Lei 13.446/2017). Default real return is 0% (conservative — TR + profit
 * have been below inflation in several years). Birthday withdrawal uses one
 * bracket on the whole balance; nominal limits frozen since 2019.
 *
 * Full multi-year projection of deposits vs shrinking real birthday table
 * is hooked here; the live monthly loop still treats FGTS as an illiquid
 * SEVERANCE_FUND account unless the caller feeds withdrawals.
 */
export const FGTS_SOURCE =
  "Lei 8.036/1990 art. 13; Lei 13.446/2017; Lei 13.932/2019 anexo (saque-aniversário)";

export interface FgtsAccount {
  id: string;
  balanceCents: number;
  birthdayWithdrawal: boolean;
  asOf: string;
  source: DataSource;
}

export function createFgtsAccount(
  balanceCents: number,
  asOf: string,
  birthdayWithdrawal = false
): FgtsAccount {
  return {
    id: createId("fgts"),
    balanceCents,
    birthdayWithdrawal,
    asOf,
    source: "MANUAL",
  };
}

export function projectFgtsYear(
  account: FgtsAccount,
  options: {
    year?: number;
    depositCents?: number;
    realReturn?: number;
    parameterSet?: ParameterSet;
  } = {}
): { endBalanceCents: number; withdrawnCents: number; taxExempt: true } {
  const year = options.year ?? 2026;
  const set = options.parameterSet ?? DEFAULT_PARAMETER_SET;
  const real =
    options.realReturn ?? ASSUMPTIONS.fgtsRealReturn.defaultValue / 100;
  let balance = Math.max(0, account.balanceCents) + (options.depositCents ?? 0);
  balance = Math.round(balance * (1 + real));
  let withdrawn = 0;
  if (account.birthdayWithdrawal) {
    withdrawn = fgtsBirthdayWithdrawalCents(balance, year, set);
    balance = Math.max(0, balance - withdrawn);
  }
  return { endBalanceCents: balance, withdrawnCents: withdrawn, taxExempt: true };
}

export function fgtsBirthdayOneBracketCents(
  balanceCents: number,
  year = 2026,
  parameterSet: ParameterSet = DEFAULT_PARAMETER_SET
): number {
  return fgtsBirthdayWithdrawalCents(balanceCents, year, parameterSet);
}

/** Frozen 2019 nominal band — do not inflate. */
export function fgtsBirthdayBracketSource(year = 2026, set = DEFAULT_PARAMETER_SET) {
  return {
    brackets: paramsForYear(set, year).fgtsBirthdayBrackets,
    frozenNominalSince: 2019,
    source: FGTS_SOURCE,
  };
}
