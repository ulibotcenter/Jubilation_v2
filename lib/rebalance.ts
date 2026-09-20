import type { AssetClass, PortfolioAsset, PortfolioValueQuote } from "@/types";
import { ASSET_CLASS_LABELS, calculatePortfolioValue } from "@/types";
import { convertHoldingMajor } from "@/lib/fx/convert";

export interface ClassAllocation {
  assetClass: AssetClass;
  value: number;
  pct: number;
}

export interface AllocationSlice {
  assetClass: AssetClass;
  label: string;
  currentPct: number;
}

/**
 * Class market values in the quote (display) currency.
 * Native prices are converted at the quote — never summed 1:1 against an FX total.
 */
export function allocationByClass(
  portfolio: PortfolioAsset[],
  quote?: PortfolioValueQuote
): ClassAllocation[] {
  const total = calculatePortfolioValue(portfolio, quote);
  if (total === 0) return [];

  const map = new Map<AssetClass, number>();
  for (const a of portfolio) {
    const native = a.quantity * a.currentPrice;
    const value = quote
      ? convertHoldingMajor(native, a.nativeCurrency ?? a.currency, quote)
      : native;
    map.set(a.assetClass, (map.get(a.assetClass) ?? 0) + value);
  }

  return [...map.entries()]
    .map(([assetClass, value]) => ({
      assetClass,
      value,
      pct: (value / total) * 100,
    }))
    .sort((a, b) => b.pct - a.pct);
}

/** Current mix only — no target allocation (CVM 19: no personalized rebalance advice). */
export function currentAllocation(
  portfolio: PortfolioAsset[],
  quote?: PortfolioValueQuote
): AllocationSlice[] {
  return allocationByClass(portfolio, quote).map(
    ({ assetClass, pct }) => ({
      assetClass,
      label: ASSET_CLASS_LABELS[assetClass],
      currentPct: Math.round(pct * 10) / 10,
    })
  );
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
