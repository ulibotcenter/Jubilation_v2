import type { AssetClass, PortfolioAsset } from "@/types";

export interface PhysicalAssetPreset {
  id: string;
  label: string;
  description: string;
  assetClass: AssetClass;
  tickerPrefix: string;
  defaultName: string;
  icon: "home" | "building" | "car" | "land" | "gem" | "custom";
}

export const PHYSICAL_ASSET_PRESETS: PhysicalAssetPreset[] = [
  {
    id: "primary-home",
    label: "Primary home",
    description: "Your main residence",
    assetClass: "real_estate",
    tickerPrefix: "HOME",
    defaultName: "Primary residence",
    icon: "home",
  },
  {
    id: "rental",
    label: "Rental property",
    description: "Income-producing real estate",
    assetClass: "real_estate",
    tickerPrefix: "RENTAL",
    defaultName: "Rental property",
    icon: "building",
  },
  {
    id: "land",
    label: "Land",
    description: "Vacant or undeveloped land",
    assetClass: "real_estate",
    tickerPrefix: "LAND",
    defaultName: "Land parcel",
    icon: "land",
  },
  {
    id: "vehicle",
    label: "Vehicle",
    description: "Car, boat, or other vehicle",
    assetClass: "personal",
    tickerPrefix: "VEHICLE",
    defaultName: "Personal vehicle",
    icon: "car",
  },
  {
    id: "collectibles",
    label: "Collectibles",
    description: "Art, jewelry, watches, etc.",
    assetClass: "personal",
    tickerPrefix: "COLLECT",
    defaultName: "Collectible asset",
    icon: "gem",
  },
  {
    id: "custom",
    label: "Other asset",
    description: "Anything not listed above",
    assetClass: "other",
    tickerPrefix: "ASSET",
    defaultName: "Custom asset",
    icon: "custom",
  },
];

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

export function isNonMarketAsset(asset: Pick<PortfolioAsset, "assetClass" | "priceSource">): boolean {
  return (
    asset.assetClass === "real_estate" ||
    asset.assetClass === "personal" ||
    asset.priceSource === "manual"
  );
}