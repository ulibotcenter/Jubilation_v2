import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  freedomChartSeries,
  freedomProjection,
  stackFreedomChart,
} from "@/lib/calculators/chartSeries";
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
    expect(FREEDOM_AREA_COLORS.line).toBe("#0F766E");
    expect(FREEDOM_AREA_COLORS.contributions).toBe("#A3B9C9");
    expect(FREEDOM_AREA_COLORS.returns).toBe("#D6C190");
    expect(FREEDOM_AREA_COLORS.withdrawals).toBe("#DDB0AB");
  });

  it("stacks visual layers under wealth, with coral only after freedom", () => {
    const { years, freedomAge } = freedomProjection(FREEDOM_DEFAULTS);
    const series = stackFreedomChart(years, freedomAge);
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
    const { years, freedomAge } = freedomProjection(FREEDOM_DEFAULTS);
    const series = stackFreedomChart(years, freedomAge);
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
    const rawPeak = Math.max(...wealth);
    const paintPeak = Math.max(...plot.map((point) => point.lineY));
    expect(paintPeak).toBeLessThan(rawPeak);
    expect(paintPeak / rawPeak).toBeGreaterThan(0.92);
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
    expect(chart).toContain('dataKey="lineY"');
    expect(chart).toContain("linearGradient");
    expect(chart).toContain("stopOpacity");
    expect(chart).toContain("densifyMonotone(series, 12)");
    expect(chart).not.toContain("CartesianGrid");
    expect(chart).not.toContain("BarChart");
    expect(chart).not.toContain("<Bar");
    expect(chart).toContain('data-chart-curve="monotone"');

    const calc = readFileSync("components/calculators/FreedomCalculator.tsx", "utf8");
    expect(calc).toContain("useMemo(\n    () => freedomChartSeries(input)");
    expect(calc).toContain("ProjectionChart");
    const form = readFileSync("components/calculators/CalculatorForm.tsx", "utf8");
    expect(form).toContain("NumberField");
  });
});
