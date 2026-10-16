import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { freedomChartSeries } from "@/lib/calculators/chartSeries";
import {
  FREEDOM_DEFAULTS,
  solveFreedomDate,
} from "@/lib/calculators/independence";
import { FREEDOM_AREA_COLORS } from "@/lib/chartColors";

describe("lote 2 area + line freedom chart", () => {
  it("keeps the same projection numbers as the current solver", () => {
    const solved = solveFreedomDate(FREEDOM_DEFAULTS);
    const { result, series, freedomAge } = freedomChartSeries(FREEDOM_DEFAULTS);
    expect(result).toEqual(solved);
    expect(freedomAge).toBe(Math.round(solved.value));
    expect(series.every((point) => Number.isFinite(point.wealth))).toBe(true);
  });

  it("uses petrol teal, soft blue, gold, and coral", () => {
    expect(FREEDOM_AREA_COLORS.line).toBe("#0F766E");
    expect(FREEDOM_AREA_COLORS.contributions).toBe("#A3B9C9");
    expect(FREEDOM_AREA_COLORS.returns).toBe("#D6C190");
    expect(FREEDOM_AREA_COLORS.withdrawals).toBe("#DDB0AB");
  });

  it("does not use stacked bars on the freedom calculator chart", () => {
    const chart = readFileSync(
      "components/calculators/FreedomProjectionChart.tsx",
      "utf8"
    );
    expect(chart).toContain("ComposedChart");
    expect(chart).toContain("<Area");
    expect(chart).toContain("<Line");
    expect(chart).not.toContain("BarChart");
    expect(chart).not.toContain("<Bar");
    const calc = readFileSync("components/calculators/FreedomCalculator.tsx", "utf8");
    expect(calc).toContain("ProjectionChart");
    const form = readFileSync("components/calculators/CalculatorForm.tsx", "utf8");
    expect(form).toContain("NumberField");
  });
});
