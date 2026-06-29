/** Brazilian B3 ticker helpers — international app, B3 as one market among many */

const B3_TICKER = /^[A-Za-z]{4}\d{1,2}$/;

/** PETR4 → PETR4.SA for Yahoo Finance */
export function normalizeB3Ticker(ticker: string): string {
  const t = ticker.trim().toUpperCase();
  if (t.endsWith(".SA")) return t;
  if (B3_TICKER.test(t)) return `${t}.SA`;
  return t;
}

/** Expand search queries for B3 symbols without .SA suffix */
export function expandMarketSearchQueries(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const queries = new Set<string>([trimmed]);

  if (B3_TICKER.test(trimmed)) {
    queries.add(normalizeB3Ticker(trimmed));
  }

  if (trimmed.toUpperCase().endsWith(".SA")) {
    queries.add(trimmed.toUpperCase().replace(/\.SA$/, ""));
  }

  return [...queries];
}

export function isB3Symbol(symbol: string): boolean {
  return /\.SA$/i.test(symbol) || B3_TICKER.test(symbol.trim());
}

export function formatExchangeLabel(exchange?: string, symbol?: string): string {
  if (exchange === "SAO" || (symbol && /\.SA$/i.test(symbol))) {
    return "B3";
  }
  return exchange ?? "—";
}