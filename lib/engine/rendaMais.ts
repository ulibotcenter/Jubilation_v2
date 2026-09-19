import {
  DEFAULT_PARAMETER_SET,
  paramsForYear,
  type ParameterSet,
} from "@/lib/engine/parameters";
import { regressiveFixedIncomeRate } from "@/lib/engine/tax";
import { createId } from "@/lib/engine/ids";
import type { DataSource } from "@/lib/engine/provenance";

/**
 * Tesouro RendA+ (NTN-B1) — Decreto 11.301/2022.
 * Accumulate until conversion, then 240 IPCA-indexed monthly parcels.
 * Custody 0% to maturity up to 6× minimum wage of monthly income; 0.10% a.a. above.
 * IR regressive on gain only. Early-redemption custody 0.50/0.20/0.10 by tenor
 * is recorded, not simulated in the monthly loop yet.
 */
export const RENDA_MAIS_SOURCE = "Decreto 11.301/2022; Tesouro Nacional / B3 custody schedule";

export const RENDA_MAIS_INSTALLMENTS = 240;

export interface RendaMaisPosition {
  id: string;
  principalCents: number;
  conversionOn: string;
  asOf: string;
  source: DataSource;
}

export function createRendaMais(
  principalCents: number,
  conversionOn: string,
  asOf: string
): RendaMaisPosition {
  return {
    id: createId("rendamais"),
    principalCents,
    conversionOn,
    asOf,
    source: "MANUAL",
  };
}

export function rendaMaisMonthlyParcelCents(principalAtConversionCents: number): number {
  return Math.round(principalAtConversionCents / RENDA_MAIS_INSTALLMENTS);
}

export function rendaMaisCustodyRate(
  monthlyParcelCents: number,
  year = 2026,
  heldToMaturity = true,
  yearsHeld = 0,
  parameterSet: ParameterSet = DEFAULT_PARAMETER_SET
): number {
  const p = paramsForYear(parameterSet, year);
  if (heldToMaturity) {
    const cap = p.rendaMaisCustodyFreeMinWages * p.minimumWageCents;
    return monthlyParcelCents <= cap ? 0 : 0.001;
  }
  if (yearsHeld < 10) return 0.005;
  if (yearsHeld < 20) return 0.002;
  return 0.001;
}

export function rendaMaisIncomeTaxCents(
  parcelCents: number,
  principalShareCents: number,
  holdingDays: number
): number {
  const gain = Math.max(0, parcelCents - principalShareCents);
  return Math.round(gain * regressiveFixedIncomeRate(holdingDays));
}
