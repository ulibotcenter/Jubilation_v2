"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/messages";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

const LOCALES: { code: AppLocale; flag: string; labelKey: "locale.en" | "locale.pt" | "locale.es" }[] = [
  { code: "en", flag: "🇺🇸", labelKey: "locale.en" },
  { code: "pt", flag: "🇧🇷", labelKey: "locale.pt" },
  { code: "es", flag: "🇪🇸", labelKey: "locale.es" },
];

export function LocaleThemeControls() {
  const { t, locale } = useTranslation();
  const setLocale = useAppStore((s) => s.setLocale);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [localeOpen, setLocaleOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setLocaleOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <div className="locale-theme-controls flex items-center gap-1.5">
      <button
        type="button"
        className="theme-toggle-btn"
        onClick={toggleTheme}
        aria-label={t("theme.aria.toggle")}
        title={theme === "dark" ? t("theme.light") : t("theme.dark")}
      >
        <AnimatePresence mode="wait" initial={false}>
          {theme === "dark" ? (
            <motion.span
              key="moon"
              initial={{ rotate: -30, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 30, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="theme-toggle-icon"
            >
              <Moon className="w-4 h-4" size={16} />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 30, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -30, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="theme-toggle-icon theme-toggle-icon--sun"
            >
              <Sun className="w-4 h-4" size={16} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <div ref={ref} className="relative">
        <button
          type="button"
          className="locale-toggle-btn"
          onClick={() => setLocaleOpen((o) => !o)}
          aria-label={t("locale.aria.select")}
          aria-expanded={localeOpen}
          aria-haspopup="listbox"
        >
          <span className="locale-flag" aria-hidden="true">
            {current.flag}
          </span>
          <span className="hidden sm:inline text-xs font-semibold uppercase">
            {current.code}
          </span>
        </button>

        <AnimatePresence>
          {localeOpen && (
            <motion.div
              className="dropdown-menu locale-dropdown absolute right-0 top-full mt-1.5 z-50 min-w-[9rem]"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              role="listbox"
            >
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  role="option"
                  aria-selected={locale === l.code}
                  data-active={locale === l.code ? "true" : "false"}
                  className="dropdown-item"
                  onClick={() => {
                    setLocale(l.code);
                    setLocaleOpen(false);
                  }}
                >
                  <span className="text-base leading-none">{l.flag}</span>
                  <span>{t(l.labelKey)}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}