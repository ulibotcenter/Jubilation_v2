"use client";

import { Filter, PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { isScopeFiltered, resolveSimulationKpis } from "@/lib/simulationScope";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue } from "@/types";

interface SimulationAssumptionsProps {
  mode?: "real" | "playground";
}

export function SimulationAssumptions({
  mode = "real",
}: SimulationAssumptionsProps) {
  const { t } = useTranslation();
  const realKpis = useAppStore((s) => s.kpis);
  const simKpis = useAppStore((s) => s.simPlayground.kpis);
  const kpis = mode === "playground" ? simKpis : realKpis;
  const currency = useAppStore((s) => s.currency);
  const realPortfolio = useAppStore((s) => s.portfolio);
  const simPortfolio = useAppStore((s) => s.simPlayground.portfolio);
  const portfolio = mode === "playground" ? simPortfolio : realPortfolio;
  const realIncluded = useAppStore((s) => s.simulationIncludedAssetIds);
  const simIncluded = useAppStore((s) => s.simPlayground.simulationIncludedAssetIds);
  const includedIds = mode === "playground" ? simIncluded : realIncluded;

  const effectiveKpis = resolveSimulationKpis(kpis, portfolio, includedIds);
  const filtered = isScopeFiltered(portfolio, includedIds);

  const items = [
    {
      icon: Wallet,
      label: filtered
        ? t("simulation.assumptions.scopedNetWorth")
        : t("simulation.assumptions.startingNetWorth"),
      value: formatCurrencyValue(effectiveKpis.currentNetWorth, currency, true),
      hint: filtered
        ? t("simulation.assumptions.kpiAdjustedForScope", {
            amount: formatCurrencyValue(kpis.currentNetWorth, currency, true),
          })
        : undefined,
    },
    {
      icon: PiggyBank,
      label: t("simulation.assumptions.monthlySavings"),
      value: `${formatCurrencyValue(kpis.monthlyContribution, currency)} ${t("common.perMonth")}`,
    },
    {
      icon: TrendingUp,
      label: t("kpi.field.expectedCAGR"),
      value: `${kpis.expectedCAGR.toFixed(1)}%`,
    },
    {
      icon: TrendingDown,
      label: t("simulation.assumptions.inflation"),
      value: `${kpis.annualInflation.toFixed(1)}%`,
    },
  ];

  return (
    <div className="sim-assumptions" aria-label={t("simulation.assumptions.ariaLabel")}>
      {filtered && (
        <div className="sim-assumptions-scope-badge col-span-2 sm:col-span-4">
          <Filter className="w-3 h-3 text-accent" size={12} />
          <span>
            {t("simulation.assumptions.assetsInProjection", {
              included: includedIds.length,
              total: portfolio.length,
            })}
          </span>
        </div>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="sim-assumption-item">
            <Icon className="w-3.5 h-3.5 text-accent shrink-0" size={14} />
            <span className="sim-assumption-label">{item.label}</span>
            <span className="sim-assumption-value tabular-nums">{item.value}</span>
            {item.hint && (
              <span className="text-[9px] text-muted leading-tight">{item.hint}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}