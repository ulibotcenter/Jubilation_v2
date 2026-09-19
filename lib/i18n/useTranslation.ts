"use client";

import { useCallback, useEffect } from "react";
import { htmlLang } from "@/lib/i18n/htmlLang";
import { t, type AppLocale, type MessageKey } from "@/lib/i18n/messages";
import { useAppStore } from "@/store/useAppStore";

export function useTranslation() {
  const locale = useAppStore((s) => s.locale) as AppLocale;
  const explainSimple = useAppStore((s) => s.explainSimple);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = htmlLang(locale);
    }
  }, [locale]);

  const translate = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) =>
      t(locale, key, { simple: explainSimple, params }),
    [locale, explainSimple]
  );

  return { locale, t: translate, explainSimple };
}