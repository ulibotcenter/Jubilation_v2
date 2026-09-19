import { describe, expect, it } from "vitest";
import { parseIrpfFile } from "@/lib/connectors/irpf/parse";
import { applyIrpfHoldings, suggestIrpfHoldings, irpfAsOf } from "@/lib/connectors/irpf/map";
import {
  IRPF_FIXTURE_CLINIC,
  IRPF_FIXTURE_CPF,
  IRPF_FIXTURE_DBK,
  IRPF_FIXTURE_DOCTOR,
  IRPF_FIXTURE_HOME_CENTS,
  IRPF_FIXTURE_PGBL_CENTS,
  IRPF_FIXTURE_PJ_CENTS,
  IRPF_FIXTURE_PREVPRIV_CENTS,
} from "@/lib/connectors/irpf/fixture";
import { DIRPF_DISCARDED_RECORDS } from "@/lib/connectors/irpf/layout";
import type { PortfolioAsset } from "@/types";

function b3Petr(): PortfolioAsset {
  return {
    id: "b3-petr",
    ticker: "PETR4",
    name: "Petrobras",
    assetClass: "stocks",
    quantity: 200,
    currentPrice: 38.12,
    costBasis: 32,
    currency: "BRL",
    nativeCurrency: "BRL",
    allocation: 0,
    source: "B3_API",
    asOf: "2026-09-18",
    ownership: "holder",
    allowSale: false,
    liquidity: "liquid",
  };
}

describe("IRPF .DBK parser", () => {
  const parsed = parseIrpfFile(IRPF_FIXTURE_DBK, { fileName: "IRPF-2025.dbk" });
  const allowlisted = parsed.allowlisted;
  const persistedJson = JSON.stringify(parsed.persisted);

  it("reads the published header and allowlisted records", () => {
    expect(allowlisted.exercicio).toBe("2025");
    expect(allowlisted.anoBase).toBe("2024");
    expect(allowlisted.displayName).toBe("MARIA SILVA");
    expect(allowlisted.nit).toBe("12345678901");
    expect(allowlisted.incomes.some((i) => i.kind === "pj" && i.amountCents === IRPF_FIXTURE_PJ_CENTS)).toBe(
      true
    );
    expect(allowlisted.privatePensionContributionCents).toBe(IRPF_FIXTURE_PREVPRIV_CENTS);
    expect(allowlisted.assets.some((a) => a.code === "12" && a.currentCents === IRPF_FIXTURE_HOME_CENTS)).toBe(
      true
    );
    expect(allowlisted.assets.some((a) => a.code === "72" && a.currentCents === IRPF_FIXTURE_PGBL_CENTS)).toBe(
      true
    );
  });

  it("registro 26 never appears in persisted state", () => {
    expect(DIRPF_DISCARDED_RECORDS.has("26")).toBe(true);
    expect(allowlisted.discardedRecord26).toBe(1);
    expect(persistedJson).not.toMatch(/"26"/);
    expect(Object.keys(parsed.persisted).join(",")).not.toContain("26");
    expect(persistedJson).not.toContain(IRPF_FIXTURE_DOCTOR);
    expect(persistedJson).not.toContain(IRPF_FIXTURE_CLINIC);
    expect(persistedJson).not.toContain("VIDA PLENA");
    expect(persistedJson.toLowerCase()).not.toContain("medico");
    expect(persistedJson.toLowerCase()).not.toContain("clínica");
    expect(persistedJson.toLowerCase()).not.toContain("clinica");
    expect(persistedJson).not.toContain(IRPF_FIXTURE_CPF);
    expect(persistedJson).not.toContain("strip-me@example.com");
    expect(persistedJson).not.toContain("NAO PERSISTIR ENDERECO");
  });

  it("suggests manual holdings and does not overwrite B3", () => {
    const asOf = irpfAsOf(allowlisted, "2024-12-31");
    const incoming = suggestIrpfHoldings(allowlisted, [b3Petr()], asOf);
    expect(incoming.every((h) => h.source === "FILE_IRPF")).toBe(true);
    expect(incoming.some((h) => h.manualKind === "home")).toBe(true);
    expect(incoming.some((h) => h.manualKind === "vehicle")).toBe(true);
    expect(incoming.some((h) => h.manualKind === "pgbl")).toBe(true);
    expect(incoming.some((h) => h.manualKind === "cash")).toBe(true);
    expect(incoming.some((h) => h.ticker.includes("PETR"))).toBe(false);

    const merged = applyIrpfHoldings({ existing: [b3Petr()], incoming });
    const petr = merged.find((h) => h.ticker === "PETR4")!;
    expect(petr.source).toBe("B3_API");
    expect(petr.currentPrice).toBe(38.12);
    expect(merged.some((h) => h.source === "FILE_IRPF" && h.manualKind === "home")).toBe(
      true
    );
  });

  it("reimport is idempotent on externalRef", () => {
    const asOf = irpfAsOf(allowlisted, "2024-12-31");
    const first = suggestIrpfHoldings(allowlisted, [], asOf);
    const second = applyIrpfHoldings({
      existing: first,
      incoming: suggestIrpfHoldings(allowlisted, first, asOf),
    });
    expect(second.filter((h) => h.source === "FILE_IRPF").map((h) => h.id).sort()).toEqual(
      first.map((h) => h.id).sort()
    );
  });
});
