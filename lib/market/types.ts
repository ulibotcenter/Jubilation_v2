import type { AssetClass, Currency } from "@/types";

export interface MarketSearchResult {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  exchange: string;
  currentPrice: number;
  currency: Currency;
  priceSource: "yahoo" | "coingecko";
}

export interface QuoteRequestItem {
  ticker: string;
  assetClass: AssetClass;
}

export interface QuoteResult {
  ticker: string;
  price: number;
  currency: Currency;
  priceSource: "yahoo" | "coingecko" | "manual";
  previousClose?: number;
}