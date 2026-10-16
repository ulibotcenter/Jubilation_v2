import {
  BILLING_CURRENCIES,
  type BillingCurrency,
} from "@/lib/billing/catalog";

/**
 * Official eurozone members (ISO 3166-1 alpha-2), including Croatia (2023).
 * Overseas departments that use the euro but are not eurozone members are
 * not listed — those fall through to USD.
 */
export const EUROZONE_COUNTRIES = [
  "AT",
  "BE",
  "CY",
  "DE",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PT",
  "SI",
  "SK",
] as const;

const EUROZONE = new Set<string>(EUROZONE_COUNTRIES);

/** Vercel first, then common CDN / platform aliases. */
export const GEO_COUNTRY_HEADERS = [
  "x-vercel-ip-country",
  "x-vercel-ip-country-code",
  "cf-ipcountry",
  "cloudfront-viewer-country",
  "x-country-code",
  "x-appengine-country",
] as const;

const UNKNOWN_COUNTRY = new Set(["", "XX", "T1", "ZZ", "A1", "A2"]);

export function parseBillingCurrency(value: unknown): BillingCurrency | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return (BILLING_CURRENCIES as readonly string[]).includes(v)
    ? (v as BillingCurrency)
    : null;
}

export function countryFromRequestHeaders(headers: {
  get(name: string): string | null;
}): string {
  for (const name of GEO_COUNTRY_HEADERS) {
    const raw = headers.get(name)?.trim() ?? "";
    if (!raw) continue;
    const country = raw.toUpperCase();
    if (UNKNOWN_COUNTRY.has(country)) continue;
    if (/^[A-Z]{2}$/.test(country)) return country;
  }
  return "";
}

/**
 * Brazil → BRL, eurozone → EUR, everyone else (including unknown) → USD.
 */
export function currencyFromCountry(country: string | null | undefined): BillingCurrency {
  const code = (country ?? "").trim().toUpperCase();
  if (code === "BR") return "brl";
  if (EUROZONE.has(code)) return "eur";
  return "usd";
}

export function currencyFromRequestHeaders(headers: {
  get(name: string): string | null;
}): BillingCurrency {
  return currencyFromCountry(countryFromRequestHeaders(headers));
}
