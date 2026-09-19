import { describe, expect, it } from "vitest";
import { appendDatedValue, seedValueHistory } from "@/lib/datedValue";
import type { PortfolioAsset } from "@/types";

const cash: PortfolioAsset = {
  id: "asset-1",
  ticker: "CASH-1",
  name: "Liquidez",
  assetClass: "cash",
  quantity: 1,
  currentPrice: 20_000,
  costBasis: 20_000,
  currency: "BRL",
  allocation: 100,
  source: "MANUAL",
  asOf: "2026-01-10",
};

describe("dated value series", () => {
  it("seeds history from the current holding when none exists", () => {
    expect(seedValueHistory(cash)).toEqual([
      { asOf: "2026-01-10", value: 20_000, source: "MANUAL" },
    ]);
  });

  it("appends a new point instead of overwriting the last", () => {
    const next = appendDatedValue(cash, 22_500, "2026-03-01");
    expect(next.valueHistory).toEqual([
      { asOf: "2026-01-10", value: 20_000, source: "MANUAL" },
      { asOf: "2026-03-01", value: 22_500, source: "MANUAL" },
    ]);
    expect(next.currentPrice).toBe(22_500);
    expect(next.asOf).toBe("2026-03-01");
  });

  it("does not duplicate the same date and value", () => {
    const seeded = appendDatedValue(cash, 20_000, "2026-01-10");
    expect(seeded.valueHistory).toHaveLength(1);
  });
});
