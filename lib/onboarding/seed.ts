import { normalizePortfolioAssets } from "@/lib/engine/liquidity";
import type { PortfolioAsset } from "@/types";

/**
 * Labeled first-visit example (modelo). Not advice — CVM 19.
 * Mixed native currencies on purpose so FX is exercised on day one.
 * SpaceX is a listed US stock (Nasdaq SPCX, IPO June 2026).
 * Seed price: last regular close 2026-09-18, $152.71. Cost = IPO $135.
 */
export const MODEL_SEED_IDS = [
  "seed-aapl",
  "seed-btc",
  "seed-tesouro",
  "seed-spy",
  "seed-spacex",
  "seed-home",
] as const;

const RAW_MODEL_SEED: PortfolioAsset[] = [
  {
    id: "seed-aapl",
    ticker: "AAPL",
    name: "Apple Inc.",
    assetClass: "stocks",
    quantity: 40,
    currentPrice: 198.75,
    costBasis: 145.2,
    currency: "USD",
    nativeCurrency: "USD",
    allocation: 0,
    priceSource: "yahoo",
    listing: "listed",
    source: "YAHOO",
    expectedCAGR: 8,
  },
  {
    id: "seed-btc",
    ticker: "BTC",
    name: "Bitcoin",
    assetClass: "crypto",
    quantity: 0.75,
    currentPrice: 67_500,
    costBasis: 41_200,
    currency: "USD",
    nativeCurrency: "USD",
    allocation: 0,
    priceSource: "coingecko",
    listing: "listed",
    source: "COINGECKO",
    expectedCAGR: 6,
  },
  {
    id: "seed-tesouro",
    ticker: "TESOURO",
    name: "Tesouro IPCA+",
    assetClass: "bonds",
    quantity: 80,
    currentPrice: 1_150,
    costBasis: 980,
    currency: "BRL",
    nativeCurrency: "BRL",
    allocation: 0,
    priceSource: "manual",
    listing: "listed",
    source: "MANUAL",
    liquidity: "liquid",
    expectedCAGR: 6.5,
    realReturn: 3.5,
  },
  {
    id: "seed-spy",
    ticker: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    assetClass: "etf",
    quantity: 18,
    currentPrice: 542.18,
    costBasis: 412.5,
    currency: "USD",
    nativeCurrency: "USD",
    allocation: 0,
    priceSource: "yahoo",
    listing: "listed",
    source: "YAHOO",
    expectedCAGR: 7.5,
  },
  {
    id: "seed-spacex",
    ticker: "SPCX",
    name: "SpaceX",
    assetClass: "stocks",
    quantity: 315,
    currentPrice: 152.71,
    costBasis: 135,
    currency: "USD",
    nativeCurrency: "USD",
    allocation: 0,
    priceSource: "yahoo",
    listing: "listed",
    source: "YAHOO",
    liquidity: "liquid",
    expectedCAGR: 8,
  },
  {
    id: "seed-home",
    ticker: "CASA",
    name: "Apartamento — São Paulo",
    assetClass: "real_estate",
    quantity: 1,
    currentPrice: 850_000,
    costBasis: 620_000,
    currency: "BRL",
    nativeCurrency: "BRL",
    allocation: 0,
    priceSource: "manual",
    listing: "unlisted",
    source: "MANUAL",
    liquidity: "illiquid",
    allowSale: false,
    manualKind: "home",
    expectedCAGR: 4.5,
    realReturn: 1.5,
  },
];

export function createModelSeed(): PortfolioAsset[] {
  return normalizePortfolioAssets(RAW_MODEL_SEED.map((a) => ({ ...a })));
}

export function isModelSeedId(id: string): boolean {
  return (MODEL_SEED_IDS as readonly string[]).includes(id);
}

export function isModelSeedPortfolio(portfolio: PortfolioAsset[]): boolean {
  if (portfolio.length === 0) return false;
  return portfolio.every((a) => isModelSeedId(a.id));
}

export function emptyHoldings(): PortfolioAsset[] {
  return [];
}
