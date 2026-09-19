import type { PortfolioAsset } from "@/types";
import { buildAssetFromPreset, presetById } from "@/lib/physicalAssetPresets";
import { stableEntityId } from "@/lib/engine/ids";
import type { IrpfAllowlisted } from "@/lib/connectors/irpf/allowlist";

const SUGGEST_CODES: Record<string, string> = {
  "01": "primary-home",
  "02": "rental",
  "11": "primary-home",
  "12": "primary-home",
  "13": "land",
  "14": "land",
  "15": "primary-home",
  "16": "rental",
  "17": "rental",
  "18": "primary-home",
  "21": "vehicle",
  "22": "vehicle",
  "23": "vehicle",
  "25": "jewelry",
  "41": "cash",
  "61": "cash",
  "62": "cash",
  "63": "cash",
  "64": "cash",
  "72": "pgbl",
  "97": "vgbl",
};

const SKIP_B3_CODES = new Set(["31", "32", "39", "45", "46", "47", "49"]);

export function suggestIrpfHoldings(
  allowlisted: IrpfAllowlisted,
  existing: PortfolioAsset[],
  asOf: string
): PortfolioAsset[] {
  const out: PortfolioAsset[] = [];
  const used = [...existing];
  for (const asset of allowlisted.assets) {
    if (SKIP_B3_CODES.has(asset.code)) continue;
    const presetId = SUGGEST_CODES[asset.code];
    if (!presetId) continue;
    const preset = presetById(presetId);
    if (!preset) continue;
    const value = asset.currentCents / 100;
    if (value <= 0) continue;
    const built = buildAssetFromPreset({
      preset,
      name: asset.description.slice(0, 80) || preset.defaultName,
      purchase: asset.previousCents / 100 || value,
      value,
      asOf,
      ownership: "holder",
      currency: "BRL",
      portfolio: [...used, ...out],
    });
    const ref = `irpf:${allowlisted.anoBase ?? "na"}:${asset.code}:${asset.description.slice(0, 40)}`;
    out.push({
      ...built,
      id: stableEntityId("irpf", ref),
      source: "FILE_IRPF",
      asOf,
      confidence: "high",
      externalRef: ref,
      valueHistory: [{ asOf, value, source: "FILE_IRPF" }],
    });
  }
  return out;
}

export function applyIrpfHoldings(input: {
  existing: PortfolioAsset[];
  incoming: PortfolioAsset[];
}): PortfolioAsset[] {
  const next = [...input.existing];
  for (const incoming of input.incoming) {
    const b3Clash = input.existing.find(
      (row) =>
        row.source === "B3_API" &&
        (Boolean(incoming.externalRef && row.externalRef === incoming.externalRef) ||
          row.ticker.toUpperCase() === incoming.ticker.toUpperCase())
    );
    if (b3Clash) continue;
    const sameRef = next.find(
      (row) =>
        incoming.externalRef &&
        row.externalRef === incoming.externalRef &&
        row.source === "FILE_IRPF"
    );
    if (sameRef) {
      const idx = next.indexOf(sameRef);
      next[idx] = {
        ...sameRef,
        currentPrice: incoming.currentPrice,
        asOf: incoming.asOf,
        lastPriceAt: incoming.lastPriceAt,
        source: "FILE_IRPF",
      };
      continue;
    }
    const sameKind = next.find(
      (row) =>
        row.manualKind &&
        row.manualKind === incoming.manualKind &&
        row.source !== "B3_API" &&
        row.name === incoming.name
    );
    if (sameKind) {
      const idx = next.indexOf(sameKind);
      next[idx] = {
        ...sameKind,
        currentPrice: incoming.currentPrice,
        asOf: incoming.asOf,
        source: sameKind.source === "B3_API" ? sameKind.source : "FILE_IRPF",
      };
      continue;
    }
    next.push(incoming);
  }
  return next;
}

export function irpfAsOf(allowlisted: IrpfAllowlisted, fallback: string): string {
  if (allowlisted.anoBase && /^\d{4}$/.test(allowlisted.anoBase)) {
    return `${allowlisted.anoBase}-12-31`;
  }
  return fallback;
}
