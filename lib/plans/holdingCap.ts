import { dropSeedIfUserHoldings, isModelSeedId } from "@/lib/onboarding/seed";
import type { PlanTier } from "@/lib/plans";
import type { AssetClass, PortfolioAsset } from "@/types";

/** Bolsa + Tesouro on Básico. Completo has no cap. */
export const BASICO_LISTED_CAP = 5;

const BOLSA_CLASSES = new Set<AssetClass>(["stocks", "etf", "bdr", "reit"]);

type CapAsset = Pick<PortfolioAsset, "id" | "assetClass"> &
  Partial<Pick<PortfolioAsset, "listing" | "manualKind">>;

/**
 * Listed equity (bolsa) and Tesouro/RF count. Imóvel and other manual
 * assets do not. Model-seed rows never count — the first real holding
 * drops them, and they must not block a paying user.
 */
export function countsTowardListedCap(asset: CapAsset): boolean {
  if (isModelSeedId(asset.id)) return false;
  if (asset.manualKind && asset.manualKind !== "custom") return false;
  if (asset.assetClass === "bonds") return true;
  if (asset.listing === "unlisted") return false;
  return BOLSA_CLASSES.has(asset.assetClass);
}

export function listedCapCount(portfolio: CapAsset[]): number {
  return portfolio.filter(countsTowardListedCap).length;
}

export type HoldingAddResult =
  | { ok: true }
  | { ok: false; reason: "listed_cap" };

export function holdingAddDecision(
  plan: PlanTier,
  portfolio: PortfolioAsset[],
  incoming: PortfolioAsset
): HoldingAddResult {
  if (plan !== "premium") return { ok: true };
  if (!countsTowardListedCap(incoming)) return { ok: true };
  const next = dropSeedIfUserHoldings([...portfolio, incoming]);
  if (listedCapCount(next) > BASICO_LISTED_CAP) {
    return { ok: false, reason: "listed_cap" };
  }
  return { ok: true };
}
