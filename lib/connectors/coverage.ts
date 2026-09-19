import type { ManualKind, PortfolioAsset } from "@/types";

const OUTSIDE_B3: ReadonlySet<ManualKind> = new Set([
  "cash",
  "pgbl",
  "vgbl",
  "fgts",
  "home",
  "rental",
  "land",
  "vehicle",
  "jewelry",
  "collection",
  "custom",
]);

/** PGBL, FGTS, imóvel and other B3-outside holdings never match an import. */
export function isOutsideB3Coverage(
  asset: Pick<PortfolioAsset, "manualKind" | "assetClass" | "source">
): boolean {
  if (asset.manualKind && OUTSIDE_B3.has(asset.manualKind)) return true;
  if (asset.assetClass === "real_estate" || asset.assetClass === "personal") {
    return true;
  }
  return false;
}
