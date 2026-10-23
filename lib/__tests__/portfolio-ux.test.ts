import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ASSUMPTIONS } from "@/lib/engine/assumptions";
import { t } from "@/lib/i18n/messages";
import { createModelSeed } from "@/lib/onboarding/seed";
import {
  attachDisplayScenarioLines,
  buildDisplayChartData,
} from "@/lib/projectionChartData";
import { generateExtendedProjections } from "@/lib/projectionsExtended";
import { parseFreedomInput } from "@/lib/calculators/parse";
import {
  DEFAULT_KPI_VALUES,
  generateChartData,
  normalizeKpiValues,
} from "@/types";

describe("portfolio UX pass", () => {
  it("raises the real-return slider max to 20 without changing the default", () => {
    expect(ASSUMPTIONS.realReturn.defaultValue).toBe(4);
    expect(ASSUMPTIONS.realReturn.min).toBe(-5);
    expect(ASSUMPTIONS.realReturn.max).toBeGreaterThanOrEqual(20);
    expect(ASSUMPTIONS.realReturn.step).toBe(0.1);
  });

  it("lets 15% sit on the scale and still clamps 40%", () => {
    expect(parseFreedomInput({ juro: "15" }).realReturn).toBe(0.15);
    expect(parseFreedomInput({ juro: "40" }).realReturn).toBe(0.2);
  });

  it("keeps the international demo book for new users", () => {
    const seed = createModelSeed();
    expect(seed.length).toBeGreaterThanOrEqual(7);
    expect(seed.length).toBeLessThanOrEqual(10);
    expect(seed.map((a) => a.ticker)).toEqual([
      "BTC",
      "CASA",
      "AAPL",
      "SPCX",
      "GOVT",
      "PETR4",
      "GLD",
    ]);
    expect(seed.some((a) => a.id.startsWith("seed-"))).toBe(true);
  });

  it("explains CAGR, P&L, ETF and REIT in PT, EN and ES", () => {
    expect(t("pt", "term.cagr.hint")).toMatch(/anual/i);
    expect(t("en", "term.cagr.hint")).toMatch(/annual/i);
    expect(t("es", "term.cagr.hint")).toMatch(/anual/i);
    expect(t("pt", "term.pnl.hint")).toMatch(/lucro|prejuízo/i);
    expect(t("en", "term.pnl.hint")).toMatch(/profit|loss/i);
    expect(t("es", "term.pnl.hint")).toMatch(/ganancia|pérdida/i);
    expect(t("pt", "term.etf.hint")).toMatch(/fundo|bolsa/i);
    expect(t("en", "term.etf.hint")).toMatch(/exchange-traded|fund/i);
    expect(t("es", "term.etf.hint")).toMatch(/fondo|cotizado/i);
    expect(t("pt", "term.reit.hint")).toMatch(/imobili/i);
    expect(t("en", "term.reit.hint")).toMatch(/real estate/i);
    expect(t("es", "term.reit.hint")).toMatch(/inmobili/i);
  });

  it("hides B3 and IR CTAs outside Portuguese and keeps PT labels", () => {
    const b3 = readFileSync("components/portfolio/ConnectB3Button.tsx", "utf8");
    const ir = readFileSync("components/portfolio/ImportIrpfButton.tsx", "utf8");
    const portfolio = readFileSync(
      "components/dashboard/RealPortfolio.tsx",
      "utf8"
    );
    expect(b3).toContain('locale !== "pt"');
    expect(b3).not.toContain("data-b3-status");
    expect(ir).toContain('locale !== "pt"');
    expect(portfolio).toContain('locale === "pt"');
    expect(t("pt", "portfolio.updateB3")).toBe("Atualizar B3");
    expect(t("pt", "dashboard.origins.cta.importIrpf")).toBe(
      "Importar IRPF"
    );
  });

  it("moves data sources to the holdings table, not under the buttons", () => {
    const portfolio = readFileSync(
      "components/dashboard/RealPortfolio.tsx",
      "utf8"
    );
    const table = readFileSync(
      "components/dashboard/PortfolioHoldingsTable.tsx",
      "utf8"
    );
    expect(portfolio).not.toContain("portfolio-toolbar-meta");
    expect(portfolio).not.toContain('t("portfolio.dataSources")');
    expect(table).toContain('data-portfolio-sources="table"');
    expect(table).toContain("portfolio.dataSources");
  });

  it("paints display scenario lines without changing the base path", () => {
    const kpis = normalizeKpiValues({
      ...DEFAULT_KPI_VALUES,
      currentAge: 40,
      retirementAge: 60,
      lifeExpectancy: 90,
      currentNetWorth: 200_000,
      monthlyContribution: 2_000,
      expectedCAGR: 6,
    });
    const projections = generateExtendedProjections(kpis);
    const base = generateChartData(projections);
    const display = buildDisplayChartData(base, projections, kpis);
    const mid = display[Math.floor(display.length / 2)]!;
    expect(display[0]?.value).toBe(base[0]?.value);
    expect(mid.value).toBe(base[Math.floor(base.length / 2)]?.value);
    expect(mid.pessimistic).toBeLessThan(mid.value);
    expect(mid.optimistic).toBeGreaterThan(mid.value);
    const attached = attachDisplayScenarioLines(base);
    expect(attached[0]?.pessimistic).toBe(attached[0]?.value);
  });
});
