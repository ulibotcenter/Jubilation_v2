"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { getAssetClassLabel, getScopePresetLabel } from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  applyScopePreset,
  type ScopePresetId,
} from "@/lib/simulationScope";
import { useAppStore } from "@/store/useAppStore";
import {
  calculatePortfolioValue,
  formatCurrencyValue,
  type AssetClass,
  type PortfolioAsset,
} from "@/types";

const ASSET_CLASS_ORDER: AssetClass[] = [
  "stocks",
  "etf",
  "bdr",
  "bonds",
  "funds",
  "commodities",
  "reit",
  "real_estate",
  "personal",
  "crypto",
  "cash",
  "other",
];

interface SimulationAssetFilterProps {
  className?: string;
  mode?: "real" | "playground";
}

function groupByClass(portfolio: PortfolioAsset[], locale: Parameters<typeof getAssetClassLabel>[0]) {
  return ASSET_CLASS_ORDER.map((assetClass) => ({
    assetClass,
    label: getAssetClassLabel(locale, assetClass),
    assets: portfolio.filter((a) => a.assetClass === assetClass),
  })).filter((g) => g.assets.length > 0);
}

export function SimulationAssetFilter({
  className,
  mode = "real",
}: SimulationAssetFilterProps) {
  const { t, locale } = useTranslation();
  const realPortfolio = useAppStore((s) => s.portfolio);
  const simPortfolio = useAppStore((s) => s.simPlayground.portfolio);
  const portfolio = mode === "playground" ? simPortfolio : realPortfolio;
  const currency = useAppStore((s) => s.currency);
  const realIncluded = useAppStore((s) => s.simulationIncludedAssetIds);
  const simIncluded = useAppStore((s) => s.simPlayground.simulationIncludedAssetIds);
  const includedIds = mode === "playground" ? simIncluded : realIncluded;
  const setRealIds = useAppStore((s) => s.setSimulationIncludedAssetIds);
  const setSimIds = useAppStore((s) => s.setSimSimulationIncludedAssetIds);
  const setIncludedIds = mode === "playground" ? setSimIds : setRealIds;
  const toggleReal = useAppStore((s) => s.toggleSimulationAsset);
  const toggleSim = useAppStore((s) => s.toggleSimSimulationAsset);
  const toggleAsset = mode === "playground" ? toggleSim : toggleReal;
  const toggleRealClass = useAppStore((s) => s.toggleSimulationAssetClass);
  const toggleSimClass = useAppStore((s) => s.toggleSimSimulationAssetClass);
  const toggleAssetClass =
    mode === "playground" ? toggleSimClass : toggleRealClass;

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const includedSet = useMemo(() => new Set(includedIds), [includedIds]);
  const groups = useMemo(
    () => groupByClass(portfolio, locale),
    [portfolio, locale]
  );

  const totalValue = calculatePortfolioValue(portfolio);
  const filteredValue = calculatePortfolioValue(
    portfolio.filter((a) => includedSet.has(a.id))
  );
  const excludedCount = portfolio.length - includedIds.length;
  const isFiltered = excludedCount > 0;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const applyPreset = (presetId: ScopePresetId) => {
    const ids = applyScopePreset(portfolio, presetId);
    setIncludedIds(ids);
    toast.success(
      t("simulation.scope.toastTitle", {
        label: getScopePresetLabel(locale, presetId),
      }),
      {
        description: t("simulation.scope.toastDesc", {
          included: ids.length,
          total: portfolio.length,
        }),
      }
    );
  };

  const presetIds: ScopePresetId[] = ["all", "investmentsOnly", "liquidMarkets"];

  return (
    <div ref={panelRef} className={`sim-asset-filter ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="sim-asset-filter-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Filter className="w-3.5 h-3.5" size={14} />
        <span>{t("simulation.scope.trigger")}</span>
        {isFiltered && (
          <span className="sim-asset-filter-badge">
            {t("simulation.scope.offBadge", { n: excludedCount })}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="sim-asset-filter-panel"
            role="dialog"
            aria-label={t("simulation.scope.ariaLabel")}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            <div className="sim-asset-filter-header">
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {t("simulation.scope.title")}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("simulation.scope.subtitle")}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost p-1.5"
                onClick={() => setOpen(false)}
                aria-label={t("common.close")}
              >
                <X className="w-4 h-4" size={16} />
              </button>
            </div>

            <div className="sim-asset-filter-summary">
              <span className="tabular-nums font-semibold text-foreground">
                {formatCurrencyValue(filteredValue, currency, true)}
              </span>
              <span className="text-muted-foreground">
                {t("simulation.scope.ofPortfolio", {
                  amount: formatCurrencyValue(totalValue, currency, true),
                })}
              </span>
              <span className="sim-asset-filter-count">
                {t("simulation.scope.assetCount", {
                  included: includedIds.length,
                  total: portfolio.length,
                })}
              </span>
            </div>

            <div className="sim-asset-filter-presets">
              {presetIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="sim-asset-filter-preset"
                  onClick={() => applyPreset(id)}
                >
                  {getScopePresetLabel(locale, id)}
                </button>
              ))}
            </div>

            <div className="sim-asset-filter-groups">
              {groups.map((group) => {
                const classIds = group.assets.map((a) => a.id);
                const allOn = classIds.every((id) => includedSet.has(id));
                const someOn = classIds.some((id) => includedSet.has(id));

                return (
                  <div key={group.assetClass} className="sim-asset-filter-group">
                    <button
                      type="button"
                      className="sim-asset-filter-class"
                      onClick={() =>
                        toggleAssetClass(group.assetClass, !allOn)
                      }
                      data-partial={someOn && !allOn ? "true" : "false"}
                    >
                      <span
                        className={`sim-asset-filter-check ${allOn ? "is-on" : someOn ? "is-partial" : ""}`}
                      >
                        {allOn && <Check className="w-3 h-3" size={12} />}
                      </span>
                      <span className="font-semibold text-xs">
                        {group.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {classIds.filter((id) => includedSet.has(id)).length}/
                        {classIds.length}
                      </span>
                    </button>

                    <ul className="sim-asset-filter-assets">
                      {group.assets.map((asset) => {
                        const on = includedSet.has(asset.id);
                        const value = asset.quantity * asset.currentPrice;
                        return (
                          <li key={asset.id}>
                            <button
                              type="button"
                              className="sim-asset-filter-asset"
                              data-active={on ? "true" : "false"}
                              onClick={() => toggleAsset(asset.id)}
                            >
                              <span
                                className={`sim-asset-filter-check sm ${on ? "is-on" : ""}`}
                              >
                                {on && <Check className="w-2.5 h-2.5" size={10} />}
                              </span>
                              <span className="sim-asset-filter-ticker">
                                {asset.ticker}
                              </span>
                              <span className="sim-asset-filter-name truncate">
                                {asset.name}
                              </span>
                              <span className="sim-asset-filter-value tabular-nums">
                                {formatCurrencyValue(value, currency, true)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}