import { COUNTRIES } from "@/lib/onboarding/country";
import type { AppLocale } from "@/lib/i18n/messages";
import type { Country, Currency } from "@/types";

/** Hard cap so a signed-in plan cannot be an unbounded blob. */
export const PLAN_DOCUMENT_MAX_CHARS = 1_500_000;

const LOCALES = new Set<AppLocale>(["en", "pt", "es"]);
const CURRENCIES = new Set<Currency>(["BRL", "USD", "EUR"]);
const COUNTRY_CODES = new Set<Country>(COUNTRIES.map((country) => country.code));

export interface ProfilePreferences {
  country: Country;
  locale: AppLocale;
  currency: Currency;
}

/**
 * Country, language, and currency only.
 * Plan tier is not a preference — the Stripe webhook is the only writer.
 */
export function parseProfilePreferences(body: unknown): ProfilePreferences | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  const country = raw.country;
  const locale = raw.locale;
  const currency = raw.currency;
  if (typeof country !== "string" || !COUNTRY_CODES.has(country as Country)) {
    return null;
  }
  if (typeof locale !== "string" || !LOCALES.has(locale as AppLocale)) {
    return null;
  }
  if (typeof currency !== "string" || !CURRENCIES.has(currency as Currency)) {
    return null;
  }
  return {
    country: country as Country,
    locale: locale as AppLocale,
    currency: currency as Currency,
  };
}

/**
 * Retirement-plan snapshot saved for a signed-in user.
 * Strips anything that could grant a paid plan from the browser.
 */
export function sanitizePlanDocument(
  input: unknown
): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const source =
    raw.document && typeof raw.document === "object" && !Array.isArray(raw.document)
      ? (raw.document as Record<string, unknown>)
      : raw;
  const document: Record<string, unknown> = { ...source };
  delete document.planTier;
  delete document.billingLive;
  if (document.user && typeof document.user === "object" && !Array.isArray(document.user)) {
    const user = { ...(document.user as Record<string, unknown>) };
    delete user.plan;
    delete user.subscriptionStatus;
    document.user = user;
  }
  if (!document.kpis || typeof document.kpis !== "object" || Array.isArray(document.kpis)) {
    return null;
  }
  if (
    !document.household ||
    typeof document.household !== "object" ||
    Array.isArray(document.household)
  ) {
    return null;
  }
  if (JSON.stringify(document).length > PLAN_DOCUMENT_MAX_CHARS) return null;
  return document;
}
