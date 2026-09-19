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
 * Duration for deaths from 1 Jan 2021 (Portaria ME 424/2020, Lei 8.213
 * art. 77 §2º-B — the table INSS publishes for 2026):
 * - 4 months if < 18 contributions OR marriage/union < 2 years
 * - else by survivor age at death:
 *   < 22 → 3y; 22–27 → 6y; 28–30 → 10y; 31–41 → 15y; 42–44 → 20y; ≥ 45 → lifetime
 *
 * Deaths 2015–2020 used the original Lei 13.135/2015 brackets (lifetime from 44).
 * That is not an off-by-one of the spec — the Ministry shifted +1 year with
 * Portaria 424/2020 after survival tables moved. Default year is 2026.
 *
 * Disabled / severe-disability dependent: lasts while that quality remains
 * (modelled as lifetime while the flag is on).
 */
export const SURVIVOR_PENSION_SOURCE =
  "EC 103/2019 art. 23; Lei 8.213 art. 77 §2º-B (Portaria ME 424/2020, óbitos desde 1º/01/2021); Lei 13.135/2015 art. 77 (óbitos 2015–2020)";

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
  /** Calendar year of death. Default 2026 → Portaria ME 424/2020 table. */
  year?: number;
}): number | null {
  if (input.disabledDependent) return null;
  if (input.deceasedContributionMonths < 18 || input.marriageMonths < 24) {
    return 4;
  }
  const age = input.survivorAgeAtDeath;
  const from2021 = (input.year ?? 2026) >= 2021;
  if (from2021) {
    if (age < 22) return 3 * 12;
    if (age <= 27) return 6 * 12;
    if (age <= 30) return 10 * 12;
    if (age <= 41) return 15 * 12;
    if (age <= 44) return 20 * 12;
    return null;
  }
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
  const duration = survivorDurationMonths({
    deceasedContributionMonths: input.deceasedContributionMonths,
    marriageMonths: input.marriageMonths,
    survivorAgeAtDeath: input.survivorAgeAtDeath,
    disabledDependent: input.disabledDependent,
    year,
  });
  return {
    quota,
    monthlyCents: monthly,
    durationMonths: duration,
    lifetime: duration == null,
    floored: monthly > raw,
    source: SURVIVOR_PENSION_SOURCE,
  };
}
