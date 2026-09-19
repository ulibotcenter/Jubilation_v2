import type { AssetClass, PortfolioAsset, PortfolioValueQuote } from "@/types";
import { ASSET_CLASS_LABELS, calculatePortfolioValue } from "@/types";

export interface AllocationSlice {
  assetClass: AssetClass;
  label: string;
  currentPct: number;
}

/** Current mix only — no target allocation (CVM 19: no personalized rebalance advice). */
export function currentAllocation(
  portfolio: PortfolioAsset[],
  quote?: PortfolioValueQuote
): AllocationSlice[] {
  const total = calculatePortfolioValue(portfolio, quote);
  if (total === 0) return [];

  const map = new Map<AssetClass, number>();
  for (const a of portfolio) {
    const v = a.quantity * a.currentPrice;
    map.set(a.assetClass, (map.get(a.assetClass) ?? 0) + v);
  }

  return [...map.entries()]
    .map(([assetClass, value]) => ({
      assetClass,
      label: ASSET_CLASS_LABELS[assetClass],
      currentPct: Math.round((value / total) * 1000) / 10,
    }))
    .sort((a, b) => b.currentPct - a.currentPct);
}

/** @deprecated Use currentAllocation. Always empty — we do not recommend a mix. */
export function suggestRebalance(
  _portfolio: PortfolioAsset[]
): Array<{
  assetClass: AssetClass;
  label: string;
  currentPct: number;
  targetPct: number;
  deltaPct: number;
}> {
  return [];
}
