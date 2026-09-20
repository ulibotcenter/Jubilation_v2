import type { TaxRegion } from "@/lib/tax/estimates";
import type { AppLocale } from "@/lib/i18n/messages";
import type { Country, Currency } from "@/types";

export interface CountryOption {
  code: Country;
  taxRegion: TaxRegion;
  suggestedLocale: AppLocale;
  suggestedCurrency: Currency;
}

export const COUNTRIES: CountryOption[] = [
  { code: "BR", taxRegion: "br", suggestedLocale: "pt", suggestedCurrency: "BRL" },
  { code: "US", taxRegion: "usa", suggestedLocale: "en", suggestedCurrency: "USD" },
  { code: "PT", taxRegion: "eu", suggestedLocale: "pt", suggestedCurrency: "EUR" },
  { code: "ES", taxRegion: "eu", suggestedLocale: "es", suggestedCurrency: "EUR" },
  { code: "DE", taxRegion: "eu", suggestedLocale: "en", suggestedCurrency: "EUR" },
  { code: "FR", taxRegion: "eu", suggestedLocale: "en", suggestedCurrency: "EUR" },
  { code: "IT", taxRegion: "eu", suggestedLocale: "en", suggestedCurrency: "EUR" },
  { code: "NL", taxRegion: "eu", suggestedLocale: "en", suggestedCurrency: "EUR" },
  { code: "IE", taxRegion: "eu", suggestedLocale: "en", suggestedCurrency: "EUR" },
  { code: "OTHER", taxRegion: "eu", suggestedLocale: "en", suggestedCurrency: "USD" },
];

export const DEFAULT_COUNTRY_OPTION = COUNTRIES[0]!;

export function countryOption(code: Country): CountryOption {
  return COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY_OPTION;
}

export function taxRegionForCountry(code: Country): TaxRegion {
  return countryOption(code).taxRegion;
}

/** Brazilian IRPF/come-cotas in the engine only when the tax home is Brazil. */
export function engineApplyTaxes(country: Country): boolean {
  return taxRegionForCountry(country) === "br";
}
