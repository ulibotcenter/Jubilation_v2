import { PARAMETER_SET_VERSION } from "@/lib/engine/version";

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
  /** Art. 18 male T_min for the coefficient. Uncertain; default 20. */
  maleByAgeTminYears: number;
  maleByAgeTminUncertain: boolean;
  /** Teacher 2026 reduced points/age not confirmed — apply −5 and flag. */
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
  maleByAgeTminUncertain: true,
  teacherTransitionUnconfirmed: true,
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
      "Decreto 12.797/2025; Portaria MPS/MF 13/2026; RFB tabela IR mensal 2026; IN RFB 1.585/2015 art. 9; EC 103/2019; Lei 11.053/2004; Lei 13.135/2015",
  };
}

/** Forward-fill 2026 legal numbers so the engine can step into the future. */
function cloneYear(base: YearLegalParams, year: number): YearLegalParams {
  const pointsWoman = Math.min(100, base.inssPointsWoman + (year - 2026));
  const pointsMan = Math.min(105, base.inssPointsMan + (year - 2026));
  const ageW = Math.min(62 * 12, base.inssProgressiveAgeWomanMonths + (year - 2026) * 6);
  const ageM = Math.min(65 * 12, base.inssProgressiveAgeManMonths + (year - 2026) * 6);
  return {
    ...base,
    year,
    inssPointsWoman: pointsWoman,
    inssPointsMan: pointsMan,
    inssProgressiveAgeWomanMonths: ageW,
    inssProgressiveAgeManMonths: ageM,
  };
}

export function defaultParameterSet(asOf = "2026-01-01"): ParameterSet {
  const y2026 = year2026();
  const years: Record<number, YearLegalParams> = {};
  for (let year = 1994; year <= 2100; year++) {
    years[year] = year <= 2026 ? { ...y2026, year } : cloneYear(y2026, year);
  }
  return {
    id: `br-${PARAMETER_SET_VERSION}`,
    version: PARAMETER_SET_VERSION,
    jurisdiction: "BR",
    asOf,
    years,
    premises: { ...DEFAULT_LEGAL_PREMISES },
  };
}

export function paramsForYear(set: ParameterSet, year: number): YearLegalParams {
  return set.years[year] ?? set.years[2026]!;
}

export const DEFAULT_PARAMETER_SET = defaultParameterSet();
