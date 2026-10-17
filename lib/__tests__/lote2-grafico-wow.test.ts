import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  freedomChartSeries,
  freedomProjection,
  toProjectionChartData,
} from "@/lib/calculators/chartSeries";
import { FREEDOM_DEFAULTS } from "@/lib/calculators/independence";
import { densifyHill } from "@/lib/calculators/smoothPlot";

describe("lote 2 rounded hill under the wealth line", () => {
  it("partitions real flows so the three bands sum to patrimonio", () => {
    const { years } = freedomProjection(FREEDOM_DEFAULTS);
    const { series, freedomAge } = freedomChartSeries(FREEDOM_DEFAULTS);
    expect(series).toHaveLength(years.length);
    for (let i = 0; i < series.length; i++) {
      expect(series[i]!.wealth).toBe(years[i]!.portfolioValue);
      expect(
        series[i]!.contributions + series[i]!.returns + series[i]!.withdrawals
      ).toBeCloseTo(Math.max(0, series[i]!.wealth), 6);
      if (series[i]!.age < freedomAge) {
        expect(series[i]!.withdrawals).toBe(0);
      }
    }
    const atFreedom = series.find((point) => point.age === freedomAge)!;
    const later = series.find((point) => point.age === freedomAge + 8)!;
    expect(atFreedom.withdrawals).toBeGreaterThan(0);
    expect(later.withdrawals / later.wealth).toBeGreaterThan(
      atFreedom.withdrawals / atFreedom.wealth
    );
    const data = toProjectionChartData(series);
    expect(data[0]!.patrimonio).toBe(series[0]!.wealth);
    expect(data.at(-1)!.aportes + data.at(-1)!.rendimentos + data.at(-1)!.saques).toBeCloseTo(
      data.at(-1)!.patrimonio,
      6
    );
  });

  it("keeps integer ages on the real balance and rounds the crest between them", () => {
    const { series } = freedomChartSeries(FREEDOM_DEFAULTS);
    const plot = densifyHill(series, 24);
    expect(plot.length).toBeGreaterThan(series.length * 8);
    for (const point of series) {
      const knot = plot.find((sample) => sample.age === point.age);
      expect(knot?.lineY).toBeCloseTo(Math.max(0, point.wealth), 6);
      expect(knot?.goldTop).toBeCloseTo(knot!.lineY, 6);
      expect(knot!.blueTop).toBeLessThanOrEqual(knot!.lineY + 1e-6);
      expect(knot!.coral).toBeLessThanOrEqual(knot!.blueTop + 1e-6);
    }
    for (const point of plot) {
      expect(point.contributions + point.returns + point.withdrawals).toBeCloseTo(
        point.lineY,
        4
      );
      expect(point.goldTop).toBeLessThanOrEqual(point.lineY + 1e-6);
      expect(point.blueTop).toBeLessThanOrEqual(point.goldTop + 1e-6);
      expect(point.coral).toBeLessThanOrEqual(point.blueTop + 1e-6);
    }
    const rawPeak = Math.max(...series.map((point) => point.wealth));
    const paintPeak = Math.max(...plot.map((point) => point.lineY));
    expect(paintPeak).toBeCloseTo(rawPeak, 4);
    const crest = series.reduce((best, point) =>
      point.wealth > best.wealth ? point : best
    );
    const before = series.find((point) => point.age === crest.age - 1)!;
    const half = plot.find((point) => Math.abs(point.age - (crest.age - 0.5)) < 1e-9);
    const chord = (before.wealth + crest.wealth) / 2;
    expect(half).toBeTruthy();
    expect(half!.lineY).toBeGreaterThan(chord);
    expect(half!.lineY).toBeLessThanOrEqual(crest.wealth + 1e-6);
  });

  it("draws the hill on the calculator page, not bars or the uploaded svg", () => {
    const chart = readFileSync("components/ProjectionChart.tsx", "utf8");
    expect(chart).toContain("densifyHill");
    expect(chart).toContain("clipPath");
    expect(chart).toContain('data-chart-curve="monotone"');
    expect(chart).toContain('data-marker="peak"');
    expect(chart).toContain('data-marker="freedom"');
    expect(chart).toContain('data-marker="end"');
    expect(chart).toContain("point.patrimonio");
    expect(chart).not.toContain("BarChart");
    expect(chart).not.toContain("<Bar");
    expect(chart).not.toContain('id="gAportes"');
    const calc = readFileSync("components/calculators/FreedomCalculator.tsx", "utf8");
    expect(calc).toContain("freedomAge={freedomAge}");
    expect(calc).toContain("NumberField");
  });
});
