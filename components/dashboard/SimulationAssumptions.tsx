"use client";

import { Filter, PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { isScopeFiltered, resolveSimulationKpis } from "@/lib/simulationScope";
import { useAppStore } from "@/store/useAppStore";
import { CURRENCY_SYMBOLS, formatCurrencyValue } from "@/types";

// i18n-ready: labels → future next-intl keys (simulation.assumptions.*)

interface SimulationAssumptionsProps {
  mode?: "real" | "playground";
}

export function SimulationAssumptions({
  mode = "real",
}: SimulationAssumptionsProps) {
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
  const sym = CURRENCY_SYMBOLS[currency];

  const effectiveKpis = resolveSimulationKpis(kpis, portfolio, includedIds);
  const filtered = isScopeFiltered(portfolio, includedIds);

  const items = [
    {
      icon: Wallet,
      label: filtered ? "Scoped net worth" : "Starting net worth",
      value: formatCurrencyValue(effectiveKpis.currentNetWorth, currency, true),
      hint: filtered
        ? `KPI ${formatCurrencyValue(kpis.currentNetWorth, currency, true)} adjusted for scope`
        : undefined,
    },
    {
      icon: PiggyBank,
      label: "Monthly savings",
      value: `${sym}${kpis.monthlyContribution.toLocaleString("en-US")}/mo`,
    },
    {
      icon: TrendingUp,
      label: "Expected CAGR",
      value: `${kpis.expectedCAGR.toFixed(1)}%`,
    },
    {
      icon: TrendingDown,
      label: "Inflation",
      value: `${kpis.annualInflation.toFixed(1)}%`,
    },
  ];

  return (
    <div className="sim-assumptions" aria-label="Simulation assumptions">
      {filtered && (
        <div className="sim-assumptions-scope-badge col-span-2 sm:col-span-4">
          <Filter className="w-3 h-3 text-accent" size={12} />
          <span>
            {includedIds.length} of {portfolio.length} assets in projection
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