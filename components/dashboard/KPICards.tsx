"use client";

import { useMemo } from "react";
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
  currency: keyof typeof CURRENCY_SYMBOLS
): string {
  const yearsLeft = kpis.retirementAge - kpis.currentAge;
  const annualContrib = kpis.monthlyContribution * 12;
  const realReturn = kpis.expectedCAGR - kpis.annualInflation;

  switch (field) {
    case "currentAge":
      return `Born ~${new Date().getFullYear() - kpis.currentAge}`;
    case "retirementAge":
      return `${yearsLeft} year${yearsLeft === 1 ? "" : "s"} to go`;
    case "currentNetWorth":
      return "Total assets today";
    case "monthlyContribution":
      return `${formatCurrencyValue(annualContrib, currency)}/yr invested`;
    case "monthlyExpenses": {
      const annualExp = kpis.monthlyExpenses * 12;
      const incomeNeed = kpis.monthlyExpenses + kpis.monthlyContribution;
      return `${formatCurrencyValue(annualExp, currency)}/yr · need ~${formatCurrencyValue(incomeNeed, currency)}/mo gross`;
    }
    case "desiredMonthlyIncome":
      return `${formatCurrencyValue(kpis.desiredMonthlyIncome * 12, currency)}/yr target`;
    case "expectedCAGR":
      return realReturn > 0
        ? `${realReturn.toFixed(1)}% real return`
        : "Nominal annual growth";
    case "annualInflation":
      return "Purchasing power erosion";
    default:
      return "";
  }
}

function KPICard({
  config,
  index,
  value,
  currencySymbol,
  currency,
  subtitle,
  onChange,
}: {
  config: KPIConfig;
  index: number;
  value: number;
  currencySymbol: string;
  currency: keyof typeof CURRENCY_SYMBOLS;
  subtitle: string;
  onChange: (value: number) => void;
}) {
  const Icon = KPI_ICONS[config.field];

  return (
    <motion.article
      className="kpi-card group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -3 }}
      aria-label={`${config.label}: ${value}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 shrink-0 transition-colors duration-200 group-hover:bg-accent/15">
          <Icon className="w-4 h-4 text-accent" size={16} aria-hidden="true" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground text-right leading-snug max-w-[55%] hidden sm:block">
          {subtitle}
        </span>
      </div>

      <p className="kpi-label">{config.label}</p>

      <div className="kpi-value mt-1">
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
  const realKpis = useAppStore((s) => s.kpis);
  const simKpis = useAppStore((s) => s.simPlayground.kpis);
  const kpis = mode === "playground" ? simKpis : realKpis;
  const currency = useAppStore((s) => s.currency);
  const setKPI = useAppStore((s) => s.setKPI);
  const setSimKPI = useAppStore((s) => s.setSimKPI);
  const setKpiFn = mode === "playground" ? setSimKPI : setKPI;
  const currencySymbol = CURRENCY_SYMBOLS[currency];

  const subtitles = useMemo(
    () =>
      Object.fromEntries(
        KPI_CONFIGS.map((c) => [
          c.field,
          getKPISubtitle(c.field, kpis, currency),
        ])
      ) as Record<KPIField, string>,
    [kpis, currency]
  );

  const handleChange = (field: KPIField, value: number) => {
    if (field === "retirementAge" && value <= kpis.currentAge) {
      toast.error("Invalid retirement age", {
        description: `Must be greater than current age (${kpis.currentAge}).`,
      });
      return;
    }
    if (field === "currentAge" && value >= kpis.retirementAge) {
      toast.error("Invalid current age", {
        description: `Must be less than retirement age (${kpis.retirementAge}).`,
      });
      return;
    }
    setKpiFn(field, value);
  };

  const visibleConfigs = useMemo(
    () =>
      KPI_GRID_FIELDS.map((field) =>
        KPI_CONFIGS.find((c) => c.field === field)
      ).filter((c): c is KPIConfig => Boolean(c)),
    []
  );

  return (
    <section
      aria-label={
        mode === "playground"
          ? "Playground assumptions"
          : "Editable retirement assumptions"
      }
    >
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {mode === "playground" ? "Playground Assumptions" : "Key Assumptions"}
        </h2>
        <p className="text-xs text-muted-foreground hidden sm:block">
          {mode === "playground"
            ? "Sandbox only — click to edit assumptions"
            : "Click any value to edit"}
        </p>
      </div>

      <div className="kpi-grid">
        {visibleConfigs.map((config, index) => (
          <KPICard
            key={config.field}
            config={config}
            index={index}
            value={kpis[config.field]}
            currencySymbol={currencySymbol}
            currency={currency}
            subtitle={subtitles[config.field]}
            onChange={(v) => handleChange(config.field, v)}
          />
        ))}
      </div>
    </section>
  );
}