import { calculatePortfolioValue, type PortfolioAsset, type PortfolioValueQuote } from "@/types";
import type { HoldingOrigin, ValueType } from "@/types";

export type { HoldingOrigin, ValueType };

/** b3 wins listed / Tesouro / RF; IRPF fills what B3 did not bring. */
export const ORIGIN_PRECEDENCE: Record<HoldingOrigin, number> = {
  b3: 3,
  irpf: 2,
  manual: 1,
};

const ORIGIN_ALIASES: Record<string, HoldingOrigin> = {
  manual: "manual",
  MANUAL: "manual",
  b3: "b3",
  B3_API: "b3",
  irpf: "irpf",
  FILE_IRPF: "irpf",
  imported_file: "irpf",
};

export function canonicalOrigin(value: unknown): HoldingOrigin | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return ORIGIN_ALIASES[value] ?? ORIGIN_ALIASES[value.trim()] ?? null;
}

export function originOf(asset: Pick<PortfolioAsset, "origin" | "source">): HoldingOrigin | null {
  return canonicalOrigin(asset.origin) ?? canonicalOrigin(asset.source);
}

export function isUserOrigin(
  origin: HoldingOrigin | null | undefined
): origin is HoldingOrigin {
  return origin === "manual" || origin === "b3" || origin === "irpf";
}

export function isUserHolding(asset: PortfolioAsset): boolean {
  return isUserOrigin(originOf(asset));
}

export function hasUserHoldings(portfolio: PortfolioAsset[]): boolean {
  return portfolio.some(isUserHolding);
}

export function defaultValueType(origin: HoldingOrigin | null): ValueType {
  if (origin === "b3") return "market";
  if (origin === "irpf") return "cost";
  if (origin === "manual") return "user_estimate";
  return "market";
}

export function valueTypeOf(asset: PortfolioAsset): ValueType {
  return asset.valueType ?? defaultValueType(originOf(asset));
}

/** IRPF 31/12 cost is never “what I have today” until the user confirms. */
export function isConfirmedForEngine(asset: PortfolioAsset): boolean {
  const origin = originOf(asset);
  const valueType = valueTypeOf(asset);
  if (origin === "irpf" && valueType === "cost") return false;
  return valueType === "market" || valueType === "user_estimate";
}

export function isDerivative(asset: Pick<PortfolioAsset, "assetClass">): boolean {
  return asset.assetClass === "derivatives";
}

/** Derivatives default OUT of the engine unless the user opts in. */
export function isEngineIncludedByDefault(asset: PortfolioAsset): boolean {
  if (isDerivative(asset) && asset.includeInEngine !== true) return false;
  return isConfirmedForEngine(asset);
}

export function isProjectable(asset: PortfolioAsset): boolean {
  return isEngineIncludedByDefault(asset);
}

export function holdingProjectableMajor(asset: PortfolioAsset): number {
  if (!isProjectable(asset)) return 0;
  const market = asset.quantity * asset.currentPrice;
  const pledged = Math.max(0, asset.gravameValue ?? 0);
  return Math.max(0, market - pledged);
}

export function withProjectableValue(asset: PortfolioAsset): PortfolioAsset | null {
  if (!isProjectable(asset)) return null;
  const net = holdingProjectableMajor(asset);
  if (asset.quantity === 0) return { ...asset, currentPrice: 0 };
  return { ...asset, currentPrice: net / asset.quantity };
}

export function projectablePortfolioValue(
  assets: PortfolioAsset[],
  quote?: PortfolioValueQuote
): number {
  const rows = assets
    .map(withProjectableValue)
    .filter((row): row is PortfolioAsset => row != null);
  if (rows.length === 0) return 0;
  return calculatePortfolioValue(rows, quote);
}

export function holdingIdentityKeys(asset: PortfolioAsset): string[] {
  const keys: string[] = [];
  const ticker = asset.ticker?.trim().toUpperCase();
  if (ticker) keys.push(`t:${ticker}`);
  const cnpj = (asset.cnpj ?? "").replace(/\D/g, "");
  if (cnpj.length >= 8) keys.push(`cnpj:${cnpj}`);
  const code = asset.code?.trim();
  if (code && ticker) keys.push(`code:${code}:${ticker}`);
  else if (code) keys.push(`code:${code}`);
  const ref = asset.externalRef?.trim().toUpperCase();
  if (ref) keys.push(`ref:${ref}`);
  return keys;
}

export function sameHoldingIdentity(a: PortfolioAsset, b: PortfolioAsset): boolean {
  const left = new Set(holdingIdentityKeys(a));
  if (left.size === 0) return false;
  return holdingIdentityKeys(b).some((key) => left.has(key));
}

export function originRank(origin: HoldingOrigin | null): number {
  if (!origin) return 0;
  return ORIGIN_PRECEDENCE[origin];
}

function looksLikeModelSeed(asset: PortfolioAsset): boolean {
  return typeof asset.id === "string" && asset.id.startsWith("seed-");
}

export function migrateHolding(asset: PortfolioAsset): PortfolioAsset {
  let origin = originOf(asset);
  if (!origin && !looksLikeModelSeed(asset)) {
    origin = "manual";
  }
  const asOf =
    asset.asOf ??
    asset.lastPriceAt ??
    new Date().toISOString().slice(0, 10);
  return {
    ...asset,
    origin: origin ?? undefined,
    valueType: asset.valueType ?? defaultValueType(origin),
    asOf,
    cnpj: asset.cnpj ?? null,
    code: asset.code ?? null,
    gravameValue: Math.max(0, asset.gravameValue ?? 0),
  };
}

export function provenanceForOrigin(
  origin: HoldingOrigin
): NonNullable<PortfolioAsset["source"]> {
  if (origin === "b3") return "B3_API";
  if (origin === "irpf") return "FILE_IRPF";
  return "MANUAL";
}

export function stampOrigin(
  asset: PortfolioAsset,
  origin: HoldingOrigin,
  valueType?: ValueType
): PortfolioAsset {
  return {
    ...asset,
    origin,
    valueType: valueType ?? defaultValueType(origin),
    source: provenanceForOrigin(origin),
  };
}

export interface OriginTotal {
  origin: HoldingOrigin;
  value: number;
  asOf: string | null;
  count: number;
}

export function latestAsOf(assets: PortfolioAsset[]): string | null {
  let latest: string | null = null;
  for (const asset of assets) {
    if (!asset.asOf) continue;
    if (!latest || asset.asOf > latest) latest = asset.asOf;
  }
  return latest;
}

export function holdingsForOrigin(
  portfolio: PortfolioAsset[],
  origin: HoldingOrigin
): PortfolioAsset[] {
  return portfolio.filter((asset) => originOf(asset) === origin);
}

export function originDisplayValue(
  assets: PortfolioAsset[],
  quote?: PortfolioValueQuote
): number {
  if (assets.length === 0) return 0;
  return calculatePortfolioValue(assets, quote);
}

export function buildOriginTotals(
  portfolio: PortfolioAsset[],
  quote?: PortfolioValueQuote
): Record<HoldingOrigin, OriginTotal> {
  const origins: HoldingOrigin[] = ["b3", "irpf", "manual"];
  const out = {} as Record<HoldingOrigin, OriginTotal>;
  for (const origin of origins) {
    const rows = holdingsForOrigin(portfolio, origin);
    out[origin] = {
      origin,
      value: originDisplayValue(rows, quote),
      asOf: latestAsOf(rows),
      count: rows.length,
    };
  }
  return out;
}

export function defaultEngineIncludedIds(portfolio: PortfolioAsset[]): string[] {
  return portfolio.filter(isEngineIncludedByDefault).map((asset) => asset.id);
}

export function reconcileIncludedIds(
  portfolio: PortfolioAsset[],
  previous: string[]
): string[] {
  const prev = new Set(previous);
  const ids: string[] = [];
  for (const asset of portfolio) {
    if (!isProjectable(asset)) continue;
    if (prev.has(asset.id) || isEngineIncludedByDefault(asset)) {
      ids.push(asset.id);
    }
  }
  return ids;
}

export function mergeCashFlows<T extends { id: string; externalRef?: string }>(
  existing: T[],
  incoming: T[]
): T[] {
  const byId = new Map(existing.map((row) => [row.id, row]));
  const byRef = new Map(
    existing
      .filter((row) => row.externalRef)
      .map((row) => [row.externalRef as string, row])
  );
  for (const row of incoming) {
    const prior =
      byId.get(row.id) ?? (row.externalRef ? byRef.get(row.externalRef) : undefined);
    const next = prior ? { ...prior, ...row, id: prior.id } : row;
    byId.set(next.id, next);
    if (next.externalRef) byRef.set(next.externalRef, next);
  }
  return [...byId.values()];
}
