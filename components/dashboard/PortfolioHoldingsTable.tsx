"use client";

import { Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { PortfolioInlineEdit } from "@/components/ui/PortfolioInlineEdit";
import { computeHoldingMetrics } from "@/lib/portfolioMetrics";
import { CLASS_BG } from "@/lib/portfolioColors";
import { useAppStore } from "@/store/useAppStore";
import {
  ASSET_CLASS_LABELS,
  formatCurrencyValue,
  type PortfolioAsset,
} from "@/types";

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
  const updatePortfolioAsset = useAppStore((s) => s.updatePortfolioAsset);
  const updateSimPortfolioAsset = useAppStore((s) => s.updateSimPortfolioAsset);
  const updateAsset =
    mode === "playground" ? updateSimPortfolioAsset : updatePortfolioAsset;

  return (
    <div className="portfolio-table-wrapper">
      <table className="portfolio-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th className="text-right">Qty</th>
            <th className="text-right hidden md:table-cell">Avg price</th>
            <th className="text-right">Current</th>
            <th className="text-right hidden sm:table-cell">Market value</th>
            <th className="text-right hidden lg:table-cell">P&L</th>
            <th className="text-right">Return %</th>
            <th className="text-right hidden sm:table-cell">Weight</th>
            <th className="w-10" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const m = computeHoldingMetrics(asset, totalValue);
            const isPositive = m.gain >= 0;

            return (
              <tr key={asset.id}>
                <td>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`portfolio-table-ticker-icon ${CLASS_BG[asset.assetClass]}`}
                    >
                      {asset.ticker.slice(0, 3)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground">
                        {asset.ticker}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[10rem] sm:max-w-[14rem]">
                        {asset.name}
                      </p>
                      <span className="portfolio-asset-class-badge mt-0.5 inline-block">
                        {ASSET_CLASS_LABELS[asset.assetClass]}
                        {asset.currency === "BRL" && (
                          <span className="ml-1 opacity-70">· B3</span>
                        )}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="text-right">
                  <PortfolioInlineEdit
                    value={asset.quantity}
                    onCommit={(v) => updateAsset(asset.id, { quantity: v })}
                    min={0.0001}
                    step={1}
                    decimals={asset.assetClass === "crypto" ? 6 : 2}
                    ariaLabel={`Quantity for ${asset.ticker}`}
                  />
                </td>

                <td className="text-right hidden md:table-cell">
                  <PortfolioInlineEdit
                    value={asset.costBasis}
                    onCommit={(v) => updateAsset(asset.id, { costBasis: v })}
                    min={0}
                    step={0.01}
                    decimals={2}
                    ariaLabel={`Average price for ${asset.ticker}`}
                  />
                </td>

                <td className="text-right">
                  <p className="font-semibold tabular-nums text-sm">
                    {formatCurrencyValue(asset.currentPrice, asset.currency)}
                  </p>
                  {m.priceDeltaPct != null && (
                    <p
                      className={`text-[10px] tabular-nums ${
                        m.priceDeltaPct >= 0
                          ? "text-green-400/80"
                          : "text-red-400/80"
                      }`}
                    >
                      {m.priceDeltaPct >= 0 ? "+" : ""}
                      {m.priceDeltaPct.toFixed(2)}% refresh
                    </p>
                  )}
                </td>

                <td className="text-right hidden sm:table-cell font-semibold tabular-nums">
                  {formatCurrencyValue(m.marketValue, asset.currency)}
                </td>

                <td
                  className={`text-right hidden lg:table-cell tabular-nums font-medium ${
                    isPositive ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {formatCurrencyValue(m.gain, asset.currency)}
                </td>

                <td className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 font-bold tabular-nums text-sm ${
                      isPositive ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3.5 h-3.5" size={14} />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" size={14} />
                    )}
                    {isPositive ? "+" : ""}
                    {m.gainPct.toFixed(2)}%
                  </span>
                </td>

                <td className="text-right hidden sm:table-cell text-muted-foreground tabular-nums text-sm">
                  {m.weightPct.toFixed(1)}%
                </td>

                <td>
                  <button
                    type="button"
                    onClick={() => onRemove(asset)}
                    className="btn-ghost p-1.5 text-muted-foreground hover:text-red-400"
                    aria-label={`Remove ${asset.ticker}`}
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