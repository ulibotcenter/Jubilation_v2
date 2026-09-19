import type { DataSource } from "@/lib/engine/provenance";

export type Sex = "F" | "M";

export type ContributorKind =
  | "clt"
  | "mei_5"
  | "mei_12"
  | "simplified_11"
  | "normal_20"
  | "facultative_5";

export type SpecialExposure = 15 | 20 | 25;

export interface ContributionCompetence {
  /** YYYY-MM */
  yearMonth: string;
  wageCents: number;
  kind: ContributorKind;
  /** 5%/11% topped up to 20% on the same base — quality of time, not RMI. */
  complemented?: boolean;
  specialExposureYears?: SpecialExposure;
  teacher?: boolean;
  /** INPC factor to as-of money. 1 = already in as-of money (tests). */
  inpcFactor?: number;
}

export const RGPS_REFORM_ISO = "2019-11-13";
export const BENEFIT_SALARY_START_YM = "1994-07";

export const CONTRIBUTOR_RATES = {
  mei_5: 0.05,
  facultative_5: 0.05,
  mei_12: 0.12,
  simplified_11: 0.11,
  normal_20: 0.2,
  clt: 0,
} as const;

export function countsAsCarencia(kind: ContributorKind): boolean {
  return kind !== "clt" ? true : true;
}

export function countsAsTempoContribuicao(
  c: ContributionCompetence
): boolean {
  if (c.kind === "clt" || c.kind === "normal_20") return true;
  if (c.complemented) return true;
  return false;
}

/** Special time after the reform cannot convert to common TC (EC 103). */
export function countsAsCommonTc(c: ContributionCompetence): boolean {
  if (!countsAsTempoContribuicao(c)) return false;
  if (
    c.specialExposureYears &&
    c.yearMonth >= RGPS_REFORM_ISO.slice(0, 7)
  ) {
    return false;
  }
  return true;
}

export interface InssPerson {
  id: string;
  sex: Sex;
  birthDate: string;
  filiationDate: string;
  history: ContributionCompetence[];
  asOf: string;
  teacher?: boolean;
  specialExposureYears?: SpecialExposure | null;
  /**
   * Optional Es override for the fator. Live path leaves this unset so
   * Lei 9.876/1999 §8º applies (IBGE both-sexes national average).
   */
  survivalExpectancyYears?: number;
  source?: DataSource;
}

export type InssRuleId =
  | "permanent"
  | "points"
  | "progressive_age"
  | "pedagio_50"
  | "pedagio_100"
  | "by_age"
  | "teacher_permanent"
  | "teacher_pedagio_100"
  | "special";

export interface InssRuleResult {
  ruleId: InssRuleId;
  eligible: boolean;
  eligibilityAgeMonths: number;
  eligibilityDate: string;
  contributionYears: number;
  coefficient: number;
  benefitSalaryCents: number;
  rmiCents: number;
  usesFactor: boolean;
  factor?: number;
  presentValueCents: number;
  reasons: string[];
  uncertain?: boolean;
  source: string;
}

export interface InssEvaluation {
  personId: string;
  asOf: string;
  benefitSalaryCents: number;
  carenciaMonths: number;
  tcMonths: number;
  ranked: InssRuleResult[];
  best: InssRuleResult | null;
  parameterSetVersion: string;
}
