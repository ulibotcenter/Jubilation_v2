"use client";

import { Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { PortfolioInlineEdit } from "@/components/ui/PortfolioInlineEdit";
import { getAssetClassLabel } from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { resolveAssetExpectedCagr } from "@/lib/portfolioCagr";
import { computeHoldingMetrics } from "@/lib/portfolioMetrics";
import { CLASS_BG } from "@/lib/portfolioColors";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue, type PortfolioAsset } from "@/types";

interface PortfolioHoldingsTableProps {
  assets: PortfolioAsset[];
  totalValue: number;
  onRemove: (asset: PortfolioAsset) => void;
  mode?: "real" | "playground";
}

export function PortfolioHoldingsTable({
  assets,
  totalValue,
  onRemove,
  mode = "real",
}: PortfolioHoldingsTableProps) {
  const { t, locale } = useTranslation();
  const b3Mode = useAppStore((s) => s.connectorSync.b3?.mode);
  const updatePortfolioAsset = useAppStore((s) => s.updatePortfolioAsset);
  const updateSimPortfolioAsset = useAppStore((s) => s.updateSimPortfolioAsset);
  const updateAsset =
    mode === "playground" ? updateSimPortfolioAsset : updatePortfolioAsset;

  return (
    <div className="portfolio-table-wrapper">
      <table className="portfolio-table">
        <thead>
          <tr>
            <th className="portfolio-col-asset">
              {t("portfolio.table.column.asset")}
            </th>
            <th className="portfolio-col-qty text-right">
              {t("portfolio.table.column.qty")}
            </th>
            <th className="portfolio-col-cagr text-right">
              {t("portfolio.table.column.cagr")}
            </th>
            <th className="portfolio-col-price text-right hidden md:table-cell">
              {t("portfolio.table.column.avgPrice")}
            </th>
            <th className="portfolio-col-price text-right">
              {t("portfolio.table.column.current")}
            </th>
            <th className="portfolio-col-value text-right hidden sm:table-cell">
              {t("portfolio.table.column.marketValue")}
            </th>
            <th className="portfolio-col-value text-right hidden lg:table-cell">
              {t("portfolio.table.column.pnl")}
            </th>
            <th className="portfolio-col-pct text-right">
              {t("portfolio.table.column.returnPct")}
            </th>
            <th className="portfolio-col-weight text-right hidden sm:table-cell">
              {t("portfolio.table.column.weight")}
            </th>
            <th
              className="portfolio-col-actions"
              aria-label={t("portfolio.table.column.actions")}
            />
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const m = computeHoldingMetrics(asset, totalValue);
            const isPositive = m.gain >= 0;
            const expectedCagr = resolveAssetExpectedCagr(asset);

            return (
              <tr key={asset.id}>
                <td className="portfolio-col-asset">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`portfolio-table-ticker-icon ${CLASS_BG[asset.assetClass]}`}
                    >
                      {asset.ticker.slice(0, 3)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">
                        {asset.ticker}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {asset.name}
                      </p>
                      {asset.source === "B3_API" && asset.asOf ? (
                        <p className="text-[10px] text-muted tabular-nums">
                          {b3Mode === "live"
                            ? t("portfolio.b3.sourceAsOf", { date: asset.asOf })
                            : b3Mode === "sandbox"
                              ? t("portfolio.b3.sourceAsOfSandbox", {
                                  date: asset.asOf,
                                })
                              : t("portfolio.b3.sourceAsOfFixture", {
                                  date: asset.asOf,
                                })}
                        </p>
                      ) : null}
                      <span className="portfolio-asset-class-badge mt-0.5 inline-block">
                        {getAssetClassLabel(locale, asset.assetClass)}
                        {asset.currency === "BRL" && (
                          <span className="ml-1 opacity-70">· B3</span>
                        )}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="portfolio-col-qty text-right">
                  <PortfolioInlineEdit
                    value={asset.quantity}
                    onCommit={(v) => updateAsset(asset.id, { quantity: v })}
                    min={0.0001}
                    step={1}
                    decimals={asset.assetClass === "crypto" ? 6 : 2}
                    className="portfolio-inline-edit--qty"
                    ariaLabel={t("portfolio.table.aria.quantity", {
                      ticker: asset.ticker,
                    })}
                  />
                </td>

                <td className="portfolio-col-cagr text-right">
                  <div className="portfolio-cagr-cell">
                    <PortfolioInlineEdit
                      value={expectedCagr}
                      onCommit={(v) =>
                        updateAsset(asset.id, { expectedCAGR: v })
                      }
                      min={-20}
                      max={40}
                      step={0.1}
                      decimals={1}
                      className="portfolio-inline-edit--cagr"
                      ariaLabel={t("portfolio.table.aria.cagr", {
                        ticker: asset.ticker,
                      })}
                    />
                    <span className="portfolio-cagr-suffix">%</span>
                  </div>
                </td>

                <td className="portfolio-col-price text-right hidden md:table-cell">
                  <PortfolioInlineEdit
                    value={asset.costBasis}
                    onCommit={(v) => updateAsset(asset.id, { costBasis: v })}
                    min={0}
                    step={0.01}
                    decimals={2}
                    className="portfolio-inline-edit--price"
                    ariaLabel={t("portfolio.table.aria.avgPrice", {
                      ticker: asset.ticker,
                    })}
                  />
                </td>

                <td className="portfolio-col-price text-right">
                  <p className="portfolio-cell-value">
                    {formatCurrencyValue(asset.currentPrice, asset.currency)}
                  </p>
                  {m.priceDeltaPct != null && (
                    <p
                      className={`portfolio-cell-sub ${
                        m.priceDeltaPct >= 0
                          ? "text-gain opacity-80"
                          : "text-loss opacity-80"
                      }`}
                    >
                      {m.priceDeltaPct >= 0 ? "+" : ""}
                      {m.priceDeltaPct.toFixed(2)}% {t("portfolio.table.priceRefresh")}
                    </p>
                  )}
                </td>

                <td className="portfolio-col-value text-right hidden sm:table-cell">
                  <span className="portfolio-cell-value">
                    {formatCurrencyValue(m.marketValue, asset.currency)}
                  </span>
                </td>

                <td
                  className={`portfolio-col-value text-right hidden lg:table-cell portfolio-cell-value ${
                    isPositive ? "text-gain" : "text-loss"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {formatCurrencyValue(m.gain, asset.currency)}
                </td>

                <td className="portfolio-col-pct text-right">
                  <span
                    className={`inline-flex items-center gap-1 font-bold tabular-nums text-sm whitespace-nowrap ${
                      isPositive ? "text-gain" : "text-loss"
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3.5 h-3.5 shrink-0" size={14} />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 shrink-0" size={14} />
                    )}
                    {isPositive ? "+" : ""}
                    {m.gainPct.toFixed(2)}%
                  </span>
                </td>

                <td className="portfolio-col-weight text-right hidden sm:table-cell text-muted-foreground tabular-nums text-sm whitespace-nowrap">
                  {m.weightPct.toFixed(1)}%
                </td>

                <td className="portfolio-col-actions">
                  <button
                    type="button"
                    onClick={() => onRemove(asset)}
                    className="btn-ghost p-1.5 text-muted-foreground hover:text-red-400"
                    aria-label={t("portfolio.table.aria.remove", {
                      ticker: asset.ticker,
                    })}
                  >
                    <Trash2 className="w-4 h-4" size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}