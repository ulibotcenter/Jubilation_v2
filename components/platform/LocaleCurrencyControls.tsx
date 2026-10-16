"use client";

import type { AppLocale } from "@/lib/i18n/messages";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { CURRENCIES, type Currency } from "@/types";
import { LocaleFlag } from "@/components/platform/LocaleFlag";

const LOCALES: AppLocale[] = ["pt", "en", "es"];

export function LocaleCurrencyControls({
  className,
}: {
  className?: string;
}) {
  const { t, locale } = useTranslation();
  const currency = useAppStore((s) => s.currency);
  const setLocale = useAppStore((s) => s.setLocale);
  const changeCurrency = useAppStore((s) => s.changeCurrency);
  const setCurrency = useAppStore((s) => s.setCurrency);
  const isChangingCurrency = useAppStore((s) => s.isChangingCurrency);

  const applyCurrency = async (next: Currency) => {
    if (next === currency || isChangingCurrency) return;
    try {
      await changeCurrency(next);
    } catch {
      setCurrency(next);
    }
  };

  return (
    <div
      className={`prefs-controls${className ? ` ${className}` : ""}`}
      data-landing-prefs="locale-currency"
    >
      <div
        className="prefs-segment prefs-segment--locale"
        role="radiogroup"
        aria-label={t("locale.aria.select")}
      >
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={locale === code}
            aria-pressed={locale === code}
            data-locale={code}
            data-active={locale === code ? "true" : "false"}
            className="prefs-chip"
            onClick={() => setLocale(code)}
          >
            <LocaleFlag locale={code} />
            <span className="prefs-chip-label">{code.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div
        className="prefs-segment"
        role="radiogroup"
        aria-label={t("currency.aria.select")}
      >
        {CURRENCIES.map((option) => (
          <button
            key={option.code}
            type="button"
            role="radio"
            aria-checked={currency === option.code}
            aria-pressed={currency === option.code}
            data-currency={option.code}
            data-active={currency === option.code ? "true" : "false"}
            className="prefs-chip"
            disabled={isChangingCurrency}
            onClick={() => {
              void applyCurrency(option.code);
            }}
          >
            <span className="prefs-chip-label">{option.code}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
