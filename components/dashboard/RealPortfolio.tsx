"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownAZ,
  Briefcase,
  Clock,
  Eraser,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { PortfolioEmptyState } from "@/components/dashboard/EmptyScreens";
import { PortfolioAllocationChart } from "@/components/dashboard/PortfolioAllocationChart";
import { PortfolioHoldingsTable } from "@/components/dashboard/PortfolioHoldingsTable";
import { AddAssetModal } from "@/components/ui/AddAssetModal";
import { ConnectB3Button } from "@/components/portfolio/ConnectB3Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAssetClassLabel } from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { canUseConnectors, canUseFullPlanner } from "@/lib/plans";
import { computeWeightedPortfolioCagr } from "@/lib/portfolioCagr";
import { allocationByClass } from "@/lib/rebalance";
import { useAppStore } from "@/store/useAppStore";
import { convertHoldingMajor } from "@/lib/fx/convert";
import { FALLBACK_FX_RATES } from "@/lib/fx/types";
import {
  calculatePortfolioValue,
  formatCurrencyValue,
  type AssetClass,
} from "@/types";

type SortKey = "value" | "gain" | "ticker";

interface RealPortfolioProps {
  mode?: "real" | "playground";
}

export function RealPortfolio({ mode = "real" }: RealPortfolioProps) {
  const { t, locale } = useTranslation();
  const realPortfolio = useAppStore((s) => s.portfolio);
  const simPortfolio = useAppStore((s) => s.simPlayground.portfolio);
  const portfolio = mode === "playground" ? simPortfolio : realPortfolio;

  const currency = useAppStore((s) => s.currency);
  const fxRates = useAppStore((s) => s.fxSnapshot?.rates) ?? FALLBACK_FX_RATES;
  const valueQuote = useMemo(
    () => ({ currency, rates: fxRates }),
    [currency, fxRates]
  );

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
  const clearPortfolio = useAppStore((s) => s.clearPortfolio);
  const modelSeedActive = useAppStore((s) => s.modelSeedActive);
  const planTier = useAppStore((s) => s.planTier);
  const connectorsOpen = canUseConnectors(planTier);
  const holdingCapBlocked = useAppStore((s) => s.holdingCapBlocked);

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
    () => calculatePortfolioValue(portfolio, valueQuote),
    [portfolio, valueQuote]
  );

  const totalCost = useMemo(
    () =>
      portfolio.reduce(
        (sum, a) =>
          sum +
          convertHoldingMajor(
            a.quantity * a.costBasis,
            a.nativeCurrency ?? a.currency,
            valueQuote
          ),
        0
      ),
    [portfolio, valueQuote]
  );

  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const weightedCagr = useMemo(
    () => computeWeightedPortfolioCagr(portfolio),
    [portfolio]
  );

  const allocationSegments = useMemo(() => {
    if (totalValue === 0) return [];
    return allocationByClass(portfolio, valueQuote).map((seg) => ({
      assetClass: seg.assetClass,
      label: getAssetClassLabel(locale, seg.assetClass),
      value: seg.value,
      pct: seg.pct,
    }));
  }, [portfolio, totalValue, locale, valueQuote]);

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
          getAssetClassLabel(locale, a.assetClass).toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "ticker") return a.ticker.localeCompare(b.ticker);
      const mvA = convertHoldingMajor(
        a.quantity * a.currentPrice,
        a.nativeCurrency ?? a.currency,
        valueQuote
      );
      const mvB = convertHoldingMajor(
        b.quantity * b.currentPrice,
        b.nativeCurrency ?? b.currency,
        valueQuote
      );
      const gainA =
        mvA -
        convertHoldingMajor(
          a.quantity * a.costBasis,
          a.nativeCurrency ?? a.currency,
          valueQuote
        );
      const gainB =
        mvB -
        convertHoldingMajor(
          b.quantity * b.costBasis,
          b.nativeCurrency ?? b.currency,
          valueQuote
        );
      if (sortBy === "gain") return gainB - gainA;
      return mvB - mvA;
    });
  }, [portfolio, searchQuery, classFilter, sortBy, locale, valueQuote]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    if (mode === "playground") setIsRefreshingSim(true);
    try {
      const { updated, skipped } = await refreshPrices();
      if (updated === 0) {
        toast.info(t("toast.portfolio.noQuotesUpdated"), {
          description: t("toast.portfolio.noQuotesDesc"),
        });
      } else {
        toast.success(
          updated === 1
            ? t("toast.portfolio.pricesUpdatedOne")
            : t("toast.portfolio.pricesUpdatedMany", { n: updated }),
          {
            description:
              skipped > 0
                ? t("toast.portfolio.pricesSkipped", { skipped })
                : t("toast.portfolio.pricesSynced"),
          }
        );
      }
    } catch {
      toast.error(t("toast.portfolio.refreshError"), {
        description: t("toast.portfolio.refreshErrorDesc"),
      });
    } finally {
      if (mode === "playground") setIsRefreshingSim(false);
    }
  };

  const handleRemove = (asset: (typeof portfolio)[0]) => {
    removeAsset(asset.id);
    toast.info(t("toast.portfolio.removed", { ticker: asset.ticker }), {
      description:
        mode === "playground"
          ? t("toast.portfolio.removedPlayground")
          : undefined,
    });
  };

  const handleClearAll = () => {
    if (mode !== "real") return;
    if (!window.confirm(t("portfolio.clearConfirm"))) return;
    clearPortfolio();
    toast.info(t("toast.portfolio.cleared"), {
      description: t("toast.portfolio.clearedDesc"),
    });
  };

  if (mode === "real" && portfolio.length === 0) {
    return <PortfolioEmptyState canAdd={canUseFullPlanner(planTier)} />;
  }

  return (
    <div className="space-y-5">
      {mode === "real" && holdingCapBlocked ? (
        <p className="text-sm text-muted-foreground" role="alert" data-holding-cap="blocked">
          {t("portfolio.cap.body")}
        </p>
      ) : null}
      {mode === "real" && modelSeedActive && portfolio.length > 0 ? (
        <div className="portfolio-model-banner" role="status">
          <p>{t("portfolio.model.banner")}</p>
          <button
            type="button"
            className="btn-secondary"
            data-testid="portfolio-clear-example"
            onClick={handleClearAll}
          >
            <Eraser className="w-4 h-4" size={16} aria-hidden />
            {t("portfolio.clearAll")}
          </button>
        </div>
      ) : null}
      <div className="portfolio-toolbar">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            document
              .getElementById("portfolio-holdings")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          <Pencil className="w-4 h-4" size={16} />
          {t("portfolio.editAssets")}
        </button>
        {mode === "real" && !modelSeedActive && portfolio.length > 0 ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={handleClearAll}
          >
            <Eraser className="w-4 h-4" size={16} aria-hidden />
            {t("portfolio.clearAll")}
          </button>
        ) : null}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-4 h-4" size={16} />
          {t("portfolio.addAsset")}
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
          {isRefreshing ? t("portfolio.updating") : t("portfolio.refreshPrices")}
        </button>
        {mode === "real" && connectorsOpen ? <ConnectB3Button /> : null}
        <div className="portfolio-toolbar-meta">
          {portfolioLastRefreshedAt && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" size={12} />
              {new Date(portfolioLastRefreshedAt).toLocaleString(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          )}
          <span className="text-[10px] text-muted">
            {t("portfolio.dataSources")}
          </span>
        </div>
      </div>

      {portfolio.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={t("portfolio.empty.build.title")}
          description={t("portfolio.empty.build.desc")}
          action={{
            label: t("portfolio.addAsset"),
            onClick: () => setAddOpen(true),
          }}
        />
      ) : (
        <>
      <div className="portfolio-stat-grid">
        {[
          {
            key: "totalValue",
            label: t("portfolio.stat.totalValue"),
            value: formatCurrencyValue(totalValue, currency),
          },
          {
            key: "totalCost",
            label: t("portfolio.stat.totalCost"),
            value: formatCurrencyValue(totalCost, currency),
            muted: true,
          },
          {
            key: "unrealizedPnL",
            label: t("portfolio.stat.unrealizedPnL"),
            value: `${totalGain >= 0 ? "+" : ""}${formatCurrencyValue(Math.abs(totalGain), currency)} (${totalGainPct.toFixed(1)}%)`,
            positive: totalGain >= 0,
            icon: true,
          },
          {
            key: "weightedCagr",
            label: t("portfolio.stat.weightedCagr"),
            value:
              weightedCagr != null
                ? `${weightedCagr.toFixed(1)}%`
                : "—",
            accent: true,
          },
          {
            key: "holdings",
            label: t("portfolio.stat.holdings"),
            value:
              portfolio.length === 1
                ? t("portfolio.holdingsCountOne")
                : t("portfolio.holdingsCount", { n: portfolio.length }),
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.key}
            className="portfolio-stat-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <p className="portfolio-stat-label">{stat.label}</p>
            <p
              className={`portfolio-stat-value flex items-center gap-1.5 ${
                stat.muted ? "text-muted-foreground" : ""
              } ${stat.positive === true ? "text-gain" : ""} ${
                stat.positive === false ? "text-loss" : ""
              } ${"accent" in stat && stat.accent ? "text-accent" : ""}`}
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
            {t("portfolio.netWorthSync", {
              netWorth: formatCurrencyValue(
                kpis.currentNetWorth,
                currency,
                true
              ),
              outside: formatCurrencyValue(
                kpiOutsidePortfolio,
                currency,
                true
              ),
            })}
          </p>
        </div>
      )}

      {allocationSegments.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground mb-4">
            {t("portfolio.allocationTitle")}
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
              {t("common.all")}
            </button>
            {classChips.map((cls) => (
              <button
                key={cls}
                type="button"
                className="portfolio-class-chip"
                data-active={classFilter === cls ? "true" : "false"}
                onClick={() => setClassFilter(cls)}
              >
                {getAssetClassLabel(locale, cls)}
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
              placeholder={t("portfolio.searchPlaceholder")}
              className="search-input"
              aria-label={t("portfolio.searchAria")}
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
            {t("portfolio.sort.label")}{" "}
            {sortBy === "value"
              ? t("portfolio.sort.value")
              : sortBy === "gain"
                ? t("portfolio.sort.gain")
                : t("portfolio.sort.ticker")}
          </button>
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <EmptyState
          icon={searchQuery || classFilter !== "all" ? Search : Briefcase}
          title={
            searchQuery || classFilter !== "all"
              ? t("portfolio.empty.noMatch.title")
              : t("portfolio.empty.build.title")
          }
          description={
            searchQuery || classFilter !== "all"
              ? t("portfolio.empty.noMatch.desc")
              : t("portfolio.empty.build.desc")
          }
          action={{
            label: t("portfolio.addAsset"),
            onClick: () => setAddOpen(true),
          }}
        />
      ) : (
        <>
          <PortfolioHoldingsTable
            assets={filteredAssets}
            totalValue={totalValue}
            quote={valueQuote}
            onRemove={handleRemove}
            mode={mode}
          />
          <p className="portfolio-cagr-footnote text-[11px] text-muted-foreground leading-snug">
            {t("portfolio.cagrFootnote")}
          </p>
        </>
      )}
        </>
      )}

      <AddAssetModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mode={mode}
      />
    </div>
  );
}