import type { AssetClass, PortfolioAsset } from "@/types";
import type { Liquidity, TaxRegime } from "@/lib/engine/plan";
import { migrateHolding } from "@/lib/holdings/origin";

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
  const migrated = migrateHolding({ ...asset, asOf });
  return {
    ...migrated,
    nativeCurrency: migrated.nativeCurrency ?? migrated.currency,
    liquidity: resolveLiquidity(migrated),
    transactionCostRate:
      migrated.transactionCostRate ?? defaultTransactionCostRate(migrated.assetClass),
    allowSale: migrated.allowSale ?? false,
    scheduledSaleOn: migrated.scheduledSaleOn ?? null,
    source:
      migrated.source ??
      (migrated.priceSource === "manual" ? "MANUAL" : "ESTIMATED"),
    asOf,
    confidence: migrated.confidence ?? "medium",
    externalRef: migrated.externalRef ?? null,
    institutionId: migrated.institutionId ?? null,
    accountId: migrated.accountId ?? null,
    ownership: migrated.ownership ?? "holder",
    valueHistory:
      migrated.valueHistory && migrated.valueHistory.length > 0
        ? migrated.valueHistory
        : [
            {
              asOf,
              value: migrated.quantity * migrated.currentPrice,
              source:
                migrated.source ??
                (migrated.priceSource === "manual" ? "MANUAL" : "ESTIMATED"),
            },
          ],
  };
}

export function normalizePortfolioAssets(
  portfolio: PortfolioAsset[]
): PortfolioAsset[] {
  return portfolio.map(normalizePortfolioAsset);
}
