import type { AppLocale } from "@/lib/i18n/messages";

export function htmlLang(locale: AppLocale | string): string {
  if (locale === "pt") return "pt-BR";
  if (locale === "es") return "es";
  return "en";
}
