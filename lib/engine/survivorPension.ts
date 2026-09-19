import {
  DEFAULT_PARAMETER_SET,
  paramsForYear,
  type ParameterSet,
} from "@/lib/engine/parameters";

/**
 * Pensão por morte do RGPS.
 * Quota: EC 103/2019 art. 23 — 50% cota familiar + 10% per dependent, max 100%
 * of the retirement (or the disability retirement the deceased would have had).
 * Floor: salário mínimo.
 *
 * Duration: Lei 13.135/2015 art. 77:
 * - 4 months if < 18 contributions OR marriage/union < 2 years
 * - else by survivor age at death (official brackets, not the off-by-one
 *   paraphrase in the discovery doc):
 *   < 21 → 3y; 21–26 → 6y; 27–29 → 10y; 30–40 → 15y; 41–43 → 20y; ≥ 44 → lifetime
 * Disabled / severe-disability dependent: lasts while that quality remains
 * (modelled as lifetime while the flag is on).
 */
export const SURVIVOR_PENSION_SOURCE =
  "EC 103/2019 art. 23; Lei 13.135/2015 art. 77; Decreto 3.048/1999";

export interface SurvivorPensionInput {
  deceasedRetirementCents: number;
  dependentCount: number;
  deceasedContributionMonths: number;
  marriageMonths: number;
  survivorAgeAtDeath: number;
  disabledDependent?: boolean;
  year?: number;
  parameterSet?: ParameterSet;
}

export interface SurvivorPensionResult {
  quota: number;
  monthlyCents: number;
  durationMonths: number | null;
  lifetime: boolean;
  floored: boolean;
  source: string;
}

export function survivorQuota(
  dependentCount: number,
  year = 2026,
  parameterSet: ParameterSet = DEFAULT_PARAMETER_SET
): number {
  const p = paramsForYear(parameterSet, year);
  const n = Math.max(0, Math.round(dependentCount));
  return Math.min(
    p.survivorMaxQuota,
    p.survivorFamilyQuota + p.survivorDependentQuota * n
  );
}

/** `null` duration = lifetime. */
export function survivorDurationMonths(input: {
  deceasedContributionMonths: number;
  marriageMonths: number;
  survivorAgeAtDeath: number;
  disabledDependent?: boolean;
}): number | null {
  if (input.disabledDependent) return null;
  if (input.deceasedContributionMonths < 18 || input.marriageMonths < 24) {
    return 4;
  }
  const age = input.survivorAgeAtDeath;
  if (age < 21) return 3 * 12;
  if (age <= 26) return 6 * 12;
  if (age <= 29) return 10 * 12;
  if (age <= 40) return 15 * 12;
  if (age <= 43) return 20 * 12;
  return null;
}

export function survivorPension(
  input: SurvivorPensionInput
): SurvivorPensionResult {
  const year = input.year ?? 2026;
  const set = input.parameterSet ?? DEFAULT_PARAMETER_SET;
  const p = paramsForYear(set, year);
  const quota = survivorQuota(input.dependentCount, year, set);
  const raw = Math.round(input.deceasedRetirementCents * quota);
  const monthly = Math.max(p.minimumWageCents, raw);
  const duration = survivorDurationMonths(input);
  return {
    quota,
    monthlyCents: monthly,
    durationMonths: duration,
    lifetime: duration == null,
    floored: monthly > raw,
    source: SURVIVOR_PENSION_SOURCE,
  };
}
