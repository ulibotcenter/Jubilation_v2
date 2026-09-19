import type { DataSource, PortfolioAsset } from "@/types";

export interface DatedValue {
  asOf: string;
  value: number;
  source: DataSource;
}

export function seedValueHistory(asset: PortfolioAsset): DatedValue[] {
  if (asset.valueHistory && asset.valueHistory.length > 0) {
    return asset.valueHistory;
  }
  const asOf = asset.asOf ?? new Date().toISOString().slice(0, 10);
  return [
    {
      asOf,
      value: asset.quantity * asset.currentPrice,
      source: asset.source ?? "MANUAL",
    },
  ];
}

/** Append-only value series (ProjectionLab-style). Never overwrite the last point in place. */
export function appendDatedValue(
  asset: PortfolioAsset,
  value: number,
  asOf: string,
  source: DataSource = "MANUAL"
): PortfolioAsset {
  const history = seedValueHistory(asset);
  const last = history[history.length - 1];
  const nextHistory =
    last && last.asOf === asOf && last.value === value
      ? history
      : [...history, { asOf, value, source }];
  const qty = asset.quantity === 0 ? 1 : asset.quantity;
  return {
    ...asset,
    currentPrice: value / qty,
    asOf,
    source,
    valueHistory: nextHistory,
  };
}
