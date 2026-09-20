import { originOf } from "@/lib/holdings/origin";
import type { PortfolioAsset } from "@/types";

export function hasKnownCostBasis(asset: Pick<PortfolioAsset, "costBasisKnown" | "costBasis" | "origin" | "source">): boolean {
  if (asset.costBasisKnown === true) return true;
  if (asset.costBasisKnown === false) return false;
  const origin = originOf(asset);
  if (origin === "manual" || origin === "irpf") {
    return Number.isFinite(asset.costBasis) && asset.costBasis > 0;
  }
  return Number.isFinite(asset.costBasis) && asset.costBasis > 0;
}

export function shouldHideRowPnl(asset: PortfolioAsset): boolean {
  return !hasKnownCostBasis(asset);
}

export function averagePriceFromApi(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(",", "."));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/**
 * B3 averagePrice if the API sent it; else IRPF 31/12 cost or a manual cost
 * on the same identity. Never invent cost from the market close.
 */
export function resolveB3CostBasis(
  incoming: PortfolioAsset,
  existing: PortfolioAsset | undefined
): Pick<PortfolioAsset, "costBasis" | "costBasisKnown"> {
  if (incoming.costBasisKnown === true && incoming.costBasis > 0) {
    return { costBasis: incoming.costBasis, costBasisKnown: true };
  }
  if (existing && hasKnownCostBasis(existing) && existing.costBasis > 0) {
    return { costBasis: existing.costBasis, costBasisKnown: true };
  }
  return { costBasis: incoming.costBasis, costBasisKnown: false };
}
