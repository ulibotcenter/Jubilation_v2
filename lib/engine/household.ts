import type { Ownership } from "@/lib/engine/canonical";
import type { DataSource } from "@/lib/engine/provenance";
import { createId } from "@/lib/engine/ids";
import { ageInMonths, completeYears } from "@/lib/engine/dates";
import type { ContributorKind, InssPerson, Sex } from "@/lib/engine/inssTypes";
import { DEFAULT_LIFE_EXPECTANCY_AGE } from "@/lib/engine/assumptions";

export type HouseholdScope = "holder" | "spouse" | "both";

export interface Person {
  id: string;
  role: "holder" | "spouse";
  displayName: string;
  sex: Sex;
  birthDate: string;
  lifeExpectancy: number;
  filiationDate?: string;
  contributorKind: ContributorKind;
  inss: InssPerson | null;
  source: DataSource;
  asOf: string;
}

export interface Household {
  holder: Person;
  spouse: Person | null;
  marriageDate: string | null;
  scope: HouseholdScope;
}

export function personAgeYears(person: Person, asOf: string): number {
  return completeYears(ageInMonths(person.birthDate, asOf));
}

/**
 * Last-survivor horizon in the holder's age.
 * Holder 60 targeting 90, spouse 55 targeting 90 → holder-age 95.
 */
export function lastSurvivorAgeInHolderYears(
  household: Household,
  asOf: string
): number {
  const holderYearsLeft =
    household.holder.lifeExpectancy - personAgeYears(household.holder, asOf);
  if (!household.spouse || household.scope === "holder") {
    return household.holder.lifeExpectancy;
  }
  if (household.scope === "spouse") {
    return household.spouse.lifeExpectancy;
  }
  const spouseYearsLeft =
    household.spouse.lifeExpectancy - personAgeYears(household.spouse, asOf);
  return personAgeYears(household.holder, asOf) + Math.max(holderYearsLeft, spouseYearsLeft);
}

export function ownershipInScope(
  ownership: Ownership | undefined,
  scope: HouseholdScope
): boolean {
  const o = ownership ?? "holder";
  if (scope === "both") return true;
  if (scope === "holder") return o === "holder" || o === "joint";
  return o === "spouse" || o === "joint";
}

export function deathAgeInHolderYears(
  person: Person,
  holder: Person,
  asOf: string
): number {
  const yearsLeft = person.lifeExpectancy - personAgeYears(person, asOf);
  return personAgeYears(holder, asOf) + yearsLeft;
}

export function createPerson(input: {
  role: "holder" | "spouse";
  displayName: string;
  sex: Sex;
  birthDate: string;
  asOf: string;
  lifeExpectancy?: number;
  contributorKind?: ContributorKind;
}): Person {
  return {
    id: createId("person"),
    role: input.role,
    displayName: input.displayName,
    sex: input.sex,
    birthDate: input.birthDate,
    lifeExpectancy: input.lifeExpectancy ?? DEFAULT_LIFE_EXPECTANCY_AGE,
    contributorKind: input.contributorKind ?? "clt",
    inss: null,
    source: "MANUAL",
    asOf: input.asOf,
  };
}

export function defaultHousehold(asOf: string, holderBirthDate: string, sex: Sex = "M"): Household {
  return {
    holder: createPerson({
      role: "holder",
      displayName: "You",
      sex,
      birthDate: holderBirthDate,
      asOf,
    }),
    spouse: null,
    marriageDate: null,
    scope: "holder",
  };
}

/** Age 42 on 2026-01-01 → birth date 1984-01-01. */
export function birthDateFromAge(age: number, asOf: string): string {
  const [year, month, day] = asOf.split("-");
  const y = Number(year) - Math.max(0, Math.round(age));
  return `${String(y).padStart(4, "0")}-${month ?? "01"}-${day ?? "01"}`;
}

export function householdFromKpis(
  kpis: { currentAge: number; lifeExpectancy: number },
  asOf: string,
  sex: Sex = "M"
): Household {
  const household = defaultHousehold(
    asOf,
    birthDateFromAge(kpis.currentAge, asOf),
    sex
  );
  household.holder.lifeExpectancy = kpis.lifeExpectancy;
  return household;
}

export function syncHolderWithKpis(
  household: Household,
  kpis: { currentAge: number; lifeExpectancy: number },
  asOf: string
): Household {
  return {
    ...household,
    holder: {
      ...household.holder,
      birthDate: birthDateFromAge(kpis.currentAge, asOf),
      lifeExpectancy: kpis.lifeExpectancy,
      asOf,
    },
  };
}

export function isHousehold(value: unknown): value is Household {
  if (!value || typeof value !== "object") return false;
  const v = value as Household;
  return Boolean(
    v.holder &&
      typeof v.holder.birthDate === "string" &&
      (v.scope === "holder" || v.scope === "spouse" || v.scope === "both")
  );
}
