import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { t } from "@/lib/i18n/messages";

describe("simulation layout pass", () => {
  const page = readFileSync(
    "components/simulation/SimulationPlaygroundPage.tsx",
    "utf8"
  );

  it("places the chart right after the assumption cards and income after the chart", () => {
    const cardsAt = page.indexOf('<KPICards mode="playground"');
    const chartAt = page.indexOf("<ProjectionChartCard");
    const incomeAt = page.indexOf("<IncomeGoalPanel");
    const diffAt = page.indexOf("<PlaygroundDiffPanel");
    expect(cardsAt).toBeGreaterThan(-1);
    expect(chartAt).toBeGreaterThan(cardsAt);
    expect(incomeAt).toBeGreaterThan(chartAt);
    expect(diffAt).toBeGreaterThan(incomeAt);
  });

  it("places vs-real and premises between the chart and the asset table", () => {
    const chartAt = page.indexOf("<ProjectionChartCard");
    const diffAt = page.indexOf("<PlaygroundDiffPanel");
    const tableAt = page.indexOf('id="playground-portfolio"');
    expect(chartAt).toBeGreaterThan(-1);
    expect(diffAt).toBeGreaterThan(chartAt);
    expect(tableAt).toBeGreaterThan(diffAt);
  });

  it("puts saved scenarios below the asset table and Monte Carlo last among blocks", () => {
    const tableAt = page.indexOf('id="playground-portfolio"');
    const scenariosAt = page.indexOf('data-sim-block="scenarios"');
    const simTabAt = page.indexOf("<SimulationTab");
    const footerAt = page.indexOf('data-sim-block="page-end"');
    expect(scenariosAt).toBeGreaterThan(tableAt);
    expect(simTabAt).toBeGreaterThan(scenariosAt);
    expect(footerAt).toBeGreaterThan(simTabAt);
    expect(page.indexOf("<PersistentDisclaimer")).toBeGreaterThan(simTabAt);
    expect(page.indexOf("playground-toolbar")).toBeGreaterThan(simTabAt);
  });

  it("explains Monte Carlo in PT, EN, and ES", () => {
    expect(t("pt", "monteCarlo.what")).toMatch(/futuros|faixa/i);
    expect(t("en", "monteCarlo.what")).toMatch(/range|futures/i);
    expect(t("es", "monteCarlo.what")).toMatch(/rango|futuros/i);
    expect(t("pt", "term.mc.hint")).toMatch(/Monte Carlo/i);
    expect(t("en", "term.mc.hint")).toMatch(/Monte Carlo/i);
    expect(t("es", "term.mc.hint")).toMatch(/Monte Carlo/i);
  });

  it("portals acronym tooltips above overlapping UI", () => {
    const hint = readFileSync("components/ui/TermHint.tsx", "utf8");
    expect(hint).toContain("createPortal");
    expect(hint).toContain("term-hint-tooltip--portal");
    expect(hint).toContain("onMouseLeave");
  });
});
