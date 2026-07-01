import {
  calculatePortfolioValue,
  type KPIValues,
  type PortfolioAsset,
} from "@/types";

/** KPIs with net worth adjusted for included portfolio assets only */
export function resolveSimulationKpis(
  kpis: KPIValues,
  portfolio: PortfolioAsset[],
  includedAssetIds: string[],
  outsidePortfolio?: number
): KPIValues {
  const totalPortfolio = calculatePortfolioValue(portfolio);
  const outside =
    outsidePortfolio ??
    Math.max(0, Math.round(kpis.currentNetWorth - totalPortfolio));

  return {
    ...kpis,
    currentNetWorth: Math.round(totalPortfolio + outside),
  };
}

export function getDefaultIncludedAssetIds(
  portfolio: PortfolioAsset[]
): string[] {
  return portfolio.map((a) => a.id);
}

export const SCOPE_PRESETS = {
  all: { label: "All assets", excludeClasses: [] as const },
  investmentsOnly: {
    label: "Investments only",
    excludeClasses: ["real_estate", "personal", "cash", "other"] as const,
  },
  liquidMarkets: {
    label: "Liquid markets",
    excludeClasses: [
      "real_estate",
      "personal",
      "cash",
      "crypto",
      "other",
    ] as const,
  },
} as const;

export type ScopePresetId = keyof typeof SCOPE_PRESETS;

export function applyScopePreset(
  portfolio: PortfolioAsset[],
  presetId: ScopePresetId
): string[] {
  const preset = SCOPE_PRESETS[presetId];
  if (preset.excludeClasses.length === 0) {
    return getDefaultIncludedAssetIds(portfolio);
  }
  const excluded = new Set<string>(preset.excludeClasses);
  return portfolio
    .filter((a) => !excluded.has(a.assetClass))
    .map((a) => a.id);
}

export function isScopeFiltered(
  portfolio: PortfolioAsset[],
  includedAssetIds: string[]
): boolean {
  return includedAssetIds.length < portfolio.length;
}