import { PARAMETER_SET_VERSION } from "@/lib/engine/version";
import {
  MINIMUM_WAGE_STEPS,
  RGPS_CEILING_STEPS,
  minimumWageAt,
  rgpsCeilingAt,
  rgpsTransitionForYear,
  type DatedLegalAmount,
} from "@/lib/engine/rgpsLegalSeries";

export interface RateBracket {
  /** Inclusive upper bound in cents. Last bracket uses Infinity. */
  upToCents: number;
  rate: number;
  deductCents: number;
}

export interface YearLegalParams {
  year: number;
  minimumWageCents: number;
  rgpsCeilingCents: number;
  inssEmployeeBrackets: RateBracket[];
  inssEmployeeCeilingContributionCents: number;
  irpfMonthlyBrackets: RateBracket[];
  irpfSimplifiedDiscountCents: number;
  irpfAge65ExemptionCents: number;
  irpfDependentDeductionCents: number;
  /** Zero IR for taxable monthly income up to this (2026 reduction). */
  irpfFullReliefUpToCents: number;
  /** Linear relief fades to zero at this income. */
  irpfPartialReliefUpToCents: number;
  irpfPartialReliefIntercept: number;
  irpfPartialReliefSlope: number;
  inssPointsWoman: number;
  inssPointsMan: number;
  inssProgressiveAgeWomanMonths: number;
  inssProgressiveAgeManMonths: number;
  /** EC 103/2019 art. 15 §3º — 81/91 in 2019 +1/year, cap 92/100. */
  inssTeacherPointsWoman: number;
  inssTeacherPointsMan: number;
  /** EC 103/2019 art. 16 §2º — 51/56 in 2019 +6m/year, cap 57/60. */
  inssTeacherProgressiveAgeWomanMonths: number;
  inssTeacherProgressiveAgeManMonths: number;
  specialPoints15: number;
  specialPoints20: number;
  specialPoints26: number;
  /** IN RFB 1.585/2015 art. 9 §1º I — short-term funds. */
  comeCotasShortTermRate: number;
  /** IN RFB 1.585/2015 art. 9 §1º II — long-term funds. */
  comeCotasLongTermRate: number;
  /** Calendar months (1–12) of come-cotas. May and November. */
  comeCotasMonths: number[];
  pgblDeductionRate: number;
  contributorMeiRate: number;
  contributorMeiTruckerRate: number;
  contributorSimplifiedRate: number;
  contributorNormalRate: number;
  factorPrevidenciarioAlfa: number;
  survivorFamilyQuota: number;
  survivorDependentQuota: number;
  survivorMaxQuota: number;
  rendaMaisInstallments: number;
  rendaMaisCustodyFreeMinWages: number;
  fgtsBirthdayBrackets: Array<{
    upToCents: number;
    rate: number;
    additionalCents: number;
  }>;
  source: string;
}

/**
 * Named premises that are not a closed legal number (checklist 4.12).
 * Defaults are conservative; never present an uncertain rule as a closed number.
 */
export interface LegalPremises {
  /** ADI 6309 did not expressly strike special points. Default: keep 66/76/86. */
  requireSpecialPoints: boolean;
  /** Lei 14.754/2023 closed/exclusive/offshore — default: come-cotas only on open funds. */
  comeCotasAppliesToClosedFunds: boolean;
  comeCotasAppliesToExclusiveFunds: boolean;
  comeCotasAppliesToOffshore: boolean;
  /**
   * Coefficient T_min for the male by-age rule (EC 103 art. 18).
   * Access is 15 years (art. 18 II); coefficient uses 20 (art. 26 §2 I
   * and IN 128/2022 art. 233 III b). Kept configurable (checklist 4.12 #10).
   */
  maleByAgeTminYears: number;
  maleByAgeTminUncertain: boolean;
  /**
   * Teacher −5 is in the constitutional text (arts. 15 §3º, 16 §2º, 20 §1º).
   * 2026 values are the mechanical series (88/98 points, 54y6m/59y6m).
   * Flag stays for a caller who wants to mark a scenario, default off.
   */
  teacherTransitionUnconfirmed: boolean;
  teacherAgeReductionYears: number;
  teacherTimeReductionYears: number;
  teacherPointsReduction: number;
  /** Lot consumption on PGBL/VGBL redemption. FIFO is market practice. */
  previdenciaLotOrder: "fifo" | "lifo";
  /** Household expense after first death, as a fraction of the couple's spend. */
  survivorExpenseFraction: number;
}

export const DEFAULT_LEGAL_PREMISES: LegalPremises = {
  requireSpecialPoints: true,
  comeCotasAppliesToClosedFunds: false,
  comeCotasAppliesToExclusiveFunds: false,
  comeCotasAppliesToOffshore: false,
  maleByAgeTminYears: 20,
  maleByAgeTminUncertain: false,
  teacherTransitionUnconfirmed: false,
  teacherAgeReductionYears: 5,
  teacherTimeReductionYears: 5,
  teacherPointsReduction: 5,
  previdenciaLotOrder: "fifo",
  survivorExpenseFraction: 0.7,
};

export interface ParameterSet {
  id: string;
  version: string;
  jurisdiction: "BR";
  asOf: string;
  years: Record<number, YearLegalParams>;
  premises: LegalPremises;
  rgpsCeilingSteps: DatedLegalAmount[];
  minimumWageSteps: DatedLegalAmount[];
}

const IRPF_2026_BRACKETS: RateBracket[] = [
  { upToCents: 242_880, rate: 0, deductCents: 0 },
  { upToCents: 282_665, rate: 0.075, deductCents: 18_216 },
  { upToCents: 375_105, rate: 0.15, deductCents: 39_416 },
  { upToCents: 466_468, rate: 0.225, deductCents: 67_549 },
  { upToCents: Number.POSITIVE_INFINITY, rate: 0.275, deductCents: 90_873 },
];

const INSS_2026_BRACKETS: RateBracket[] = [
  { upToCents: 162_100, rate: 0.075, deductCents: 0 },
  { upToCents: 290_284, rate: 0.09, deductCents: 2_432 },
  { upToCents: 435_427, rate: 0.12, deductCents: 11_140 },
  { upToCents: 847_555, rate: 0.14, deductCents: 19_850 },
];

const FGTS_BIRTHDAY: YearLegalParams["fgtsBirthdayBrackets"] = [
  { upToCents: 50_000, rate: 0.5, additionalCents: 0 },
  { upToCents: 100_000, rate: 0.4, additionalCents: 5_000 },
  { upToCents: 500_000, rate: 0.3, additionalCents: 15_000 },
  { upToCents: 1_000_000, rate: 0.2, additionalCents: 65_000 },
  { upToCents: 1_500_000, rate: 0.15, additionalCents: 115_000 },
  { upToCents: 2_000_000, rate: 0.1, additionalCents: 190_000 },
  { upToCents: Number.POSITIVE_INFINITY, rate: 0.05, additionalCents: 290_000 },
];

function year2026(): YearLegalParams {
  return {
    year: 2026,
    minimumWageCents: 162_100,
    rgpsCeilingCents: 847_555,
    inssEmployeeBrackets: INSS_2026_BRACKETS,
    inssEmployeeCeilingContributionCents: 98_807,
    irpfMonthlyBrackets: IRPF_2026_BRACKETS,
    irpfSimplifiedDiscountCents: 60_720,
    irpfAge65ExemptionCents: 190_398,
    irpfDependentDeductionCents: 18_959,
    irpfFullReliefUpToCents: 500_000,
    irpfPartialReliefUpToCents: 735_000,
    irpfPartialReliefIntercept: 978.62,
    irpfPartialReliefSlope: 0.133145,
    inssPointsWoman: 93,
    inssPointsMan: 103,
    inssProgressiveAgeWomanMonths: 59 * 12 + 6,
    inssProgressiveAgeManMonths: 64 * 12 + 6,
    inssTeacherPointsWoman: 88,
    inssTeacherPointsMan: 98,
    inssTeacherProgressiveAgeWomanMonths: 54 * 12 + 6,
    inssTeacherProgressiveAgeManMonths: 59 * 12 + 6,
    specialPoints15: 66,
    specialPoints20: 76,
    specialPoints26: 86,
    comeCotasShortTermRate: 0.2,
    comeCotasLongTermRate: 0.15,
    comeCotasMonths: [5, 11],
    pgblDeductionRate: 0.12,
    contributorMeiRate: 0.05,
    contributorMeiTruckerRate: 0.12,
    contributorSimplifiedRate: 0.11,
    contributorNormalRate: 0.2,
    factorPrevidenciarioAlfa: 0.31,
    survivorFamilyQuota: 0.5,
    survivorDependentQuota: 0.1,
    survivorMaxQuota: 1,
    rendaMaisInstallments: 240,
    rendaMaisCustodyFreeMinWages: 6,
    fgtsBirthdayBrackets: FGTS_BIRTHDAY,
    source:
      "Decreto 12.797/2025; Portaria MPS/MF 13/2026; RFB tabela IR mensal 2026; IN RFB 1.585/2015 art. 9; EC 103/2019; Lei 11.053/2004; Lei 13.135/2015; Portaria ME 424/2020",
  };
}

function yearWithTransition(base: YearLegalParams, year: number): YearLegalParams {
  const t = rgpsTransitionForYear(year);
  const jan = `${year}-01`;
  return {
    ...base,
    year,
    minimumWageCents: minimumWageAt(jan).cents,
    rgpsCeilingCents: rgpsCeilingAt(jan).cents,
    ...t,
  };
}

export function defaultParameterSet(asOf = "2026-01-01"): ParameterSet {
  const y2026 = year2026();
  const years: Record<number, YearLegalParams> = {};
  for (let year = 1994; year <= 2100; year++) {
    years[year] = yearWithTransition(y2026, year);
  }
  return {
    id: `br-${PARAMETER_SET_VERSION}`,
    version: PARAMETER_SET_VERSION,
    jurisdiction: "BR",
    asOf,
    years,
    premises: { ...DEFAULT_LEGAL_PREMISES },
    rgpsCeilingSteps: RGPS_CEILING_STEPS,
    minimumWageSteps: MINIMUM_WAGE_STEPS,
  };
}

export function paramsForYear(set: ParameterSet, year: number): YearLegalParams {
  return set.years[year] ?? set.years[2026]!;
}

/** Year pack with teto/piso of that competence (mid-year reajustes). */
export function paramsForYearMonth(
  set: ParameterSet,
  ym: string
): YearLegalParams {
  const year = Number(ym.slice(0, 4));
  const p = paramsForYear(set, year);
  return {
    ...p,
    minimumWageCents: minimumWageAt(ym, set.minimumWageSteps).cents,
    rgpsCeilingCents: rgpsCeilingAt(ym, set.rgpsCeilingSteps).cents,
  };
}

export const DEFAULT_PARAMETER_SET = defaultParameterSet();
