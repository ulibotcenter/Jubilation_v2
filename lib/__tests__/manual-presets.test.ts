import { describe, expect, it } from "vitest";
import {
  buildAssetFromPreset,
  generatePhysicalTicker,
  isNonMarketAsset,
  PHYSICAL_ASSET_PRESETS,
  presetById,
} from "@/lib/physicalAssetPresets";

describe("manual holding presets", () => {
  const ids = PHYSICAL_ASSET_PRESETS.map((p) => p.id);

  it("covers what B3 does not: cash, PGBL/VGBL, FGTS, home, vehicle, jewelry", () => {
    for (const id of [
      "cash",
      "pgbl",
      "vgbl",
      "fgts",
      "primary-home",
      "vehicle",
      "jewelry",
      "collectibles",
    ]) {
      expect(ids).toContain(id);
    }
  });

  it("keeps cash liquid at 0% real", () => {
    const cash = presetById("cash")!;
    expect(cash.assetClass).toBe("cash");
    expect(cash.defaultRealReturn).toBe(0);
    expect(cash.liquidity).toBe("liquid");
    expect(cash.allowSale).toBe(true);
  });

  it("models PGBL/VGBL as other (not funds) so come-cotas does not apply", () => {
    const pgbl = presetById("pgbl")!;
    const vgbl = presetById("vgbl")!;
    expect(pgbl.assetClass).toBe("other");
    expect(vgbl.assetClass).toBe("other");
    expect(pgbl.defaultRealReturn).toBe(3.5);
    expect(vgbl.defaultRealReturn).toBe(3.5);
  });

  it("keeps FGTS and the primary home illiquid and unsold by default", () => {
    const fgts = presetById("fgts")!;
    const home = presetById("primary-home")!;
    expect(fgts.liquidity).toBe("illiquid");
    expect(fgts.allowSale).toBe(false);
    expect(fgts.defaultRealReturn).toBe(0);
    expect(home.liquidity).toBe("illiquid");
    expect(home.allowSale).toBe(false);
    expect(home.defaultRealReturn).toBe(0);
  });

  it("depreciates vehicles in real terms", () => {
    expect(presetById("vehicle")!.defaultRealReturn).toBe(-8);
  });

  it("builds an append-only dated series with ownership and explicit real return", () => {
    const preset = presetById("pgbl")!;
    const asset = buildAssetFromPreset({
      preset,
      name: "PGBL Itaú",
      purchase: 80_000,
      value: 120_000,
      asOf: "2026-03-15",
      ownership: "joint",
      currency: "BRL",
      realReturn: 4,
      portfolio: [],
    });
    expect(asset.manualKind).toBe("pgbl");
    expect(asset.ownership).toBe("joint");
    expect(asset.realReturn).toBe(4);
    expect(asset.priceSource).toBe("manual");
    expect(asset.source).toBe("MANUAL");
    expect(asset.asOf).toBe("2026-03-15");
    expect(asset.liquidity).toBe("liquid");
    expect(asset.valueHistory).toEqual([
      { asOf: "2026-03-15", value: 120_000, source: "MANUAL" },
    ]);
    expect(isNonMarketAsset(asset)).toBe(true);
  });

  it("generates unique tickers per prefix", () => {
    const first = generatePhysicalTicker("PGBL", []);
    const second = generatePhysicalTicker("PGBL", [
      {
        id: "a",
        ticker: first,
        name: "PGBL",
        assetClass: "other",
        quantity: 1,
        currentPrice: 1,
        costBasis: 1,
        currency: "BRL",
        allocation: 0,
      },
    ]);
    expect(first).toBe("PGBL-1");
    expect(second).toBe("PGBL-2");
  });
});
