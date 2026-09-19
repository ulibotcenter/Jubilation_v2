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
  fgtsBirthdayBrackets: Array<{
    upToCents: number;
    rate: number;
    additionalCents: number;
  }>;
  source: string;
}

export interface ParameterSet {
  id: string;
  version: string;
  jurisdiction: "BR";
  asOf: string;
  years: Record<number, YearLegalParams>;
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
    fgtsBirthdayBrackets: FGTS_BIRTHDAY,
    source:
      "Decreto 12.797/2025; Portaria MPS/MF 13/2026; RFB tabela IR mensal 2026",
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
  };
}

export function paramsForYear(set: ParameterSet, year: number): YearLegalParams {
  return set.years[year] ?? set.years[2026]!;
}

export const DEFAULT_PARAMETER_SET = defaultParameterSet();
