import { appendDatedValue } from "@/lib/datedValue";
import { isOutsideB3Coverage } from "@/lib/connectors/coverage";
import type { FinancialAccount, Institution } from "@/lib/engine/canonical";
import { resolveB3CostBasis } from "@/lib/holdings/costBasis";
import {
  originOf,
  originRank,
  sameHoldingIdentity,
  stampOrigin,
} from "@/lib/holdings/origin";
import type { HoldingOrigin, PortfolioAsset } from "@/types";

export interface MergeRecord {
  existingId: string;
  incomingId: string;
  ticker: string;
  policy: "imported-market-value" | "origin-precedence";
  kept: ("expectedCAGR" | "realReturn" | "ownership" | "allowSale" | "liquidity" | "costBasis")[];
  winner: HoldingOrigin | null;
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

function skipB3Match(asset: PortfolioAsset, incoming: PortfolioAsset): boolean {
  return originOf(incoming) === "b3" && isOutsideB3Coverage(asset);
}

export function matchImported(
  existing: PortfolioAsset[],
  incoming: PortfolioAsset
): PortfolioAsset | undefined {
  const incomingRef = incoming.externalRef?.toUpperCase() ?? "";
  const incomingTicker = tickerKey(incoming);

  for (const asset of existing) {
    if (skipB3Match(asset, incoming)) continue;
    if (incomingRef && asset.externalRef?.toUpperCase() === incomingRef) {
      return asset;
    }
  }

  for (const asset of existing) {
    if (skipB3Match(asset, incoming)) continue;
    if (sameHoldingIdentity(asset, incoming)) return asset;
  }

  for (const asset of existing) {
    if (skipB3Match(asset, incoming)) continue;
    if (tickerKey(asset) !== incomingTicker) continue;
    if (
      asset.institutionId &&
      incoming.institutionId &&
      asset.institutionId === incoming.institutionId
    ) {
      return asset;
    }
    if (!asset.institutionId || originOf(asset) === "manual" || asset.source === "MANUAL") {
      return asset;
    }
  }
  return undefined;
}

function incomingWins(existing: PortfolioAsset, incoming: PortfolioAsset): boolean {
  return originRank(originOf(incoming)) >= originRank(originOf(existing));
}

function mergeHolding(existing: PortfolioAsset, incoming: PortfolioAsset): PortfolioAsset {
  const winnerOrigin = originOf(incoming) ?? "b3";
  const marketValue = incoming.quantity * incoming.currentPrice;
  const dated = appendDatedValue(
    {
      ...existing,
      quantity: incoming.quantity,
    },
    marketValue,
    incoming.asOf ?? existing.asOf ?? "",
    incoming.source ?? existing.source ?? "B3_API"
  );
  const merged: PortfolioAsset = {
    ...dated,
    id: existing.id,
    ticker: incoming.ticker,
    name:
      originOf(existing) === "manual" || existing.source === "MANUAL"
        ? existing.name
        : incoming.name,
    assetClass: incoming.assetClass,
    quantity: incoming.quantity,
    currentPrice: incoming.currentPrice,
    previousPrice: existing.currentPrice,
    ...resolveB3CostBasis(incoming, existing),
    asOf: incoming.asOf,
    lastPriceAt: incoming.lastPriceAt,
    source: incoming.source ?? existing.source,
    confidence: incoming.confidence ?? existing.confidence ?? "high",
    externalRef: incoming.externalRef ?? existing.externalRef,
    institutionId: incoming.institutionId ?? existing.institutionId,
    accountId: incoming.accountId ?? existing.accountId,
    expectedCAGR: existing.expectedCAGR,
    realReturn: existing.realReturn,
    ownership: existing.ownership,
    allowSale: existing.allowSale,
    liquidity: existing.liquidity,
    priceSource: incoming.priceSource ?? existing.priceSource ?? "manual",
    cnpj: incoming.cnpj ?? existing.cnpj,
    code: incoming.code ?? existing.code,
    institutionName: incoming.institutionName ?? existing.institutionName,
    productClass: incoming.productClass ?? existing.productClass,
    gravameValue: incoming.gravameValue ?? existing.gravameValue,
    includeInEngine: existing.includeInEngine ?? incoming.includeInEngine,
    valueType: incoming.valueType ?? existing.valueType,
  };
  return stampOrigin(merged, winnerOrigin, incoming.valueType ?? merged.valueType);
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const map = new Map(current.map((row) => [row.id, row]));
  for (const row of incoming) {
    map.set(row.id, { ...(map.get(row.id) ?? row), ...row });
  }
  return [...map.values()];
}

/**
 * Same asset (ticker / CNPJ / code): b3 > irpf > manual.
 * B3 never overwrites PGBL / FGTS / imóvel. Reimport is idempotent.
 */
export function reconcileHoldings(input: ReconcileInput): ReconcileResult {
  const used = new Set<string>();
  const merges: MergeRecord[] = [];
  const next: PortfolioAsset[] = [];

  for (const incoming of input.incoming) {
    const existing = matchImported(input.existing, incoming);
    if (existing) {
      used.add(existing.id);
      if (!incomingWins(existing, incoming)) {
        next.push(existing);
        merges.push({
          existingId: existing.id,
          incomingId: incoming.id,
          ticker: incoming.ticker,
          policy: "origin-precedence",
          kept: [
            "expectedCAGR",
            "realReturn",
            "ownership",
            "allowSale",
            "liquidity",
            "costBasis",
          ],
          winner: originOf(existing),
        });
        continue;
      }
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
        winner: originOf(incoming),
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

/** IRPF fills what B3 did not bring. Same identity: b3 > irpf > manual. */
export function applyOriginIncoming(input: {
  existing: PortfolioAsset[];
  incoming: PortfolioAsset[];
}): PortfolioAsset[] {
  return reconcileHoldings({
    existing: input.existing,
    incoming: input.incoming,
    institutions: [],
    accounts: [],
  }).portfolio;
}
