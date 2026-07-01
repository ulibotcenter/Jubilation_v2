"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  CircleDollarSign,
  Flame,
  ShoppingBag,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { EditableNumber } from "@/components/ui/EditableNumber";
import { debounce } from "@/lib/debounce";
import { getKpiLabel } from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MessageKey } from "@/lib/i18n/messages";
import { useAppStore } from "@/store/useAppStore";
import {
  CURRENCY_SYMBOLS,
  KPI_CONFIGS,
  formatCurrencyValue,
  type KPIConfig,
  type KPIField,
} from "@/types";

/** Dashboard + playground: income lives in IncomeGoalPanel (ProjectionLab-style split) */
const KPI_GRID_FIELDS: KPIField[] = [
  "currentAge",
  "retirementAge",
  "currentNetWorth",
  "monthlyContribution",
  "monthlyExpenses",
  "expectedCAGR",
  "annualInflation",
];

// i18n-ready: labels from KPI_CONFIGS → future next-intl keys (kpi.*)

const KPI_ICONS: Record<KPIField, React.ElementType> = {
  currentAge: Calendar,
  retirementAge: Target,
  currentNetWorth: Wallet,
    monthlyContribution: CircleDollarSign,
    monthlyExpenses: ShoppingBag,
    desiredMonthlyIncome: Wallet,
    expectedCAGR: TrendingUp,
  annualInflation: Flame,
};

function getKPISubtitle(
  field: KPIField,
  kpis: {
    currentAge: number;
    retirementAge: number;
    currentNetWorth: number;
    monthlyContribution: number;
    monthlyExpenses: number;
    desiredMonthlyIncome: number;
    expectedCAGR: number;
    annualInflation: number;
  },
  currency: keyof typeof CURRENCY_SYMBOLS,
  translate: (key: MessageKey, params?: Record<string, string | number>) => string,
  portfolioLength = 0
): string {
  const yearsLeft = kpis.retirementAge - kpis.currentAge;
  const annualContrib = kpis.monthlyContribution * 12;
  const realReturn = kpis.expectedCAGR - kpis.annualInflation;

  switch (field) {
    case "currentAge":
      return translate("kpi.subtitle.born", {
        year: new Date().getFullYear() - kpis.currentAge,
      });
    case "retirementAge":
      return yearsLeft === 1
        ? translate("kpi.subtitle.yearsToGoOne")
        : translate("kpi.subtitle.yearsToGo", { n: yearsLeft });
    case "currentNetWorth":
      return translate("kpi.subtitle.totalAssets");
    case "monthlyContribution":
      return translate("kpi.subtitle.annualInvested", {
        amount: formatCurrencyValue(annualContrib, currency),
      });
    case "monthlyExpenses": {
      const annualExp = kpis.monthlyExpenses * 12;
      const incomeNeed = kpis.monthlyExpenses + kpis.monthlyContribution;
      return translate("kpi.subtitle.expenses", {
        annual: formatCurrencyValue(annualExp, currency),
        monthly: formatCurrencyValue(incomeNeed, currency),
      });
    }
    case "desiredMonthlyIncome":
      return translate("kpi.subtitle.incomeTarget", {
        amount: formatCurrencyValue(kpis.desiredMonthlyIncome * 12, currency),
      });
    case "expectedCAGR":
      return portfolioLength > 0
        ? translate("kpi.subtitle.cagrFromPortfolio")
        : realReturn > 0
          ? translate("kpi.subtitle.realReturn", { n: realReturn.toFixed(1) })
          : translate("kpi.subtitle.nominalGrowth");
    case "annualInflation":
      return translate("kpi.subtitle.inflation");
    default:
      return "";
  }
}

function KPICard({
  config,
  label,
  index,
  value,
  currencySymbol,
  currency,
  subtitle,
  onChange,
  readOnly = false,
}: {
  config: KPIConfig;
  label: string;
  index: number;
  value: number;
  currencySymbol: string;
  currency: keyof typeof CURRENCY_SYMBOLS;
  subtitle: string;
  onChange: (value: number) => void;
  readOnly?: boolean;
}) {
  const Icon = KPI_ICONS[config.field];

  return (
    <motion.article
      className="kpi-card group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -3 }}
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 shrink-0 transition-colors duration-200 group-hover:bg-accent/15">
          <Icon className="w-4 h-4 text-accent" size={16} aria-hidden="true" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground text-right leading-snug max-w-[55%] hidden sm:block">
          {subtitle}
        </span>
      </div>

      <p className="kpi-label">{label}</p>

      <div className="kpi-value mt-1">
        {readOnly ? (
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-foreground">
            {config.format === "percent"
              ? `${value.toFixed(config.decimals)}%`
              : value.toLocaleString("en-US")}
          </p>
        ) : (
          <EditableNumber
            value={value}
            onChange={onChange}
            min={config.min}
            max={config.max}
            step={config.step}
            decimals={config.decimals}
            format={config.format}
            suffix={config.suffix}
            currencySymbol={currencySymbol}
            compact={config.format === "currency"}
            inputClassName="text-xl sm:text-2xl font-bold w-full bg-transparent"
          />
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2 sm:hidden">
        {subtitle}
      </p>
    </motion.article>
  );
}

interface KPICardsProps {
  mode?: "real" | "playground";
}

export function KPICards({ mode = "real" }: KPICardsProps) {
  const { t, locale } = useTranslation();
  const realKpis = useAppStore((s) => s.kpis);
  const simKpis = useAppStore((s) => s.simPlayground.kpis);
  const kpis = mode === "playground" ? simKpis : realKpis;
  const currency = useAppStore((s) => s.currency);
  const setKPI = useAppStore((s) => s.setKPI);
  const setSimKPI = useAppStore((s) => s.setSimKPI);
  const setKpiFn = mode === "playground" ? setSimKPI : setKPI;
  const setKpiFnRef = useRef(setKpiFn);
  setKpiFnRef.current = setKpiFn;
  const realPortfolio = useAppStore((s) => s.portfolio);
  const simPortfolio = useAppStore((s) => s.simPlayground.portfolio);
  const portfolio = mode === "playground" ? simPortfolio : realPortfolio;
  const currencySymbol = CURRENCY_SYMBOLS[currency];

  const debouncedSetKpi = useMemo(
    () =>
      debounce((field: KPIField, value: number) => {
        setKpiFnRef.current(field, value);
      }, 300),
    []
  );

  useEffect(() => () => debouncedSetKpi.cancel(), [debouncedSetKpi]);

  const subtitles = useMemo(
    () =>
      Object.fromEntries(
        KPI_CONFIGS.map((c) => [
          c.field,
          getKPISubtitle(c.field, kpis, currency, t, portfolio.length),
        ])
      ) as Record<KPIField, string>,
    [kpis, currency, t, portfolio.length]
  );

  const handleChange = (field: KPIField, value: number) => {
    if (field === "expectedCAGR" && portfolio.length > 0) {
      toast.info(t("toast.kpi.cagrFromPortfolio"), {
        description: t("toast.kpi.cagrFromPortfolioDesc"),
      });
      return;
    }
    if (field === "retirementAge" && value <= kpis.currentAge) {
      toast.error(t("toast.kpi.invalidRetirementAge"), {
        description: t("toast.kpi.retirementAgeDesc", { n: kpis.currentAge }),
      });
      return;
    }
    if (field === "currentAge" && value >= kpis.retirementAge) {
      toast.error(t("toast.kpi.invalidCurrentAge"), {
        description: t("toast.kpi.currentAgeDesc", { n: kpis.retirementAge }),
      });
      return;
    }
    debouncedSetKpi(field, value);
  };

  const visibleConfigs = useMemo(
    () =>
      KPI_GRID_FIELDS.map((field) =>
        KPI_CONFIGS.find((c) => c.field === field)
      ).filter((c): c is KPIConfig => Boolean(c)),
    []
  );

  const mobilePages = useMemo(() => {
    const pages: KPIConfig[][] = [];
    for (let i = 0; i < visibleConfigs.length; i += 4) {
      pages.push(visibleConfigs.slice(i, i + 4));
    }
    return pages;
  }, [visibleConfigs]);

  const renderCard = (config: KPIConfig, index: number) => (
    <KPICard
      key={config.field}
      config={config}
      label={getKpiLabel(locale, config.field)}
      index={index}
      value={kpis[config.field]}
      currencySymbol={currencySymbol}
      currency={currency}
      subtitle={subtitles[config.field]}
      readOnly={config.field === "expectedCAGR" && portfolio.length > 0}
      onChange={(v) => handleChange(config.field, v)}
    />
  );

  return (
    <section
      aria-label={t("kpi.assumptions")}
    >
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("kpi.assumptions")}
        </h2>
        <p className="text-xs text-muted-foreground hidden sm:block">
          {mode === "playground" ? t("kpi.sandboxEdit") : t("kpi.clickEdit")}
        </p>
      </div>

      <div className="kpi-carousel" aria-label={t("kpi.assumptions")}>
        {mobilePages.map((page, pageIndex) => (
          <div key={pageIndex} className="kpi-carousel-page">
            {page.map((config, index) =>
              renderCard(config, pageIndex * 4 + index)
            )}
          </div>
        ))}
      </div>

      <div className="kpi-grid">
        {visibleConfigs.map((config, index) => renderCard(config, index))}
      </div>
    </section>
  );
}