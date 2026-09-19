import { appendDatedValue } from "@/lib/datedValue";
import { isOutsideB3Coverage } from "@/lib/connectors/coverage";
import type { FinancialAccount, Institution } from "@/lib/engine/canonical";
import type { PortfolioAsset } from "@/types";

export interface MergeRecord {
  existingId: string;
  incomingId: string;
  ticker: string;
  policy: "imported-market-value";
  kept: ("expectedCAGR" | "realReturn" | "ownership" | "allowSale" | "liquidity" | "costBasis")[];
}

export interface ReconcileInput {
  existing: PortfolioAsset[];
  incoming: PortfolioAsset[];
  institutions: Institution[];
  accounts: FinancialAccount[];
  existingInstitutions?: Institution[];
  existingAccounts?: FinancialAccount[];
}

export interface ReconcileResult {
  portfolio: PortfolioAsset[];
  institutions: Institution[];
  accounts: FinancialAccount[];
  merges: MergeRecord[];
}

function tickerKey(asset: PortfolioAsset): string {
  return asset.ticker.trim().toUpperCase();
}

export function matchImported(
  existing: PortfolioAsset[],
  incoming: PortfolioAsset
): PortfolioAsset | undefined {
  const incomingRef = incoming.externalRef?.toUpperCase() ?? "";
  const incomingTicker = tickerKey(incoming);

  for (const asset of existing) {
    if (isOutsideB3Coverage(asset)) continue;
    if (incomingRef && asset.externalRef?.toUpperCase() === incomingRef) {
      return asset;
    }
  }

  for (const asset of existing) {
    if (isOutsideB3Coverage(asset)) continue;
    if (tickerKey(asset) !== incomingTicker) continue;
    if (
      asset.institutionId &&
      incoming.institutionId &&
      asset.institutionId === incoming.institutionId
    ) {
      return asset;
    }
    if (!asset.institutionId || asset.source === "MANUAL") {
      return asset;
    }
  }
  return undefined;
}

function mergeHolding(existing: PortfolioAsset, incoming: PortfolioAsset): PortfolioAsset {
  const marketValue = incoming.quantity * incoming.currentPrice;
  const dated = appendDatedValue(
    {
      ...existing,
      quantity: incoming.quantity,
    },
    marketValue,
    incoming.asOf ?? existing.asOf ?? "",
    "B3_API"
  );
  return {
    ...dated,
    id: existing.id,
    ticker: incoming.ticker,
    name: existing.source === "MANUAL" ? existing.name : incoming.name,
    assetClass: incoming.assetClass,
    quantity: incoming.quantity,
    currentPrice: incoming.currentPrice,
    previousPrice: existing.currentPrice,
    costBasis: existing.costBasis > 0 ? existing.costBasis : incoming.costBasis,
    asOf: incoming.asOf,
    lastPriceAt: incoming.lastPriceAt,
    source: "B3_API",
    confidence: "high",
    externalRef: incoming.externalRef,
    institutionId: incoming.institutionId,
    accountId: incoming.accountId,
    expectedCAGR: existing.expectedCAGR,
    realReturn: existing.realReturn,
    ownership: existing.ownership,
    allowSale: existing.allowSale,
    liquidity: existing.liquidity,
    priceSource: "manual",
  };
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const map = new Map(current.map((row) => [row.id, row]));
  for (const row of incoming) {
    map.set(row.id, { ...(map.get(row.id) ?? row), ...row });
  }
  return [...map.values()];
}

/**
 * Imported B3 market value wins. Manual PGBL/FGTS/imóvel stay.
 * Reimporting the same line is idempotent (stable externalRef).
 */
export function reconcileHoldings(input: ReconcileInput): ReconcileResult {
  const used = new Set<string>();
  const merges: MergeRecord[] = [];
  const next: PortfolioAsset[] = [];

  for (const incoming of input.incoming) {
    const existing = matchImported(input.existing, incoming);
    if (existing) {
      used.add(existing.id);
      next.push(mergeHolding(existing, incoming));
      merges.push({
        existingId: existing.id,
        incomingId: incoming.id,
        ticker: incoming.ticker,
        policy: "imported-market-value",
        kept: [
          "expectedCAGR",
          "realReturn",
          "ownership",
          "allowSale",
          "liquidity",
          "costBasis",
        ],
      });
    } else {
      used.add(incoming.id);
      next.push(incoming);
    }
  }

  for (const asset of input.existing) {
    if (used.has(asset.id)) continue;
    next.push(asset);
  }

  return {
    portfolio: next,
    institutions: mergeById(
      input.existingInstitutions ?? [],
      input.institutions
    ),
    accounts: mergeById(input.existingAccounts ?? [], input.accounts),
    merges,
  };
}
