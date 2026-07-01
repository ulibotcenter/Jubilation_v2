import type { AssetClass, PortfolioAsset } from "@/types";
import { ASSET_CLASS_LABELS, calculatePortfolioValue } from "@/types";

const TARGET_ALLOCATION: Partial<Record<AssetClass, number>> = {
  stocks: 35,
  etf: 20,
  bonds: 15,
  crypto: 10,
  real_estate: 15,
  bdr: 5,
};

export interface RebalanceSuggestion {
  assetClass: AssetClass;
  label: string;
  currentPct: number;
  targetPct: number;
  deltaPct: number;
}

export function suggestRebalance(portfolio: PortfolioAsset[]): RebalanceSuggestion[] {
  const total = calculatePortfolioValue(portfolio);
  if (total === 0) return [];

  const map = new Map<AssetClass, number>();
  for (const a of portfolio) {
    const v = a.quantity * a.currentPrice;
    map.set(a.assetClass, (map.get(a.assetClass) ?? 0) + v);
  }

  const suggestions: RebalanceSuggestion[] = [];
  for (const [cls, target] of Object.entries(TARGET_ALLOCATION)) {
    const assetClass = cls as AssetClass;
    const currentPct = ((map.get(assetClass) ?? 0) / total) * 100;
    const delta = target - currentPct;
    if (Math.abs(delta) >= 3) {
      suggestions.push({
        assetClass,
        label: ASSET_CLASS_LABELS[assetClass],
        currentPct: Math.round(currentPct * 10) / 10,
        targetPct: target,
        deltaPct: Math.round(delta * 10) / 10,
      });
    }
  }
  return suggestions.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
}