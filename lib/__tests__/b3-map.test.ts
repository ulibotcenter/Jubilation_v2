import { describe, expect, it } from "vitest";
import { allowlistB3Payload } from "@/lib/connectors/b3/allowlist";
import { B3_FIXTURE_AS_OF, B3_FIXTURE_RAW } from "@/lib/connectors/b3/fixture";
import { mapAllowlistedB3 } from "@/lib/connectors/b3/map";
import { isOpenFinanceEnabled } from "@/lib/connectors/flags";
import { fixtureCanonical } from "@/lib/connectors/b3/client";

describe("B3 mapping", () => {
  const allowlisted = allowlistB3Payload(B3_FIXTURE_RAW, B3_FIXTURE_AS_OF);
  const mapped = mapAllowlistedB3(allowlisted);

  it("strips PII that is not on the allowlist", () => {
    const json = JSON.stringify(allowlisted);
    expect(json).not.toContain("investorEmail");
    expect(json).not.toContain("homeAddress");
    expect(json).not.toContain("not-to-be-persisted");
    expect(json).not.toContain("39053344705");
    expect(json).not.toContain("phone");
    expect(allowlisted.equitiesPositions[0]).not.toHaveProperty("investorEmail");
  });

  it("keeps custody fields: ticker, quantity, ISIN, institution", () => {
    const petr = allowlisted.equitiesPositions.find(
      (row) => row.tickerSymbol === "PETR4"
    );
    expect(petr).toMatchObject({
      tickerSymbol: "PETR4",
      isin: "BRPETRACNPR6",
      quantity: 200,
      closingPrice: 38.12,
      participantDocumentNumber: "02332886000104",
    });
  });

  it("maps equities, Tesouro and registered fixed income to holdings", () => {
    const tickers = mapped.holdings.map((h) => h.ticker).sort();
    expect(tickers).toEqual(
      ["BOVA11", "CDB-INT", "HGLG11", "LCI-ITA", "NTNB-2029", "NTNS-2027", "PETR4", "VALE3"].sort()
    );
    expect(mapped.holdings.every((h) => h.source === "B3_API")).toBe(true);
    expect(mapped.holdings.every((h) => h.asOf === B3_FIXTURE_AS_OF)).toBe(true);
    expect(mapped.holdings.every((h) => h.externalRef)).toBe(true);
    expect(mapped.holdings.every((h) => h.id.startsWith("b3-"))).toBe(true);

    const tesouro = mapped.holdings.find((h) => h.ticker === "NTNB-2029")!;
    expect(tesouro.assetClass).toBe("bonds");
    expect(tesouro.name).toMatch(/Tesouro IPCA/);
    expect(tesouro.quantity).toBeCloseTo(1.24);
    expect(tesouro.currentPrice).toBeCloseTo(3200.15);

    const cdb = mapped.holdings.find((h) => h.ticker === "CDB-INT")!;
    expect(cdb.assetClass).toBe("bonds");
    expect(cdb.currentPrice).toBe(25000);

    const etf = mapped.holdings.find((h) => h.ticker === "BOVA11")!;
    expect(etf.assetClass).toBe("etf");
    const fii = mapped.holdings.find((h) => h.ticker === "HGLG11")!;
    expect(fii.assetClass).toBe("reit");
  });

  it("creates institution and brokerage account with CNPJ", () => {
    expect(mapped.institutions.some((i) => i.cnpj === "02332886000104")).toBe(
      true
    );
    expect(mapped.accounts.some((a) => a.kind === "BROKERAGE")).toBe(true);
  });

  it("maps movements and events to cash flows without recommending a ticker", () => {
    expect(mapped.cashFlows.length).toBeGreaterThan(0);
    expect(mapped.cashFlows.every((cf) => cf.source === "B3_API")).toBe(true);
  });

  it("fixture path is honest about mode=fixture", () => {
    const snapshot = fixtureCanonical(new Date("2026-09-19T12:00:00Z"));
    expect(snapshot.health.mode).toBe("fixture");
    expect(snapshot.health.asOf).toBe(B3_FIXTURE_AS_OF);
    expect(snapshot.health.staleness).toBe("fresh");
    expect(snapshot.raw.payload).not.toHaveProperty("investorEmail");
  });

  it("reimport uses the same holding ids", () => {
    const again = mapAllowlistedB3(allowlisted);
    expect(again.holdings.map((h) => h.id)).toEqual(
      mapped.holdings.map((h) => h.id)
    );
  });

  it("does not enable Open Finance", () => {
    expect(isOpenFinanceEnabled()).toBe(false);
  });
});
