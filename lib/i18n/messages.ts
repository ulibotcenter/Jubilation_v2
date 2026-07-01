import { EN, type MessageKey } from "./catalog/en";
import { ES } from "./catalog/es";
import { PT } from "./catalog/pt";

export type AppLocale = "en" | "pt" | "es";

export type { MessageKey };

const CATALOG: Record<AppLocale, Record<MessageKey, string>> = {
  en: EN,
  pt: PT,
  es: ES,
};

export interface TranslateOptions {
  simple?: boolean;
  params?: Record<string, string | number>;
}

export function t(
  locale: AppLocale,
  key: MessageKey,
  options?: TranslateOptions
): string {
  let base = CATALOG[locale][key] ?? CATALOG.en[key] ?? key;
  if (options?.simple) base = simplifyLabel(base, locale);
  if (options?.params) {
    for (const [k, v] of Object.entries(options.params)) {
      base = base.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return base;
}

function simplifyLabel(text: string, locale: AppLocale): string {
  if (locale === "pt") {
    return text
      .replace(/premissas|supuestos/gi, "números que você controla")
      .replace(/projeção|proyección/gi, "palpite futuro")
      .replace(/Monte Carlo/gi, "muitos futuros possíveis")
      .replace(/CAGR/gi, "crescimento médio anual");
  }
  if (locale === "es") {
    return text
      .replace(/supuestos|premissas/gi, "números que controlas")
      .replace(/proyección|projeção/gi, "estimación futura")
      .replace(/Monte Carlo/gi, "muchos futuros posibles")
      .replace(/CAGR/gi, "crecimiento medio anual");
  }
  return text
    .replace(/assumptions|premissas|supuestos/gi, "numbers you control")
    .replace(/projection|projeção|proyección/gi, "future guess")
    .replace(/Monte Carlo/gi, "many possible futures")
    .replace(/CAGR/gi, "average yearly growth");
}

export const MESSAGES = CATALOG;