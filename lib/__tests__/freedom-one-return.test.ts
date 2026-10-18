import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { freedomChartSeries } from "@/lib/calculators/chartSeries";
import { shareRealReturn } from "@/lib/calculators/independence";
import {
  parseFreedomInflationPercent,
  parseFreedomInput,
} from "@/lib/calculators/parse";
import {
  ASSUMPTIONS,
  DEFAULT_PORTFOLIO_REAL_RETURN,
} from "@/lib/engine/assumptions";
import { t } from "@/lib/i18n/messages";

describe("quando fico livre — one return and visible inflation", () => {
  it("feeds the same growth percent into both phases", () => {
    const split = parseFreedomInput({ juro: "4", saque: "2" });
    const shared = shareRealReturn(split);
    expect(split.realReturn).toBeCloseTo(0.04);
    expect(split.withdrawalRealReturn).toBeCloseTo(0.02);
    expect(shared.realReturn).toBe(shared.withdrawalRealReturn);
    expect(shared.withdrawalRealReturn).toBeCloseTo(0.04);

    const splitChart = freedomChartSeries(split);
    const sharedChart = freedomChartSeries(shared);
    expect(sharedChart.freedomAge).toBeLessThan(splitChart.freedomAge);
    expect(sharedChart.series.map((point) => point.wealth)).not.toEqual(
      splitChart.series.map((point) => point.wealth)
    );
  });

  it("leaves the freedom age and the chart series alone when inflation changes", () => {
    expect(ASSUMPTIONS.inflation.defaultValue).toBe(3);
    expect(parseFreedomInflationPercent({})).toBe(3);
    expect(parseFreedomInflationPercent({ inflacao: "0" })).toBe(0);
    expect(parseFreedomInflationPercent({ inflacao: "8,5" })).toBe(8.5);

    const atThree = freedomChartSeries(shareRealReturn(parseFreedomInput({})));
    const atEight = freedomChartSeries(
      shareRealReturn(parseFreedomInput({ inflacao: "8" }))
    );
    expect(atThree.result.value).toBe(atEight.result.value);
    expect(atThree.freedomAge).toBe(atEight.freedomAge);
    expect(atThree.series).toEqual(atEight.series);
    expect(atThree.series[0]?.wealth).toBeGreaterThan(0);
  });

  it("defaults the visible rate to the product real return, not a second deflator", () => {
    const shared = shareRealReturn(parseFreedomInput({}));
    expect(shared.realReturn).toBe(DEFAULT_PORTFOLIO_REAL_RETURN);
    expect(shared.realReturn).toBe(0.04);
    expect(shared).not.toHaveProperty("inflation");
  });

  it("shows one return field, inflation, and the monthly freedom label", () => {
    const calc = readFileSync(
      "components/calculators/FreedomCalculator.tsx",
      "utf8"
    );
    expect(calc).toContain('name="juro"');
    expect(calc).toContain('name="inflacao"');
    expect(calc).toContain('name="gasto"');
    expect(calc).not.toContain('name="saque"');
    expect(calc).not.toContain("withdrawRate");
    expect(calc).toContain("shareRealReturn");
    expect(calc).not.toContain("inflacao: String");
    expect(t("pt", "calc.freedom.inflationHint")).toMatch(/acima desta inflação/);
    expect(t("pt", "calc.freedom.inflationHint")).toMatch(/dinheiro de hoje/);
    expect(t("en", "calc.freedom.inflationHint")).toMatch(/already above this inflation/);
    expect(t("es", "calc.freedom.inflationHint")).toMatch(
      /por encima de esta inflación/
    );
    expect(t("pt", "calc.freedom.slider.spend")).toBe("Valor desejado de saque");
  });
});
