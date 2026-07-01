"use client";

import { useCallback } from "react";
import { t, type AppLocale, type MessageKey } from "@/lib/i18n/messages";
import { useAppStore } from "@/store/useAppStore";

export function useTranslation() {
  const locale = useAppStore((s) => s.locale) as AppLocale;
  const explainSimple = useAppStore((s) => s.explainSimple);

  const translate = useCallback(
    (key: MessageKey) => t(locale, key, explainSimple),
    [locale, explainSimple]
  );

  return { locale, t: translate, explainSimple };
}