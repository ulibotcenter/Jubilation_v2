"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownAZ,
  Briefcase,
  Clock,
  Link2,
  Plus,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { PortfolioAllocationChart } from "@/components/dashboard/PortfolioAllocationChart";
import { PortfolioHoldingsTable } from "@/components/dashboard/PortfolioHoldingsTable";
import { AddAssetModal } from "@/components/ui/AddAssetModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/store/useAppStore";
import {
  ASSET_CLASS_LABELS,
  calculatePortfolioValue,
  formatCurrencyValue,
  type AssetClass,
} from "@/types";

// i18n-ready: UI strings → future next-intl keys (portfolio.*)

type SortKey = "value" | "gain" | "ticker";

interface RealPortfolioProps {
  mode?: "real" | "playground";
}

export function RealPortfolio({ mode = "real" }: RealPortfolioProps) {
  const realPortfolio = useAppStore((s) => s.portfolio);
  const simPortfolio = useAppStore((s) => s.simPlayground.portfolio);
  const portfolio = mode === "playground" ? simPortfolio : realPortfolio;

  const currency = useAppStore((s) => s.currency);

  const realKpis = useAppStore((s) => s.kpis);
  const simKpis = useAppStore((s) => s.simPlayground.kpis);
  const kpis = mode === "playground" ? simKpis : realKpis;

  const realOutside = useAppStore((s) => s.kpiOutsidePortfolio);
  const simOutside = useAppStore((s) => s.simPlayground.kpiOutsidePortfolio);
  const kpiOutsidePortfolio =
    mode === "playground" ? simOutside : realOutside;

  const realSearch = useAppStore((s) => s.portfolioSearchQuery);
  const simSearch = useAppStore((s) => s.simPlayground.portfolioSearchQuery);
  const searchQuery = mode === "playground" ? simSearch : realSearch;

  const setPortfolioSearchQuery = useAppStore((s) => s.setPortfolioSearchQuery);
  const setSimPortfolioSearchQuery = useAppStore(
    (s) => s.setSimPortfolioSearchQuery
  );
  const setSearchQuery =
    mode === "playground" ? setSimPortfolioSearchQuery : setPortfolioSearchQuery;

  const removePortfolioAsset = useAppStore((s) => s.removePortfolioAsset);
  const removeSimPortfolioAsset = useAppStore((s) => s.removeSimPortfolioAsset);
  const removeAsset =
    mode === "playground" ? removeSimPortfolioAsset : removePortfolioAsset;

  const refreshPortfolioPrices = useAppStore((s) => s.refreshPortfolioPrices);
  const refreshSimPortfolioPrices = useAppStore(
    (s) => s.refreshSimPortfolioPrices
  );
  const refreshPrices =
    mode === "playground" ? refreshSimPortfolioPrices : refreshPortfolioPrices;

  const realLastRefreshed = useAppStore((s) => s.portfolioLastRefreshedAt);
  const simLastRefreshed = useAppStore(
    (s) => s.simPlayground.portfolioLastRefreshedAt
  );
  const portfolioLastRefreshedAt =
    mode === "playground" ? simLastRefreshed : realLastRefreshed;

  const isRefreshingPrices = useAppStore((s) => s.isRefreshingPrices);

  const [addOpen, setAddOpen] = useState(false);
  const [classFilter, setClassFilter] = useState<AssetClass | "all">("all");
  const [sortBy, setSortBy] = useState<SortKey>("value");
  const [isRefreshingSim, setIsRefreshingSim] = useState(false);

  const isRefreshing =
    mode === "playground" ? isRefreshingSim : isRefreshingPrices;

  const totalValue = useMemo(
    () => calculatePortfolioValue(portfolio),
    [portfolio]
  );

  const totalCost = useMemo(
    () => portfolio.reduce((sum, a) => sum + a.quantity * a.costBasis, 0),
    [portfolio]
  );

  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const allocationSegments = useMemo(() => {
    if (totalValue === 0) return [];
    const map = new Map<AssetClass, number>();
    for (const asset of portfolio) {
      const val = asset.quantity * asset.currentPrice;
      map.set(asset.assetClass, (map.get(asset.assetClass) ?? 0) + val);
    }
    return Array.from(map.entries())
      .map(([assetClass, value]) => ({
        assetClass,
        label: ASSET_CLASS_LABELS[assetClass],
        value,
        pct: (value / totalValue) * 100,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [portfolio, totalValue]);

  const classChips = useMemo(() => {
    const classes = new Set(portfolio.map((a) => a.assetClass));
    return Array.from(classes).sort();
  }, [portfolio]);

  const filteredAssets = useMemo(() => {
    let list = portfolio;
    const q = searchQuery.toLowerCase().trim();
    if (classFilter !== "all") {
      list = list.filter((a) => a.assetClass === classFilter);
    }
    if (q) {
      list = list.filter(
        (a) =>
          a.ticker.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          ASSET_CLASS_LABELS[a.assetClass].toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "ticker") return a.ticker.localeCompare(b.ticker);
      const mvA = a.quantity * a.currentPrice;
      const mvB = b.quantity * b.currentPrice;
      const gainA = mvA - a.quantity * a.costBasis;
      const gainB = mvB - b.quantity * b.costBasis;
      if (sortBy === "gain") return gainB - gainA;
      return mvB - mvA;
    });
  }, [portfolio, searchQuery, classFilter, sortBy]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    if (mode === "playground") setIsRefreshingSim(true);
    try {
      const { updated, skipped } = await refreshPrices();
      if (updated === 0) {
        toast.info("No live quotes updated", {
          description: "Cash/manual entries are skipped. Quotes cache refreshes every 5 min.",
        });
      } else {
        toast.success(`Updated ${updated} price${updated === 1 ? "" : "s"}`, {
          description:
            skipped > 0
              ? `${skipped} skipped. Net worth KPI synced with portfolio.`
              : "Net worth KPI synced with portfolio.",
        });
      }
    } catch {
      toast.error("Could not refresh prices", {
        description: "Try again shortly — APIs may be rate-limited.",
      });
    } finally {
      if (mode === "playground") setIsRefreshingSim(false);
    }
  };

  const handleRemove = (asset: (typeof portfolio)[0]) => {
    removeAsset(asset.id);
    toast.info(`${asset.ticker} removed`, {
      description:
        mode === "playground"
          ? "Playground only — your real portfolio is unchanged."
          : undefined,
    });
  };

  return (
    <div className="space-y-5">
      <div className="portfolio-toolbar">
        <button
          type="button"
          className="btn-primary"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-4 h-4" size={16} />
          Add asset
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleRefresh}
          disabled={isRefreshing || portfolio.length === 0}
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            size={16}
          />
          {isRefreshing ? "Updating…" : "Refresh prices"}
        </button>
        <div className="portfolio-toolbar-meta">
          {portfolioLastRefreshedAt && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" size={12} />
              {new Date(portfolioLastRefreshedAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          )}
          <span className="text-[10px] text-muted">
            NYSE · NASDAQ · B3 · CoinGecko · 5m cache
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total value",
            value: formatCurrencyValue(totalValue, currency),
          },
          {
            label: "Total cost",
            value: formatCurrencyValue(totalCost, currency),
            muted: true,
          },
          {
            label: "Unrealized P&L",
            value: `${totalGain >= 0 ? "+" : ""}${formatCurrencyValue(Math.abs(totalGain), currency)} (${totalGainPct.toFixed(1)}%)`,
            positive: totalGain >= 0,
            icon: true,
          },
          {
            label: "Holdings",
            value: `${portfolio.length} assets`,
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="portfolio-stat-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <p className="portfolio-stat-label">{stat.label}</p>
            <p
              className={`portfolio-stat-value flex items-center gap-1.5 ${
                stat.muted ? "text-muted-foreground" : ""
              } ${stat.positive === true ? "text-green-400" : ""} ${
                stat.positive === false ? "text-red-400" : ""
              }`}
            >
              {stat.icon &&
                (totalGain >= 0 ? (
                  <TrendingUp className="w-4 h-4" size={16} />
                ) : (
                  <TrendingDown className="w-4 h-4" size={16} />
                ))}
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {kpiOutsidePortfolio !== 0 && (
        <div className="portfolio-networth-sync">
          <Link2 className="w-3.5 h-3.5 text-accent shrink-0" size={14} />
          <p className="text-xs text-muted-foreground">
            KPI net worth{" "}
            <span className="text-foreground font-semibold tabular-nums">
              {formatCurrencyValue(kpis.currentNetWorth, currency, true)}
            </span>{" "}
            includes{" "}
            <span className="text-foreground font-medium tabular-nums">
              {formatCurrencyValue(kpiOutsidePortfolio, currency, true)}
            </span>{" "}
            outside tracked holdings (auto-synced on portfolio changes).
          </p>
        </div>
      )}

      {allocationSegments.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground mb-4">
            Allocation by asset class
          </p>
          <PortfolioAllocationChart
            segments={allocationSegments}
            currency={currency}
            totalValue={totalValue}
          />
        </div>
      )}

      <div className="space-y-3">
        {classChips.length > 1 && (
          <div className="portfolio-class-chips">
            <button
              type="button"
              className="portfolio-class-chip"
              data-active={classFilter === "all" ? "true" : "false"}
              onClick={() => setClassFilter("all")}
            >
              All
            </button>
            {classChips.map((cls) => (
              <button
                key={cls}
                type="button"
                className="portfolio-class-chip"
                data-active={classFilter === cls ? "true" : "false"}
                onClick={() => setClassFilter(cls)}
              >
                {ASSET_CLASS_LABELS[cls]}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
              size={16}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by ticker or name (AAPL, PETR4, BTC…)…"
              className="search-input"
              aria-label="Filter portfolio"
            />
          </div>
          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={() =>
              setSortBy((s) =>
                s === "value" ? "gain" : s === "gain" ? "ticker" : "value"
              )
            }
          >
            <ArrowDownAZ className="w-4 h-4" size={16} />
            Sort:{" "}
            {sortBy === "value" ? "Value" : sortBy === "gain" ? "P&L" : "A–Z"}
          </button>
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <EmptyState
          icon={searchQuery || classFilter !== "all" ? Search : Briefcase}
          title={
            searchQuery || classFilter !== "all"
              ? "No matching holdings"
              : "Build your portfolio"
          }
          description={
            searchQuery || classFilter !== "all"
              ? "Adjust filters or add a new asset."
              : "Search markets or add homes, vehicles, and other physical assets alongside stocks, ETFs, and crypto."
          }
          action={{
            label: "Add asset",
            onClick: () => setAddOpen(true),
          }}
        />
      ) : (
        <PortfolioHoldingsTable
          assets={filteredAssets}
          totalValue={totalValue}
          onRemove={handleRemove}
          mode={mode}
        />
      )}

      <AddAssetModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mode={mode}
      />
    </div>
  );
}