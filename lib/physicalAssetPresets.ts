import type { AssetClass, Liquidity, PortfolioAsset } from "@/types";
import { fisherNominal } from "@/lib/engine/rates";
import { DEFAULT_LONG_RUN_INFLATION } from "@/lib/engine/assumptions";
import { createId } from "@/lib/engine/ids";
import type { Ownership } from "@/lib/engine/canonical";
import type { ManualKind } from "@/types";

export interface PhysicalAssetPreset {
  id: string;
  label: string;
  description: string;
  assetClass: AssetClass;
  tickerPrefix: string;
  defaultName: string;
  icon: "home" | "building" | "car" | "land" | "gem" | "custom" | "cash" | "pension" | "fgts";
  manualKind: ManualKind;
  /** Real annual appreciation between dated updates. Explicit and editable. */
  defaultRealReturn: number;
  liquidity: Liquidity;
  allowSale: boolean;
  transactionCostRate: number;
}

/**
 * First-class manual holdings for what B3 custody does not cover.
 * Defaults are conservative (spec 5.8): home near inflation, vehicle depreciates,
 * jewelry/collections hold real value with low liquidity, FGTS 0% real.
 */
export const PHYSICAL_ASSET_PRESETS: PhysicalAssetPreset[] = [
  {
    id: "cash",
    label: "Cash / liquidity",
    description: "Checking, savings, or cash not in B3 custody",
    assetClass: "cash",
    tickerPrefix: "CASH",
    defaultName: "Cash",
    icon: "cash",
    manualKind: "cash",
    defaultRealReturn: 0,
    liquidity: "liquid",
    allowSale: true,
    transactionCostRate: 0,
  },
  {
    id: "pgbl",
    label: "PGBL",
    description: "Private pension (PGBL) — outside B3",
    assetClass: "other",
    tickerPrefix: "PGBL",
    defaultName: "PGBL",
    icon: "pension",
    manualKind: "pgbl",
    defaultRealReturn: 3.5,
    liquidity: "liquid",
    allowSale: true,
    transactionCostRate: 0,
  },
  {
    id: "vgbl",
    label: "VGBL",
    description: "Private pension (VGBL) — outside B3",
    assetClass: "other",
    tickerPrefix: "VGBL",
    defaultName: "VGBL",
    icon: "pension",
    manualKind: "vgbl",
    defaultRealReturn: 3.5,
    liquidity: "liquid",
    allowSale: true,
    transactionCostRate: 0,
  },
  {
    id: "fgts",
    label: "FGTS",
    description: "FGTS balance — illiquid, not sold in slices",
    assetClass: "other",
    tickerPrefix: "FGTS",
    defaultName: "FGTS",
    icon: "fgts",
    manualKind: "fgts",
    defaultRealReturn: 0,
    liquidity: "illiquid",
    allowSale: false,
    transactionCostRate: 0,
  },
  {
    id: "primary-home",
    label: "Primary home",
    description: "Your main residence",
    assetClass: "real_estate",
    tickerPrefix: "HOME",
    defaultName: "Primary residence",
    icon: "home",
    manualKind: "home",
    defaultRealReturn: 0,
    liquidity: "illiquid",
    allowSale: false,
    transactionCostRate: 0.06,
  },
  {
    id: "rental",
    label: "Rental property",
    description: "Income-producing real estate",
    assetClass: "real_estate",
    tickerPrefix: "RENTAL",
    defaultName: "Rental property",
    icon: "building",
    manualKind: "rental",
    defaultRealReturn: 0,
    liquidity: "illiquid",
    allowSale: true,
    transactionCostRate: 0.06,
  },
  {
    id: "land",
    label: "Land",
    description: "Vacant or undeveloped land",
    assetClass: "real_estate",
    tickerPrefix: "LAND",
    defaultName: "Land parcel",
    icon: "land",
    manualKind: "land",
    defaultRealReturn: 0,
    liquidity: "illiquid",
    allowSale: true,
    transactionCostRate: 0.06,
  },
  {
    id: "vehicle",
    label: "Vehicle",
    description: "Car, boat, or other vehicle",
    assetClass: "personal",
    tickerPrefix: "VEHICLE",
    defaultName: "Personal vehicle",
    icon: "car",
    manualKind: "vehicle",
    defaultRealReturn: -8,
    liquidity: "illiquid",
    allowSale: true,
    transactionCostRate: 0.08,
  },
  {
    id: "jewelry",
    label: "Jewelry",
    description: "Jewelry and watches",
    assetClass: "personal",
    tickerPrefix: "JEWEL",
    defaultName: "Jewelry",
    icon: "gem",
    manualKind: "jewelry",
    defaultRealReturn: 0,
    liquidity: "illiquid",
    allowSale: true,
    transactionCostRate: 0.08,
  },
  {
    id: "collectibles",
    label: "Collectibles",
    description: "Art and collections",
    assetClass: "personal",
    tickerPrefix: "COLLECT",
    defaultName: "Collectible asset",
    icon: "gem",
    manualKind: "collection",
    defaultRealReturn: 0,
    liquidity: "illiquid",
    allowSale: true,
    transactionCostRate: 0.08,
  },
  {
    id: "custom",
    label: "Other asset",
    description: "Anything not listed above",
    assetClass: "other",
    tickerPrefix: "ASSET",
    defaultName: "Custom asset",
    icon: "custom",
    manualKind: "custom",
    defaultRealReturn: 0,
    liquidity: "illiquid",
    allowSale: false,
    transactionCostRate: 0.005,
  },
];

export const MANUAL_ASSET_PRESETS = PHYSICAL_ASSET_PRESETS;

export function presetById(id: string): PhysicalAssetPreset | undefined {
  return PHYSICAL_ASSET_PRESETS.find((p) => p.id === id);
}

export function generatePhysicalTicker(
  prefix: string,
  portfolio: PortfolioAsset[]
): string {
  const base = prefix.toUpperCase();
  let n = 1;
  const existing = new Set(portfolio.map((a) => a.ticker.toUpperCase()));
  while (existing.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function isNonMarketAsset(
  asset: Pick<PortfolioAsset, "assetClass" | "priceSource" | "manualKind" | "listing">
): boolean {
  return (
    asset.assetClass === "real_estate" ||
    asset.assetClass === "personal" ||
    asset.listing === "unlisted" ||
    asset.priceSource === "manual" ||
    Boolean(asset.manualKind)
  );
}

export function nominalCagrFromReal(realPercent: number, inflation = DEFAULT_LONG_RUN_INFLATION): number {
  return Math.round(fisherNominal(realPercent / 100, inflation) * 1000) / 10;
}

export function buildAssetFromPreset(input: {
  preset: PhysicalAssetPreset;
  name: string;
  purchase: number;
  value: number;
  asOf: string;
  ownership: Ownership;
  currency: PortfolioAsset["currency"];
  realReturn?: number;
  liquidity?: Liquidity;
  allowSale?: boolean;
  portfolio: PortfolioAsset[];
  idPrefix?: string;
}): PortfolioAsset {
  const real = input.realReturn ?? input.preset.defaultRealReturn;
  const ticker = generatePhysicalTicker(input.preset.tickerPrefix, input.portfolio);
  return {
    id: createId(input.idPrefix ?? "asset"),
    ticker,
    name: input.name,
    assetClass: input.preset.assetClass,
    quantity: 1,
    currentPrice: input.value,
    costBasis: input.purchase,
    currency: input.currency,
    nativeCurrency: input.currency,
    allocation: 0,
    expectedCAGR: nominalCagrFromReal(real),
    realReturn: real,
    priceSource: "manual",
    lastPriceAt: input.asOf,
    previousPrice: null,
    liquidity: input.liquidity ?? input.preset.liquidity,
    transactionCostRate: input.preset.transactionCostRate,
    allowSale: input.allowSale ?? input.preset.allowSale,
    scheduledSaleOn: null,
    source: "MANUAL",
    origin: "manual",
    valueType: "user_estimate",
    asOf: input.asOf,
    confidence: "high",
    ownership: input.ownership,
    manualKind: input.preset.manualKind,
    valueHistory: [{ asOf: input.asOf, value: input.value, source: "MANUAL" }],
  };
}
