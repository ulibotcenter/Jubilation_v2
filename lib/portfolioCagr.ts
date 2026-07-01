import type { AssetClass, KPIValues, PortfolioAsset } from "@/types";

/** Default expected nominal CAGR (%) by asset class */
export const DEFAULT_ASSET_CLASS_CAGR: Record<AssetClass, number> = {
  stocks: 10,
  etf: 8.5,
  bonds: 4.5,
  bdr: 9,
  funds: 7,
  commodities: 5,
  reit: 7.5,
  real_estate: 3,
  personal: 0,
  crypto: 12,
  cash: 0,
  other: 6,
};

export function defaultCagrForAssetClass(assetClass: AssetClass): number {
  return DEFAULT_ASSET_CLASS_CAGR[assetClass];
}

export function resolveAssetExpectedCagr(asset: PortfolioAsset): number {
  return asset.expectedCAGR ?? defaultCagrForAssetClass(asset.assetClass);
}

export function normalizePortfolioAssetCagr(
  asset: PortfolioAsset
): PortfolioAsset {
  return {
    ...asset,
    expectedCAGR: resolveAssetExpectedCagr(asset),
  };
}

export function normalizePortfolioCagr(
  portfolio: PortfolioAsset[]
): PortfolioAsset[] {
  return portfolio.map(normalizePortfolioAssetCagr);
}

/** Value-weighted expected CAGR (%) for a subset of holdings */
export function computeWeightedPortfolioCagr(
  portfolio: PortfolioAsset[],
  assetIds?: string[]
): number | null {
  const idSet = assetIds ? new Set(assetIds) : null;
  const pool = idSet
    ? portfolio.filter((a) => idSet.has(a.id))
    : portfolio;

  if (pool.length === 0) return null;

  let totalValue = 0;
  let weighted = 0;

  for (const asset of pool) {
    const marketValue = asset.quantity * asset.currentPrice;
    if (marketValue <= 0) continue;
    totalValue += marketValue;
    weighted += marketValue * resolveAssetExpectedCagr(asset);
  }

  if (totalValue <= 0) return null;
  return Math.round((weighted / totalValue) * 10) / 10;
}

export function applyPortfolioCagrToKpis(
  kpis: KPIValues,
  portfolio: PortfolioAsset[]
): KPIValues {
  const cagr = computeWeightedPortfolioCagr(portfolio);
  if (cagr == null) return kpis;
  return { ...kpis, expectedCAGR: cagr };
}

export function applyIncludedPortfolioCagr(
  kpis: KPIValues,
  portfolio: PortfolioAsset[],
  includedAssetIds: string[]
): KPIValues {
  const cagr = computeWeightedPortfolioCagr(portfolio, includedAssetIds);
  if (cagr == null) return kpis;
  return { ...kpis, expectedCAGR: cagr };
}