import type { IrpfAllowlisted, IrpfAsset } from "@/lib/connectors/irpf/allowlist";
import { persistIrpf } from "@/lib/connectors/irpf/allowlist";
import { applyIrpfHoldings, irpfAsOf, suggestIrpfHoldings } from "@/lib/connectors/irpf/map";
import { originOf, stampOrigin } from "@/lib/holdings/origin";
import type { PortfolioAsset } from "@/types";

/** Bens codes that are listed / Tesouro / RF — B3's job, not IRPF import. */
export const IRPF_B3_CODES = new Set(["31", "32", "39", "45", "46", "47", "49"]);

const TICKER_RE = /\b([A-Z]{4}\d{1,2})\b/;

export function extractTickerFromIrpfDescription(description: string): string | null {
  const hit = TICKER_RE.exec(description.toUpperCase());
  return hit?.[1] ?? null;
}

export interface IrpfCoveredNotice {
  ticker: string;
  description: string;
  reason: "already_on_b3";
}

export interface IrpfBatchRow {
  id: string;
  name: string;
  ticker: string;
  code: string | null;
  costAsOf: string;
  costYear: string;
  /** Prefills with 31/12; the user edits today's figure. */
  todayValue: number;
  selected: boolean;
  holding: PortfolioAsset;
}

export interface IrpfBatchPreview {
  anoBase: string | null;
  costAsOf: string;
  today: string;
  rows: IrpfBatchRow[];
  covered: IrpfCoveredNotice[];
  extract: Record<string, unknown>;
}

export function b3TickersOf(portfolio: PortfolioAsset[]): Set<string> {
  const out = new Set<string>();
  for (const asset of portfolio) {
    if (originOf(asset) !== "b3" && asset.source !== "B3_API") continue;
    const ticker = asset.ticker?.trim().toUpperCase();
    if (ticker) out.add(ticker);
  }
  return out;
}

export function irpfCoveredByB3(
  assets: IrpfAsset[],
  portfolio: PortfolioAsset[]
): IrpfCoveredNotice[] {
  const b3 = b3TickersOf(portfolio);
  const notices: IrpfCoveredNotice[] = [];
  const seen = new Set<string>();
  for (const asset of assets) {
    const ticker = extractTickerFromIrpfDescription(asset.description);
    if (!ticker) continue;
    if (!b3.has(ticker) && !IRPF_B3_CODES.has(asset.code)) continue;
    if (!b3.has(ticker)) continue;
    if (seen.has(ticker)) continue;
    seen.add(ticker);
    notices.push({
      ticker,
      description: asset.description.slice(0, 80),
      reason: "already_on_b3",
    });
  }
  return notices;
}

export function buildIrpfBatchPreview(input: {
  allowlisted: IrpfAllowlisted;
  existing: PortfolioAsset[];
  today: string;
}): IrpfBatchPreview {
  const costAsOf = irpfAsOf(input.allowlisted, input.today);
  const year = input.allowlisted.anoBase ?? costAsOf.slice(0, 4);
  const incoming = suggestIrpfHoldings(
    input.allowlisted,
    input.existing,
    costAsOf
  );
  const rows: IrpfBatchRow[] = incoming.map((holding) => ({
    id: holding.id,
    name: holding.name,
    ticker: holding.ticker,
    code: holding.code ?? null,
    costAsOf,
    costYear: year,
    todayValue: holding.quantity * holding.currentPrice,
    selected: true,
    holding,
  }));
  return {
    anoBase: input.allowlisted.anoBase,
    costAsOf,
    today: input.today,
    rows,
    covered: irpfCoveredByB3(input.allowlisted.assets, input.existing),
    extract: persistIrpf(input.allowlisted),
  };
}

export function largestIrpfRowId(rows: IrpfBatchRow[]): string | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => b.todayValue - a.todayValue)[0]?.id ?? null;
}

/**
 * Confirmed rows become today's user_estimate (engine-eligible).
 * Unchecked rows are skipped. B3-covered tickers never enter.
 */
export function applyIrpfBatchConfirm(input: {
  existing: PortfolioAsset[];
  preview: IrpfBatchPreview;
  rows: IrpfBatchRow[];
}): PortfolioAsset[] {
  const b3 = b3TickersOf(input.existing);
  const incoming: PortfolioAsset[] = [];
  for (const row of input.rows) {
    if (!row.selected) continue;
    const ticker = row.ticker.trim().toUpperCase();
    if (ticker && b3.has(ticker)) continue;
    const qty = row.holding.quantity || 1;
    const todayPrice = row.todayValue / qty;
    incoming.push(
      stampOrigin(
        {
          ...row.holding,
          currentPrice: todayPrice,
          costBasis: row.holding.costBasis > 0 ? row.holding.costBasis : todayPrice,
          costBasisKnown: true,
          asOf: input.preview.today,
          lastPriceAt: input.preview.today,
          valueType: "user_estimate",
          valueHistory: [
            {
              asOf: input.preview.today,
              value: row.todayValue,
              source: "FILE_IRPF",
            },
          ],
        },
        "irpf",
        "user_estimate"
      )
    );
  }
  return applyIrpfHoldings({ existing: input.existing, incoming });
}

/** Structured extract only. Raw .DEC/.DBK bytes must already have been dropped. */
export function retainIrpfExtract(
  extract: Record<string, unknown>,
  options: { vaultExists?: boolean } = {}
): { extract: Record<string, unknown>; encryptedAtRest: boolean } {
  return {
    extract,
    encryptedAtRest: Boolean(options.vaultExists),
  };
}
