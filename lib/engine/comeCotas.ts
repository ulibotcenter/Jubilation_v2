import {
  DEFAULT_PARAMETER_SET,
  paramsForYear,
  type LegalPremises,
  type ParameterSet,
} from "@/lib/engine/parameters";
import { parseIso } from "@/lib/engine/dates";
import { regressiveFixedIncomeRate } from "@/lib/engine/tax";

/**
 * Come-cotas — IN RFB 1.585/2015 art. 9:
 * last business day of May and November (monthly engine: month-end May/Nov).
 * §1º I: 20% short-term funds (portfolio ≤ 365 days).
 * §1º II: 15% long-term funds (portfolio > 365 days).
 * Art. 6/8 + §2º: complementary rate at redemption vs the regressive table.
 *
 * Equity funds: 15% at redemption only, no come-cotas (IN 1.585 art. 16-class
 * funds de ações; Lei 11.033/2004).
 *
 * Lei 14.754/2023 closed / exclusive / offshore: annual 15% is a different
 * regime. Default: come-cotas only on open non-equity funds. Configurable.
 */
export type FundHorizon = "short" | "long";
export type FundKind =
  | "open_fixed_income"
  | "open_multimarket"
  | "equity"
  | "closed"
  | "exclusive"
  | "offshore";

export const COME_COTAS_SOURCE =
  "IN RFB 1.585/2015 art. 9 §1º (15% LP / 20% CP; último dia útil de maio e novembro)";

export function comeCotasRate(
  horizon: FundHorizon,
  year = 2026,
  parameterSet: ParameterSet = DEFAULT_PARAMETER_SET
): number {
  const p = paramsForYear(parameterSet, year);
  return horizon === "short"
    ? p.comeCotasShortTermRate
    : p.comeCotasLongTermRate;
}

export function comeCotasApplies(
  kind: FundKind,
  premises: LegalPremises
): boolean {
  if (kind === "equity") return false;
  if (kind === "closed") return premises.comeCotasAppliesToClosedFunds;
  if (kind === "exclusive") return premises.comeCotasAppliesToExclusiveFunds;
  if (kind === "offshore") return premises.comeCotasAppliesToOffshore;
  return true;
}

export function isComeCotasCalendarMonth(
  month1to12: number,
  year = 2026,
  parameterSet: ParameterSet = DEFAULT_PARAMETER_SET
): boolean {
  return paramsForYear(parameterSet, year).comeCotasMonths.includes(month1to12);
}

export function calendarMonthAfter(
  asOfIso: string,
  monthOffset: number
): { year: number; month: number } {
  const { y, m } = parseIso(asOfIso);
  const idx = y * 12 + (m - 1) + monthOffset;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function comeCotasLevyCents(gainCents: number, rate: number): number {
  return Math.round(Math.max(0, gainCents) * rate);
}

/** Complementary IR at redemption after come-cotas already withheld. */
export function comeCotasRedemptionTopUpCents(
  remainingGainCents: number,
  holdingDays: number,
  alreadyWithheldRate: number
): number {
  const due = regressiveFixedIncomeRate(holdingDays);
  const extra = Math.max(0, due - alreadyWithheldRate);
  return Math.round(Math.max(0, remainingGainCents) * extra);
}
