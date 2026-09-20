import { afterEach, describe, expect, it } from "vitest";
import { allowlistB3Payload } from "@/lib/connectors/b3/allowlist";
import { dropB3Holdings } from "@/lib/connectors/b3/disconnect";
import { mapAllowlistedB3 } from "@/lib/connectors/b3/map";
import {
  B3AlreadyUpdatedError,
  b3BusinessDay,
  isB3QuotaConsumed,
  resetB3QueryCacheForTests,
} from "@/lib/connectors/b3/quota";
import { B3_FIXTURE_AS_OF, B3_FIXTURE_RAW } from "@/lib/connectors/b3/fixture";
import { parseIrpfFile } from "@/lib/connectors/irpf/parse";
import {
  applyIrpfBatchConfirm,
  buildIrpfBatchPreview,
  extractTickerFromIrpfDescription,
  retainIrpfExtract,
} from "@/lib/connectors/irpf/preview";
import {
  IRPF_FIXTURE_DBK,
  IRPF_FIXTURE_HOME_CENTS,
} from "@/lib/connectors/irpf/fixture";
import { resolveB3CostBasis, shouldHideRowPnl } from "@/lib/holdings/costBasis";
import { isProjectable } from "@/lib/holdings/origin";
import { partializePersistedState } from "@/lib/persist/partialize";
import type { PortfolioAsset } from "@/types";

afterEach(() => {
  resetB3QueryCacheForTests();
});

function holding(
  partial: Partial<PortfolioAsset> & Pick<PortfolioAsset, "id" | "ticker">
): PortfolioAsset {
  return {
    name: partial.name ?? partial.ticker,
    assetClass: partial.assetClass ?? "stocks",
    quantity: partial.quantity ?? 10,
    currentPrice: partial.currentPrice ?? 100,
    costBasis: partial.costBasis ?? 80,
    currency: "BRL",
    nativeCurrency: "BRL",
    allocation: 0,
    ...partial,
  };
}

describe("B3 business-day quota", () => {
  it("counts one query per CPF per São Paulo business day", () => {
    const friday = new Date("2026-09-18T18:00:00-03:00");
    const saturday = new Date("2026-09-19T10:00:00-03:00");
    const monday = new Date("2026-09-21T10:00:00-03:00");
    expect(b3BusinessDay(friday)).toBe("2026-09-18");
    expect(b3BusinessDay(saturday)).toBe("2026-09-18");
    expect(isB3QuotaConsumed(friday.toISOString(), saturday)).toBe(true);
    expect(isB3QuotaConsumed(friday.toISOString(), monday)).toBe(false);
    expect(new B3AlreadyUpdatedError("2026-09-18").message).toMatch(/D-1/);
  });
});

describe("B3 mapping for the wizard lot", () => {
  const mapped = mapAllowlistedB3(
    allowlistB3Payload(B3_FIXTURE_RAW, B3_FIXTURE_AS_OF)
  );

  it("maps ticker, qty, market, institution, class, gravame, avg price and D-1 asOf", () => {
    const petr = mapped.holdings.find((h) => h.ticker === "PETR4")!;
    expect(petr.quantity).toBe(200);
    expect(petr.currentPrice).toBeCloseTo(38.12);
    expect(petr.costBasisKnown).toBe(true);
    expect(petr.costBasis).toBe(32.5);
    expect(petr.institutionName).toMatch(/XP/);
    expect(petr.productClass).toBe("rv");
    expect(petr.asOf).toBe(B3_FIXTURE_AS_OF);
    expect(petr.origin).toBe("b3");
  });

  it("does not invent average price — hide P/L until IRPF or manual cost", () => {
    const incoming = holding({
      id: "b3-no-avg",
      ticker: "WEGE3",
      origin: "b3",
      source: "B3_API",
      costBasis: 0,
      costBasisKnown: false,
      currentPrice: 40,
    });
    expect(shouldHideRowPnl(incoming)).toBe(true);
    const fromIrpf = resolveB3CostBasis(
      incoming,
      holding({
        id: "irpf-wege",
        ticker: "WEGE3",
        origin: "irpf",
        source: "FILE_IRPF",
        costBasis: 28,
        costBasisKnown: true,
      })
    );
    expect(fromIrpf).toEqual({ costBasis: 28, costBasisKnown: true });
    expect(
      resolveB3CostBasis(incoming, undefined).costBasisKnown
    ).toBe(false);
  });

  it("does not map Movimentação into engine cashFlows", () => {
    expect(
      mapped.cashFlows.some((cf) => cf.category === "trade" && cf.date === "2026-08-12")
    ).toBe(false);
  });

  it("disconnect deletes B3 rows and keeps manual / IRPF", () => {
    const book = [
      holding({ id: "b3-1", ticker: "PETR4", origin: "b3", source: "B3_API" }),
      holding({
        id: "irpf-1",
        ticker: "CASA",
        origin: "irpf",
        source: "FILE_IRPF",
        manualKind: "home",
      }),
      holding({ id: "man-1", ticker: "BTC", origin: "manual", source: "MANUAL" }),
    ];
    const next = dropB3Holdings(book);
    expect(next.map((a) => a.id)).toEqual(["irpf-1", "man-1"]);
  });
});

describe("IRPF batch confirmation", () => {
  const parsed = parseIrpfFile(IRPF_FIXTURE_DBK, { fileName: "IRPF-2025.dbk" });

  it("extracts PETR4 from the bens line", () => {
    expect(extractTickerFromIrpfDescription("ACOES PETR4 QUANTIDADE 200")).toBe(
      "PETR4"
    );
  });

  it("does not import tickers already on B3 and notices them", () => {
    const preview = buildIrpfBatchPreview({
      allowlisted: parsed.allowlisted,
      existing: [
        holding({
          id: "b3-petr",
          ticker: "PETR4",
          origin: "b3",
          source: "B3_API",
          costBasisKnown: true,
        }),
      ],
      today: "2026-09-20",
    });
    expect(preview.covered.some((c) => c.ticker === "PETR4")).toBe(true);
    expect(preview.rows.some((r) => r.ticker.includes("PETR"))).toBe(false);
    expect(preview.rows.some((r) => r.name.toLowerCase().includes("casa"))).toBe(
      true
    );
    expect(preview.rows[0]?.todayValue).toBeGreaterThan(0);
    expect(preview.rows[0]?.costAsOf).toBe("2024-12-31");
  });

  it("Usar todos turns 31/12 cost into today's confirmed estimate", () => {
    const preview = buildIrpfBatchPreview({
      allowlisted: parsed.allowlisted,
      existing: [],
      today: "2026-09-20",
    });
    const home = preview.rows.find((r) => r.holding.manualKind === "home")!;
    expect(home.todayValue).toBe(IRPF_FIXTURE_HOME_CENTS / 100);
    const applied = applyIrpfBatchConfirm({
      existing: [],
      preview,
      rows: preview.rows,
    });
    const casa = applied.find((h) => h.manualKind === "home")!;
    expect(casa.valueType).toBe("user_estimate");
    expect(casa.asOf).toBe("2026-09-20");
    expect(isProjectable(casa)).toBe(true);
    expect(casa.currentPrice).toBe(IRPF_FIXTURE_HOME_CENTS / 100);
  });

  it("keeps only the structured extract — never the raw file", () => {
    const preview = buildIrpfBatchPreview({
      allowlisted: parsed.allowlisted,
      existing: [],
      today: "2026-09-20",
    });
    const sealed = retainIrpfExtract(preview.extract, { vaultExists: true });
    const json = JSON.stringify(sealed.extract);
    expect(json).not.toContain(IRPF_FIXTURE_DBK.slice(0, 40));
    expect(json).not.toContain("IRPF2025");
    expect(sealed.encryptedAtRest).toBe(true);
    const persisted = partializePersistedState({
      locale: "pt",
      currency: "BRL",
      country: "BR",
      manualEffectiveTaxRatePct: null,
      modelSeedActive: false,
      fxSnapshot: null,
      onboarding: { completed: true },
      sidebarCollapsed: false,
      persistVersion: 1,
      tenant: {},
      institutions: [],
      accounts: [],
      cashFlows: [],
      entitlements: [],
      consents: [],
      consentAuditLog: [],
      connectorSync: { irpf: { extract: sealed.extract } },
      household: {},
      user: {},
      explainSimple: false,
      theme: "dark",
      coachMarksDismissed: true,
      sensitivity: {},
      netWorthSnapshots: [],
      aiChatHistory: [],
      savedScenarios: [],
      kpis: {},
      kpiOutsidePortfolio: 0,
      portfolio: [],
      portfolioLastRefreshedAt: null,
      simulationIncludedAssetIds: [],
      monteCarlo: {},
      simPlayground: {},
    });
    expect(JSON.stringify(persisted)).not.toContain(IRPF_FIXTURE_DBK);
    expect(JSON.stringify(persisted)).not.toContain("39053344705");
  });
});
