import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { freedomChartSeries } from "@/lib/calculators/chartSeries";
import {
  FREEDOM_DEFAULTS,
  solveFreedomDate,
} from "@/lib/calculators/independence";
import {
  densifyMonotone,
  layersUnderWealth,
} from "@/lib/calculators/smoothPlot";
import { FREEDOM_AREA_COLORS } from "@/lib/chartColors";

describe("lote 2 premium monotone freedom chart", () => {
  it("keeps the same projection numbers as the current solver", () => {
    const solved = solveFreedomDate(FREEDOM_DEFAULTS);
    const { result, series, freedomAge } = freedomChartSeries(FREEDOM_DEFAULTS);
    expect(result).toEqual(solved);
    expect(freedomAge).toBe(Math.round(solved.value));
    expect(series.every((point) => Number.isFinite(point.wealth))).toBe(true);
  });

  it("uses the requested teal line and translucent stacked fills", () => {
    expect(FREEDOM_AREA_COLORS).toEqual({
      line: "#0F766E",
      contributions: "#93C5FD",
      returns: "#FCD34D",
      withdrawals: "#FCA5A5",
      contribFrom: 0.5,
      contribTo: 0.1,
      returnsFrom: 0.42,
      returnsTo: 0.08,
      withdrawFrom: 0.48,
      withdrawTo: 0.1,
      cursor: "rgba(15, 118, 110, 0.18)",
    });
  });

  it("stacks visual layers under wealth, with coral only after freedom", () => {
    const { series, freedomAge } = freedomChartSeries(FREEDOM_DEFAULTS);
    for (const point of series) {
      const layers = layersUnderWealth(point);
      expect(layers.blueTop + (layers.goldTop - layers.blueTop) + layers.coral).toBeCloseTo(
        point.wealth,
        6
      );
      expect(layers.blueTop).toBeLessThanOrEqual(layers.goldTop + 1e-9);
      expect(layers.goldTop).toBeLessThanOrEqual(point.wealth + 1e-9);
      if (point.age < freedomAge) {
        expect(layers.coral).toBe(0);
        expect(layers.goldTop).toBeCloseTo(point.wealth, 6);
      }
    }
    const after = series.filter((point) => point.age > freedomAge);
    expect(after.some((point) => layersUnderWealth(point).coral > 0)).toBe(true);
  });

  it("densifies yearly knots into a smoother monotone path", () => {
    const { series } = freedomChartSeries(FREEDOM_DEFAULTS);
    const plot = densifyMonotone(series, 12);
    expect(plot.length).toBeGreaterThan(series.length * 8);
    for (const point of series) {
      const knot = plot.find((sample) => sample.age === point.age);
      expect(knot?.wealth).toBeCloseTo(point.wealth, 6);
      expect(knot?.contributions).toBeCloseTo(point.contributions, 6);
    }
    const wealth = plot.map((point) => point.wealth);
    const peakAt = wealth.indexOf(Math.max(...wealth));
    expect(peakAt).toBeGreaterThan(4);
    expect(peakAt).toBeLessThan(wealth.length - 4);
  });

  it("paints three monotone gradient areas under a teal wealth line, not bars", () => {
    const chart = readFileSync(
      "components/calculators/FreedomProjectionChart.tsx",
      "utf8"
    );
    expect(chart).toContain("ComposedChart");
    expect(chart).toContain('type="monotone"');
    expect(chart).toContain('dataKey="blueTop"');
    expect(chart).toContain('dataKey="goldTop"');
    expect(chart).toContain('dataKey="wealth"');
    expect(chart).toContain("linearGradient");
    expect(chart).toContain("stopOpacity");
    expect(chart).toContain("densifyMonotone(series, 12)");
    expect(chart).not.toContain("CartesianGrid");
    expect(chart).not.toContain("BarChart");
    expect(chart).not.toContain("<Bar");
    expect(chart).toContain('data-chart-curve="monotone"');

    const calc = readFileSync("components/calculators/FreedomCalculator.tsx", "utf8");
    expect(calc).toContain("useMemo(\n    () => freedomChartSeries(input)");
    expect(calc).toContain("FreedomProjectionChart");
    const form = readFileSync("components/calculators/CalculatorForm.tsx", "utf8");
    expect(form).toContain("NumberField");
  });
});
