import { convertHoldingMajor } from "@/lib/fx/convert";
import type { FxRates } from "@/lib/fx/types";
import type { Currency, PortfolioAsset } from "@/types";

export interface HoldingQuote {
  currency: Currency;
  rates: FxRates;
}

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
  totalPortfolioValue: number,
  quote: HoldingQuote
): HoldingMetrics {
  const native = asset.nativeCurrency ?? asset.currency;
  const marketValue = convertHoldingMajor(
    asset.quantity * asset.currentPrice,
    native,
    quote
  );
  const costValue = convertHoldingMajor(
    asset.quantity * asset.costBasis,
    native,
    quote
  );
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