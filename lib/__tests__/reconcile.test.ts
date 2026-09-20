import { describe, expect, it } from "vitest";
import { buildAssetFromPreset, presetById } from "@/lib/physicalAssetPresets";
import { mapAllowlistedB3 } from "@/lib/connectors/b3/map";
import { allowlistB3Payload } from "@/lib/connectors/b3/allowlist";
import { B3_FIXTURE_AS_OF, B3_FIXTURE_RAW } from "@/lib/connectors/b3/fixture";
import { reconcileHoldings } from "@/lib/connectors/reconcile";
import { grantB3Consent } from "@/lib/connectors/consent";
import { runB3Sync } from "@/lib/connectors/sync";
import { B3Connector } from "@/lib/connectors/b3";
import type { PortfolioAsset } from "@/types";

function manualPetr(): PortfolioAsset {
  return {
    id: "asset-manual-petr",
    ticker: "PETR4",
    name: "Petrobras (digitada)",
    assetClass: "stocks",
    quantity: 10,
    currentPrice: 30,
    costBasis: 28,
    currency: "BRL",
    nativeCurrency: "BRL",
    allocation: 0,
    expectedCAGR: 9.1,
    realReturn: 6,
    source: "MANUAL",
    asOf: "2026-01-01",
    ownership: "holder",
    allowSale: true,
    liquidity: "liquid",
  };
}

describe("B3 reconciliation", () => {
  const allowlisted = allowlistB3Payload(B3_FIXTURE_RAW, B3_FIXTURE_AS_OF);
  const incoming = mapAllowlistedB3(allowlisted);

  it("imported market value wins; API averagePrice wins when sent; manual CAGR stays", () => {
    const result = reconcileHoldings({
      existing: [manualPetr()],
      incoming: incoming.holdings,
      institutions: incoming.institutions,
      accounts: incoming.accounts,
    });
    const petr = result.portfolio.find((a) => a.ticker === "PETR4")!;
    expect(petr.id).toBe("asset-manual-petr");
    expect(petr.source).toBe("B3_API");
    expect(petr.quantity).toBe(200);
    expect(petr.currentPrice).toBe(38.12);
    expect(petr.asOf).toBe(B3_FIXTURE_AS_OF);
    expect(petr.expectedCAGR).toBe(9.1);
    expect(petr.realReturn).toBe(6);
    expect(petr.costBasis).toBe(32.5);
    expect(petr.costBasisKnown).toBe(true);
    expect(petr.ownership).toBe("holder");
    expect(result.merges.some((m) => m.ticker === "PETR4")).toBe(true);
  });

  it("keeps IRPF or manual cost when B3 omits averagePrice", () => {
    const noAvg = {
      ...incoming.holdings.find((h) => h.ticker === "PETR4")!,
      costBasis: 0,
      costBasisKnown: false,
    };
    const result = reconcileHoldings({
      existing: [manualPetr()],
      incoming: [noAvg],
      institutions: incoming.institutions,
      accounts: incoming.accounts,
    });
    const petr = result.portfolio.find((a) => a.ticker === "PETR4")!;
    expect(petr.costBasis).toBe(28);
    expect(petr.costBasisKnown).toBe(true);
  });

  it("does not overwrite PGBL, FGTS or home", () => {
    const pgbl = buildAssetFromPreset({
      preset: presetById("pgbl")!,
      name: "PGBL Itaú",
      purchase: 120_000,
      value: 120_000,
      asOf: "2026-01-01",
      ownership: "holder",
      currency: "BRL",
      portfolio: [],
    });
    const fgts = buildAssetFromPreset({
      preset: presetById("fgts")!,
      name: "FGTS",
      purchase: 45_000,
      value: 45_000,
      asOf: "2026-01-01",
      ownership: "joint",
      currency: "BRL",
      portfolio: [pgbl],
    });
    const home = buildAssetFromPreset({
      preset: presetById("primary-home")!,
      name: "Residência",
      purchase: 400_000,
      value: 400_000,
      asOf: "2026-01-01",
      ownership: "spouse",
      currency: "BRL",
      portfolio: [pgbl, fgts],
    });
    const result = reconcileHoldings({
      existing: [pgbl, fgts, home],
      incoming: incoming.holdings,
      institutions: incoming.institutions,
      accounts: incoming.accounts,
    });
    expect(result.portfolio.find((a) => a.id === pgbl.id)?.currentPrice).toBe(
      120_000
    );
    expect(result.portfolio.find((a) => a.id === fgts.id)?.source).toBe(
      "MANUAL"
    );
    expect(result.portfolio.find((a) => a.id === home.id)?.ownership).toBe(
      "spouse"
    );
    expect(result.portfolio.some((a) => a.ticker === "PETR4")).toBe(true);
  });

  it("reimporting the same fixture is idempotent", () => {
    const first = reconcileHoldings({
      existing: [],
      incoming: incoming.holdings,
      institutions: incoming.institutions,
      accounts: incoming.accounts,
    });
    const second = reconcileHoldings({
      existing: first.portfolio,
      incoming: incoming.holdings,
      institutions: incoming.institutions,
      accounts: incoming.accounts,
      existingInstitutions: first.institutions,
      existingAccounts: first.accounts,
    });
    const b3Ids = (assets: typeof first.portfolio) =>
      assets
        .filter((a) => a.source === "B3_API")
        .map((a) => a.id)
        .sort();
    expect(b3Ids(second.portfolio)).toEqual(b3Ids(first.portfolio));
    expect(second.portfolio.filter((a) => a.ticker === "PETR4")).toHaveLength(1);
  });

  it("runB3Sync with fixture consent writes imported holdings", async () => {
    const { consent } = grantB3Consent({
      subjectId: "local-user",
      partnerId: "b2c-default",
      now: new Date("2026-09-19T12:00:00Z"),
    });
    const result = await runB3Sync({
      consent,
      existing: [manualPetr()],
      institutions: [],
      accounts: [],
      connector: new B3Connector({}),
      now: new Date("2026-09-19T12:00:00Z"),
    });
    expect(result.sync.mode).toBe("fixture");
    expect(result.sync.asOf).toBe(B3_FIXTURE_AS_OF);
    expect(result.reconcile.portfolio.some((a) => a.ticker === "NTNS-2027")).toBe(
      true
    );
  });
});
