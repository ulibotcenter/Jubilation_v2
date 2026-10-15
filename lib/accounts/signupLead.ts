import { COUNTRIES } from "@/lib/onboarding/country";
import type { Country } from "@/types";

const COUNTRY_CODES = new Set<Country>(COUNTRIES.map((country) => country.code));

export interface SignupLead {
  age: number;
  country: Country;
}

/** Email is checked by the auth route. Age and country are the rest of the lead. */
export function parseSignupLead(body: unknown): SignupLead | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  const age = typeof raw.age === "number" ? raw.age : Number(raw.age);
  const country = raw.country;
  if (!Number.isInteger(age) || age < 18 || age > 120) return null;
  if (typeof country !== "string" || !COUNTRY_CODES.has(country as Country)) {
    return null;
  }
  return { age, country: country as Country };
}
