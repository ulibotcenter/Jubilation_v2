import type { AssetClass, Currency } from "@/types";
import {
  expandMarketSearchQueries,
  formatExchangeLabel,
  normalizeB3Ticker,
} from "./b3";
import { getCached, setCache } from "./cache";
import type { MarketSearchResult, QuoteRequestItem, QuoteResult } from "./types";

const YAHOO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; JubilationV2/1.0; +https://jubilation.app)",
  Accept: "application/json",
};

const CRYPTO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  XRP: "ripple",
  DOGE: "dogecoin",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
};

function isCryptoAsset(assetClass: AssetClass, ticker: string): boolean {
  return assetClass === "crypto" || ticker in CRYPTO_IDS;
}

function mapYahooToAssetClass(
  quoteType: string | undefined,
  symbol: string
): AssetClass {
  const base = symbol.replace(/\.SA$/i, "");
  if (quoteType === "CRYPTOCURRENCY") return "crypto";
  if (quoteType === "ETF") return "etf";
  if (quoteType === "MUTUALFUND") return "funds";
  if (quoteType === "FUTURE" || quoteType === "COMMODITY") return "commodities";
  if (/\.SA$/i.test(symbol)) {
    if (/34$|35$/.test(base)) return "bdr";
    return "stocks";
  }
  if (/34$|35$/.test(base) && /\.SA$/i.test(symbol)) return "bdr";
  if (quoteType === "EQUITY" || quoteType === "STOCK") return "stocks";
  if (quoteType === "BOND") return "bonds";
  return "stocks";
}

function mapCurrency(code?: string): Currency {
  if (code === "BRL") return "BRL";
  if (code === "EUR") return "EUR";
  return "USD";
}

async function searchYahooFinanceOnce(
  query: string
): Promise<MarketSearchResult[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0&enableFuzzyQuery=true`;

  const res = await fetch(url, { headers: YAHOO_HEADERS, cache: "no-store" });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    quotes?: Array<{
      symbol?: string;
      shortname?: string;
      longname?: string;
      quoteType?: string;
      exchange?: string;
      regularMarketPrice?: number;
      currency?: string;
    }>;
  };

  return (data.quotes ?? [])
    .filter((item) => item.symbol && item.regularMarketPrice != null)
    .map((item) => {
      const symbol = item.symbol!;
      return {
        ticker: symbol,
        name: item.longname ?? item.shortname ?? symbol,
        assetClass: mapYahooToAssetClass(item.quoteType, symbol),
        exchange: formatExchangeLabel(item.exchange, symbol),
        currentPrice: item.regularMarketPrice!,
        currency: mapCurrency(item.currency),
        priceSource: "yahoo" as const,
      };
    });
}

export async function searchYahooFinance(
  query: string
): Promise<MarketSearchResult[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const cacheKey = `search:yahoo:${q.toLowerCase()}`;
  const cached = getCached<MarketSearchResult[]>(cacheKey);
  if (cached) return cached;

  const queries = expandMarketSearchQueries(q);
  const seen = new Set<string>();
  const merged: MarketSearchResult[] = [];

  for (const searchQ of queries) {
    const batch = await searchYahooFinanceOnce(searchQ);
    for (const item of batch) {
      const key = item.ticker.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }

  const results = merged.slice(0, 14);
  setCache(cacheKey, results);
  return results;
}

export async function searchCoinGecko(
  query: string
): Promise<MarketSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const cacheKey = `search:cg:${q}`;
  const cached = getCached<MarketSearchResult[]>(cacheKey);
  if (cached) return cached;

  const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    coins?: Array<{ id: string; symbol: string; name: string }>;
  };

  const top = (data.coins ?? []).slice(0, 6);
  if (top.length === 0) return [];

  const ids = top.map((c) => c.id).join(",");
  const priceRes = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { cache: "no-store" }
  );

  const prices = priceRes.ok
    ? ((await priceRes.json()) as Record<string, { usd?: number }>)
    : {};

  const results = top
    .filter((c) => prices[c.id]?.usd != null)
    .map((c) => ({
      ticker: c.symbol.toUpperCase(),
      name: c.name,
      assetClass: "crypto" as AssetClass,
      exchange: "Crypto",
      currentPrice: prices[c.id].usd!,
      currency: "USD" as Currency,
      priceSource: "coingecko" as const,
    }));

  setCache(cacheKey, results);
  return results;
}

export async function searchMarket(query: string): Promise<MarketSearchResult[]> {
  const cacheKey = `search:all:${query.trim().toLowerCase()}`;
  const cached = getCached<MarketSearchResult[]>(cacheKey);
  if (cached) return cached;

  const [yahoo, crypto] = await Promise.all([
    searchYahooFinance(query),
    searchCoinGecko(query),
  ]);

  const seen = new Set<string>();
  const merged: MarketSearchResult[] = [];

  for (const item of [...yahoo, ...crypto]) {
    const key = item.ticker.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  const results = merged.slice(0, 14);
  setCache(cacheKey, results);
  return results;
}

async function fetchYahooQuotes(
  items: QuoteRequestItem[]
): Promise<QuoteResult[]> {
  if (items.length === 0) return [];

  const normalized = items.map((i) => ({
    ...i,
    ticker: /\.SA$/i.test(i.ticker) ? i.ticker : normalizeB3Ticker(i.ticker),
  }));

  const symbols = [...new Set(normalized.map((i) => i.ticker))].join(",");
  const cacheKey = `quotes:yahoo:${symbols}`;
  const cached = getCached<QuoteResult[]>(cacheKey);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

  const res = await fetch(url, { headers: YAHOO_HEADERS, cache: "no-store" });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    quoteResponse?: {
      result?: Array<{
        symbol?: string;
        regularMarketPrice?: number;
        regularMarketPreviousClose?: number;
        currency?: string;
      }>;
    };
  };

  const results = (data.quoteResponse?.result ?? [])
    .filter((r) => r.symbol && r.regularMarketPrice != null)
    .map((r) => ({
      ticker: r.symbol!,
      price: r.regularMarketPrice!,
      currency: mapCurrency(r.currency),
      priceSource: "yahoo" as const,
      previousClose: r.regularMarketPreviousClose,
    }));

  setCache(cacheKey, results);
  return results;
}

async function fetchCoinGeckoQuotes(
  items: QuoteRequestItem[]
): Promise<QuoteResult[]> {
  const ids = [
    ...new Set(
      items.map(
        (i) => CRYPTO_IDS[i.ticker.toUpperCase()] ?? i.ticker.toLowerCase()
      )
    ),
  ].filter(Boolean);

  if (ids.length === 0) return [];

  const cacheKey = `quotes:cg:${ids.join(",")}`;
  const cached = getCached<QuoteResult[]>(cacheKey);
  if (cached) return cached;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const data = (await res.json()) as Record<string, { usd?: number }>;
  const results: QuoteResult[] = [];

  for (const item of items) {
    const id =
      CRYPTO_IDS[item.ticker.toUpperCase()] ?? item.ticker.toLowerCase();
    const price = data[id]?.usd;
    if (price == null) continue;
    results.push({
      ticker: item.ticker,
      price,
      currency: "USD",
      priceSource: "coingecko",
    });
  }

  setCache(cacheKey, results);
  return results;
}

export async function fetchMarketQuotes(
  items: QuoteRequestItem[]
): Promise<QuoteResult[]> {
  const refreshable = items.filter(
    (i) => i.assetClass !== "cash" && i.ticker !== "CASH"
  );

  const cryptoItems = refreshable.filter((i) =>
    isCryptoAsset(i.assetClass, i.ticker)
  );
  const yahooItems = refreshable.filter(
    (i) => !isCryptoAsset(i.assetClass, i.ticker)
  );

  const [yahooQuotes, cryptoQuotes] = await Promise.all([
    fetchYahooQuotes(yahooItems),
    fetchCoinGeckoQuotes(cryptoItems),
  ]);

  return [...yahooQuotes, ...cryptoQuotes];
}