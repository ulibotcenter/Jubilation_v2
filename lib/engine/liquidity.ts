import type { AssetClass, PortfolioAsset } from "@/types";
import type { Liquidity, TaxRegime } from "@/lib/engine/plan";

const ILLIQUID_CLASSES: ReadonlySet<AssetClass> = new Set([
  "real_estate",
  "personal",
]);

export function defaultLiquidity(assetClass: AssetClass): Liquidity {
  return ILLIQUID_CLASSES.has(assetClass) ? "illiquid" : "liquid";
}

export function resolveLiquidity(asset: PortfolioAsset): Liquidity {
  return asset.liquidity ?? defaultLiquidity(asset.assetClass);
}

export function defaultTransactionCostRate(assetClass: AssetClass): number {
  if (assetClass === "real_estate") return 0.06;
  if (assetClass === "personal") return 0.08;
  return 0.005;
}

export function defaultTaxRegime(assetClass: AssetClass): TaxRegime {
  if (assetClass === "funds") return "come_cotas";
  if (assetClass === "reit") return "exempt";
  return "taxable";
}

export function normalizePortfolioAsset(asset: PortfolioAsset): PortfolioAsset {
  const asOf = asset.asOf ?? asset.lastPriceAt ?? new Date().toISOString().slice(0, 10);
  return {
    ...asset,
    nativeCurrency: asset.nativeCurrency ?? asset.currency,
    liquidity: resolveLiquidity(asset),
    transactionCostRate:
      asset.transactionCostRate ?? defaultTransactionCostRate(asset.assetClass),
    allowSale: asset.allowSale ?? false,
    scheduledSaleOn: asset.scheduledSaleOn ?? null,
    source: asset.source ?? (asset.priceSource === "manual" ? "MANUAL" : "ESTIMATED"),
    asOf,
    confidence: asset.confidence ?? "medium",
    externalRef: asset.externalRef ?? null,
    institutionId: asset.institutionId ?? null,
    accountId: asset.accountId ?? null,
  };
}

export function normalizePortfolioAssets(
  portfolio: PortfolioAsset[]
): PortfolioAsset[] {
  return portfolio.map(normalizePortfolioAsset);
}
