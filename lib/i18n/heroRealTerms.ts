import type { Currency } from "@/types";
import { t, type AppLocale, type MessageKey } from "@/lib/i18n/messages";

const UNIT_KEY: Record<Currency, MessageKey> = {
  BRL: "currency.unit.BRL",
  USD: "currency.unit.USD",
  EUR: "currency.unit.EUR",
};

/** Hero support line follows the display currency — never hardcodes reais. */
export function heroRealTermsCopy(
  locale: AppLocale,
  currency: Currency
): string {
  return t(locale, "hero.realTerms", {
    params: { unit: t(locale, UNIT_KEY[currency]) },
  });
}
