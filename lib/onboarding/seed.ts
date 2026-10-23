import { normalizePortfolioAssets } from "@/lib/engine/liquidity";
import {
  hasUserHoldings,
  isExampleHoldingId,
  isLeftoverDemoHoldingId,
} from "@/lib/holdings/origin";
import type { PortfolioAsset } from "@/types";

/**
 * Labeled first-visit example (modelo). Not advice — CVM 19.
 * Mixed native currencies on purpose so FX is exercised on day one.
 * SpaceX is a listed US stock (Nasdaq SPCX, IPO June 2026).
 * Seed price: last regular close 2026-09-18, $152.71. Cost = IPO $135.
 */
export const MODEL_SEED_IDS = [
  "seed-btc",
  "seed-home",
  "seed-aapl",
  "seed-spacex",
  "seed-ust",
  "seed-petr",
  "seed-gld",
] as const;

const RAW_MODEL_SEED: PortfolioAsset[] = [
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
    id: "seed-home",
    ticker: "CASA",
    name: "Casa / Residência",
    assetClass: "real_estate",
    quantity: 1,
    currentPrice: 850_000,
    costBasis: 620_000,
    currency: "BRL",
    nativeCurrency: "BRL",
    allocation: 0,
    priceSource: "manual",
    listing: "unlisted",
    source: "ESTIMATED",
    liquidity: "illiquid",
    allowSale: false,
    manualKind: "home",
    expectedCAGR: 4.5,
    realReturn: 1.5,
  },
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
    id: "seed-ust",
    ticker: "GOVT",
    name: "US Treasury",
    assetClass: "bonds",
    quantity: 730,
    currentPrice: 23.12,
    costBasis: 22.4,
    currency: "USD",
    nativeCurrency: "USD",
    allocation: 0,
    priceSource: "yahoo",
    listing: "listed",
    source: "YAHOO",
    expectedCAGR: 4.2,
    realReturn: 1.8,
  },
  {
    id: "seed-petr",
    ticker: "PETR4",
    name: "Petrobras",
    assetClass: "stocks",
    quantity: 1_200,
    currentPrice: 36.8,
    costBasis: 28.4,
    currency: "BRL",
    nativeCurrency: "BRL",
    allocation: 0,
    priceSource: "yahoo",
    listing: "listed",
    source: "YAHOO",
    expectedCAGR: 8,
  },
  {
    id: "seed-gld",
    ticker: "GLD",
    name: "Gold",
    assetClass: "etf",
    quantity: 40,
    currentPrice: 243.5,
    costBasis: 198.2,
    currency: "USD",
    nativeCurrency: "USD",
    allocation: 0,
    priceSource: "yahoo",
    listing: "listed",
    source: "YAHOO",
    expectedCAGR: 4,
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

/**
 * Seed stays on first visit. The first real holding (manual | b3 | irpf)
 * removes every seed row. An explicitly empty book stays empty.
 */
export function dropSeedIfUserHoldings(
  portfolio: PortfolioAsset[]
): PortfolioAsset[] {
  if (!hasUserHoldings(portfolio)) return portfolio;
  return portfolio.filter((asset) => !isExampleHoldingId(asset.id));
}

/**
 * Leftover MOCK / lifestyle demo is not a user book. Replace it with the
 * labeled 7-item example so Zerar stays on the banner. Real holdings win.
 * Older 6-item example books (Tesouro / SPY) also canonicalize here.
 */
export function canonicalizeExamplePortfolio(
  portfolio: PortfolioAsset[]
): PortfolioAsset[] {
  if (!Array.isArray(portfolio) || portfolio.length === 0) return [];
  if (hasUserHoldings(portfolio)) {
    return dropSeedIfUserHoldings(portfolio);
  }
  const onlyExample = portfolio.every((asset) => isExampleHoldingId(asset.id));
  if (!onlyExample) return portfolio;
  const leftover = portfolio.some((asset) => isLeftoverDemoHoldingId(asset.id));
  const current = createModelSeed();
  if (
    leftover ||
    portfolio.length > 8 ||
    portfolio.length !== current.length ||
    !isModelSeedPortfolio(portfolio)
  ) {
    return current;
  }
  return portfolio;
}
