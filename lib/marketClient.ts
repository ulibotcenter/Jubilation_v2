import type { AssetClass, PortfolioAsset } from "@/types";
import type { MarketSearchResult, QuoteResult } from "@/lib/market/types";

export async function searchMarketTickers(
  query: string
): Promise<MarketSearchResult[]> {
  const res = await fetch(
    `/api/market/search?q=${encodeURIComponent(query)}`
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: MarketSearchResult[] };
  return data.results ?? [];
}

export async function fetchPortfolioQuotes(
  assets: Pick<PortfolioAsset, "ticker" | "assetClass">[]
): Promise<{ quotes: QuoteResult[]; fetchedAt: string }> {
  const res = await fetch("/api/market/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assets: assets.map((a) => ({
        ticker: a.ticker,
        assetClass: a.assetClass,
      })),
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch quotes");
  }

  return res.json() as Promise<{ quotes: QuoteResult[]; fetchedAt: string }>;
}

export const ASSET_CLASS_OPTIONS: {
  value: AssetClass;
  label: string;
  description: string;
}[] = [
  { value: "stocks", label: "Stocks", description: "Equities & ADRs" },
  { value: "etf", label: "ETF", description: "Exchange-traded funds" },
  { value: "bdr", label: "BDR", description: "Brazilian depositary receipts" },
  { value: "bonds", label: "Bonds", description: "Fixed income" },
  { value: "funds", label: "Funds", description: "Mutual & index funds" },
  { value: "commodities", label: "Commodities", description: "Gold, oil, agri" },
  { value: "reit", label: "REITs", description: "Listed real estate funds" },
  { value: "real_estate", label: "Real Estate", description: "Homes, land & rentals" },
  { value: "personal", label: "Personal Property", description: "Vehicles & collectibles" },
  { value: "crypto", label: "Crypto", description: "Digital assets" },
  { value: "cash", label: "Cash", description: "Savings & liquidity" },
  { value: "other", label: "Other", description: "Custom holdings" },
];