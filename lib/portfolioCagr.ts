import type { AssetClass, KPIValues, PortfolioAsset } from "@/types";
import { fisherNominal } from "@/lib/engine/rates";
import { DEFAULT_LONG_RUN_INFLATION } from "@/lib/engine/assumptions";

/** Default expected REAL annual return (%) by asset class (BRL, conservative). */
export const DEFAULT_ASSET_CLASS_REAL_RETURN: Record<AssetClass, number> = {
  stocks: 4.5,
  etf: 4,
  bonds: 4,
  bdr: 4.5,
  funds: 3.5,
  commodities: 0.5,
  reit: 3.5,
  real_estate: 0,
  personal: 0,
  crypto: 2,
  cash: 2,
  derivatives: 0,
  other: 3.5,
};

/** Nominal % at the long-run inflation default — UI still edits nominal. */
export const DEFAULT_ASSET_CLASS_CAGR: Record<AssetClass, number> = (
  Object.keys(DEFAULT_ASSET_CLASS_REAL_RETURN) as AssetClass[]
).reduce(
  (acc, cls) => {
    acc[cls] =
      Math.round(
        fisherNominal(
          DEFAULT_ASSET_CLASS_REAL_RETURN[cls] / 100,
          DEFAULT_LONG_RUN_INFLATION
        ) *
          1000
      ) / 10;
    return acc;
  },
  {} as Record<AssetClass, number>
);

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

/**
 * Display helper only. Never write the result back over the user's KPI.
 * (M2: the old applyPortfolioCagrToKpis destroyed typed CAGR on every rebuild.)
 */
export function derivedPortfolioCagr(
  portfolio: PortfolioAsset[]
): number | null {
  return computeWeightedPortfolioCagr(portfolio);
}

/** @deprecated No-op — kept so call sites compile while they are unwound. */
export function applyPortfolioCagrToKpis(
  kpis: KPIValues,
  _portfolio: PortfolioAsset[]
): KPIValues {
  return kpis;
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
