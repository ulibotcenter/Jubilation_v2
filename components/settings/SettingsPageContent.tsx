"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronDown,
  Download,
  Globe,
  Languages,
  Loader2,
  PanelLeft,
  Settings,
  Shield,
  Sparkles,
  SunMoon,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConnectorsSection } from "@/components/connectors/ConnectorsSection";
import { exportRetirementReport } from "@/lib/exportReport";
import { canUseAdvancedExport, canUseBasicExport } from "@/lib/plans";
import { getCrossRate } from "@/lib/fx/convert";
import type { AppLocale, MessageKey } from "@/lib/i18n/messages";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { COUNTRIES } from "@/lib/onboarding/country";
import { ManualTaxRateField } from "@/components/tax/ManualTaxRateField";
import { CURRENCIES, type Country, type Currency } from "@/types";
import { HouseholdCard } from "@/components/settings/HouseholdCard";
import { B3ConsentCard } from "@/components/settings/B3ConsentCard";
import { ImportFilesCard } from "@/components/settings/ImportFilesCard";
import { BackupCard } from "@/components/settings/BackupCard";
import { CloudAccountCard } from "@/components/settings/CloudAccountCard";
import { PRIVACY_PATH } from "@/lib/privacy/local";

const LOCALES: { code: AppLocale; labelKey: MessageKey }[] = [
  { code: "en", labelKey: "locale.en" },
  { code: "pt", labelKey: "locale.pt" },
  { code: "es", labelKey: "locale.es" },
];

export function SettingsPageContent() {
  const { t } = useTranslation();
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const explainSimple = useAppStore((s) => s.explainSimple);
  const setExplainSimple = useAppStore((s) => s.setExplainSimple);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const planTier = useAppStore((s) => s.planTier);
  const currency = useAppStore((s) => s.currency);
  const country = useAppStore((s) => s.country);
  const setCountry = useAppStore((s) => s.setCountry);
  const manualEffectiveTaxRatePct = useAppStore(
    (s) => s.manualEffectiveTaxRatePct
  );
  const setManualEffectiveTaxRatePct = useAppStore(
    (s) => s.setManualEffectiveTaxRatePct
  );
  const changeCurrency = useAppStore((s) => s.changeCurrency);
  const isChangingCurrency = useAppStore((s) => s.isChangingCurrency);
  const fxSnapshot = useAppStore((s) => s.fxSnapshot);
  const user = useAppStore((s) => s.user);
  const isExporting = useAppStore((s) => s.isExporting);
  const setExporting = useAppStore((s) => s.setExporting);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const [pendingCurrency, setPendingCurrency] = useState<Currency | null>(null);

  const handleCurrencyChange = async (code: Currency) => {
    if (code === currency || isChangingCurrency) return;
    setPendingCurrency(code);
    const previous = currency;
    try {
      const snapshot = await changeCurrency(code);
      const rate = getCrossRate(previous, code, snapshot.rates);
      toast.success(t("toast.currency.success", { code }), {
        description: t("toast.currency.rate", {
          from: previous,
          rate: rate.toFixed(4),
          to: code,
        }),
      });
    } catch {
      toast.error(t("toast.currency.error"), {
        description: t("toast.currency.errorDesc"),
      });
    } finally {
      setPendingCurrency(null);
    }
  };

  const basicExport = canUseBasicExport(planTier);
  const advancedExport = canUseAdvancedExport(planTier);

  const handleExport = async (advanced: boolean) => {
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 350));
      const state = useAppStore.getState();
      const { csvFilename, jsonFilename } = exportRetirementReport(
        {
          kpis: state.kpis,
          currency: state.currency,
          projections: state.projections,
          portfolio: state.portfolio,
          simulationIncludedAssetIds: state.simulationIncludedAssetIds,
          monteCarlo: state.monteCarlo,
          stressTestResults: state.stressTestResults,
          user: state.user,
        },
        { advanced }
      );
      toast.success(t("toast.export.success"), {
        description: jsonFilename
          ? t("toast.export.successDesc", {
              csv: csvFilename,
              json: jsonFilename,
            })
          : t("toast.export.successBasic", { csv: csvFilename }),
      });
    } catch {
      toast.error(t("toast.export.error"));
    } finally {
      setExporting(false);
    }
  };

  const fxDate = fxSnapshot?.date;
  const usdToDisplay = fxSnapshot
    ? getCrossRate("USD", currency, fxSnapshot.rates)
    : null;

  return (
    <div className="secondary-page">
      <PageHeader
        icon={Settings}
        title={t("nav.settings")}
        description={t("settings.description")}
      />

      <div className="settings-page-grid">
        <section className="settings-page-card settings-page-card--featured">
          <div className="settings-page-card-head">
            <Globe className="w-4 h-4 text-accent" size={16} />
            <h2>{t("settings.currency.title")}</h2>
          </div>
          <p className="settings-page-card-body">
            {t("settings.currency.body")}
          </p>

          <div className="settings-currency-options">
            {CURRENCIES.map((c) => {
              const active = currency === c.code;
              const loading = pendingCurrency === c.code && isChangingCurrency;
              return (
                <button
                  key={c.code}
                  type="button"
                  className="settings-currency-option"
                  data-active={active ? "true" : "false"}
                  disabled={isChangingCurrency}
                  onClick={() => void handleCurrencyChange(c.code)}
                >
                  <span className="settings-currency-symbol">{c.symbol}</span>
                  <span className="settings-currency-name">{c.name}</span>
                  <span className="settings-currency-code">{c.code}</span>
                  {loading && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto" size={14} />
                  )}
                </button>
              );
            })}
          </div>

          {fxSnapshot && (
            <div className="settings-fx-meta">
              <p>
                {t("settings.currency.ratesAsOf")}{" "}
                <span className="text-foreground font-medium">{fxDate}</span>
                {usdToDisplay && currency !== "USD" && (
                  <>
                    {" · "}
                    <span className="tabular-nums">
                      {t("settings.currency.usdRate", {
                        rate: usdToDisplay.toFixed(4),
                        code: currency,
                      })}
                    </span>
                  </>
                )}
              </p>
              <p className="text-[10px] mt-1 opacity-80">
                {t("settings.currency.source")}
              </p>
            </div>
          )}
        </section>

        <BackupCard />
        <CloudAccountCard />

        <HouseholdCard />
        <ConnectorsSection>
          <ImportFilesCard />
          <B3ConsentCard />
        </ConnectorsSection>

        <section className="settings-page-card">
          <div className="settings-page-card-head">
            <Shield className="w-4 h-4 text-accent" size={16} />
            <h2>{t("settings.privacy.title")}</h2>
          </div>
          <p className="settings-page-card-body">
            {t("settings.privacy.body")}
          </p>
          <Link href={PRIVACY_PATH} className="btn-secondary mt-4 inline-flex">
            {t("settings.privacy.link")}
          </Link>
        </section>

        <section className="settings-page-card">
          <div className="settings-page-card-head">
            <Globe className="w-4 h-4 text-accent" size={16} />
            <h2>{t("settings.country.title")}</h2>
          </div>
          <p className="settings-page-card-body">
            {t("settings.country.body")}
          </p>
          <div className="settings-locale-options">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                className="settings-locale-option"
                data-active={country === c.code ? "true" : "false"}
                onClick={() => setCountry(c.code as Country)}
              >
                {t(`country.${c.code}` as MessageKey)}
              </button>
            ))}
          </div>
          <ManualTaxRateField
            country={country}
            value={manualEffectiveTaxRatePct}
            onChange={setManualEffectiveTaxRatePct}
            id="settings-manual-tax-rate"
            className="household-field mt-4"
          />
        </section>

        <section className="settings-page-card">
          <div className="settings-page-card-head">
            <Languages className="w-4 h-4 text-accent" size={16} />
            <h2>{t("settings.language.title")}</h2>
          </div>
          <p className="settings-page-card-body">
            {t("settings.language.body")}
          </p>
          <div className="settings-locale-options">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                className="settings-locale-option"
                data-active={locale === l.code ? "true" : "false"}
                onClick={() => setLocale(l.code)}
              >
                {t(l.labelKey)}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-page-card">
          <div className="settings-page-card-head">
            <SunMoon className="w-4 h-4 text-accent" size={16} />
            <h2>{t("settings.experience")}</h2>
          </div>
          <label className="settings-toggle-row">
            <span>{t("explain.simple")}</span>
            <input
              type="checkbox"
              checked={explainSimple}
              onChange={(e) => setExplainSimple(e.target.checked)}
            />
          </label>
          <div className="settings-theme-toggle mt-3">
            <button
              type="button"
              className="settings-locale-option"
              data-active={theme === "dark" ? "true" : "false"}
              onClick={() => setTheme("dark")}
            >
              {t("theme.dark")}
            </button>
            <button
              type="button"
              className="settings-locale-option"
              data-active={theme === "light" ? "true" : "false"}
              onClick={() => setTheme("light")}
            >
              {t("theme.light")}
            </button>
          </div>
        </section>

        <section className="settings-page-card">
          <div className="settings-page-card-head">
            <User className="w-4 h-4 text-accent" size={16} />
            <h2>{t("settings.account")}</h2>
          </div>
          <p className="settings-page-card-body font-medium text-foreground">
            {user?.name}
          </p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <span className="settings-plan-badge">
            {t("plan.currentBadge", {
              plan: t(`plan.${planTier}` as MessageKey),
            })}
          </span>
          <Link href="/planos" className="btn-upgrade mt-4 inline-flex">
            <Sparkles className="w-3.5 h-3.5" size={14} />
            {t("nav.upgrade")}
          </Link>
        </section>

        <section className="settings-page-card">
          <div className="settings-page-card-head">
            <Download className="w-4 h-4 text-accent" size={16} />
            <h2>{t("settings.export.title")}</h2>
          </div>
          <p className="settings-page-card-body">
            {t("settings.export.body")}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              className="btn-secondary gap-1.5"
              onClick={() => {
                if (basicExport) void handleExport(false);
              }}
              disabled={isExporting || !basicExport}
              data-export="basic"
              data-locked={basicExport ? "false" : "true"}
            >
              <Download className="w-4 h-4" size={16} />
              {isExporting
                ? t("settings.export.exporting")
                : basicExport
                  ? t("settings.export.basic")
                  : t("settings.export.basicLocked")}
            </button>
            <button
              type="button"
              className="btn-secondary gap-1.5"
              onClick={() => {
                if (advancedExport) void handleExport(true);
              }}
              disabled={isExporting || !advancedExport}
              data-export="advanced"
              data-locked={advancedExport ? "false" : "true"}
            >
              <Download className="w-4 h-4" size={16} />
              {advancedExport
                ? t("settings.export.advanced")
                : t("settings.export.advancedLocked")}
            </button>
          </div>
        </section>

        <section className="settings-page-card">
          <div className="settings-page-card-head">
            <PanelLeft className="w-4 h-4 text-accent" size={16} />
            <h2>{t("settings.navigation.title")}</h2>
          </div>
          <p className="settings-page-card-body">
            {t("settings.navigation.body", {
              state: sidebarCollapsed
                ? t("settings.navigation.collapsed")
                : t("settings.navigation.expanded"),
            })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
            {t("app.version")}
            <ChevronDown className="w-3 h-3 opacity-40" size={12} />
            <span className="text-accent">Bloco 1+2</span>
          </p>
        </section>
      </div>
    </div>
  );
}