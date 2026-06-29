import type { PortfolioAsset } from "@/types";

export interface HoldingMetrics {
  marketValue: number;
  costValue: number;
  gain: number;
  gainPct: number;
  weightPct: number;
  priceDeltaPct: number | null;
}

export function computeHoldingMetrics(
  asset: PortfolioAsset,
  totalPortfolioValue: number
): HoldingMetrics {
  const marketValue = asset.quantity * asset.currentPrice;
  const costValue = asset.quantity * asset.costBasis;
  const gain = marketValue - costValue;
  const gainPct = costValue > 0 ? (gain / costValue) * 100 : 0;
  const weightPct =
    totalPortfolioValue > 0 ? (marketValue / totalPortfolioValue) * 100 : 0;

  const priceDeltaPct =
    asset.previousPrice != null && asset.previousPrice > 0
      ? ((asset.currentPrice - asset.previousPrice) / asset.previousPrice) * 100
      : null;

  return {
    marketValue,
    costValue,
    gain,
    gainPct,
    weightPct,
    priceDeltaPct,
  };
}