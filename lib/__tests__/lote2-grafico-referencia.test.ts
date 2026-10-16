import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  freedomChartSeries,
  freedomProjection,
  stackFreedomChart,
  toProjectionChartData,
} from "@/lib/calculators/chartSeries";
import {
  FREEDOM_DEFAULTS,
  solveFreedomDate,
} from "@/lib/calculators/independence";
import { densifyJourney, layersJourney } from "@/lib/calculators/smoothPlot";
import { FREEDOM_AREA_COLORS } from "@/lib/chartColors";
import { t } from "@/lib/i18n/messages";

describe("lote 2 reference chart stacks under the wealth line", () => {
  it("keeps the same solver numbers on the wealth line", () => {
    const solved = solveFreedomDate(FREEDOM_DEFAULTS);
    const { result, series, freedomAge } = freedomChartSeries(FREEDOM_DEFAULTS);
    const { years } = freedomProjection(FREEDOM_DEFAULTS);
    expect(result).toEqual(solved);
    expect(freedomAge).toBe(Math.round(solved.value));
    expect(series).toHaveLength(years.length);
    for (let i = 0; i < series.length; i++) {
      expect(series[i]!.age).toBe(years[i]!.age);
      expect(series[i]!.wealth).toBe(years[i]!.portfolioValue);
    }
  });

  it("maps layers without inventing wealth", () => {
    const { series } = freedomChartSeries(FREEDOM_DEFAULTS);
    const data = toProjectionChartData(series);
    expect(data).toHaveLength(series.length);
    for (let i = 0; i < series.length; i++) {
      expect(data[i]!.patrimonio).toBe(series[i]!.wealth);
      expect(data[i]!.aportes).toBe(series[i]!.contributions);
      expect(data[i]!.rendimentos).toBe(series[i]!.returns);
      expect(data[i]!.saques).toBe(series[i]!.withdrawals);
    }
  });

  it("keeps drawn layers summing to patrimonio, with coral only in freedom", () => {
    const { series, freedomAge } = freedomChartSeries(FREEDOM_DEFAULTS);
    const accumulating = series.filter((point) => point.age < freedomAge);
    const after = series.filter((point) => point.age > freedomAge);
    expect(accumulating.every((point) => point.withdrawals === 0)).toBe(true);
    expect(after.length).toBeGreaterThan(2);
    expect(after.every((point) => point.withdrawals > 0)).toBe(true);

    for (const point of series) {
      expect(
        point.contributions + point.returns + point.withdrawals
      ).toBeCloseTo(Math.max(0, point.wealth), 6);
      expect(point.contributions).toBeGreaterThanOrEqual(0);
      expect(point.returns).toBeGreaterThanOrEqual(0);
      expect(point.withdrawals).toBeGreaterThanOrEqual(0);
      expect(point.contributions + point.returns + point.withdrawals).toBeLessThanOrEqual(
        Math.max(0, point.wealth) + 1e-6
      );
    }

    const last = series.at(-1)!;
    const peak = series.reduce((best, point) =>
      point.wealth > best.wealth ? point : best
    );
    expect(last.wealth).toBeGreaterThan(0);
    expect(last.wealth).toBeLessThan(peak.wealth);
    expect(last.contributions).toBeLessThanOrEqual(last.wealth + 1e-6);
    expect(last.contributions + last.returns).toBeLessThanOrEqual(
      last.wealth + 1e-6
    );
  });

  it("does not keep remaining-stock bands elevated above the line", () => {
    const { years, freedomAge } = freedomProjection(FREEDOM_DEFAULTS);
    const stacked = stackFreedomChart(years, freedomAge);
    const under = freedomChartSeries(FREEDOM_DEFAULTS).series;
    const lastStacked = stacked.at(-1)!;
    const lastUnder = under.at(-1)!;
    expect(lastStacked.contributions + lastStacked.returns).toBeCloseTo(
      lastStacked.wealth,
      6
    );
    expect(
      lastUnder.contributions + lastUnder.returns + lastUnder.withdrawals
    ).toBeCloseTo(lastUnder.wealth, 6);
    expect(lastUnder.contributions + lastUnder.returns).toBeLessThanOrEqual(
      lastUnder.wealth + 1e-6
    );
  });

  it("recomputes the stack when an existing field changes", () => {
    const low = toProjectionChartData(
      freedomChartSeries({
        ...FREEDOM_DEFAULTS,
        monthlyContribution: 2_000,
      }).series
    );
    const high = toProjectionChartData(
      freedomChartSeries({
        ...FREEDOM_DEFAULTS,
        monthlyContribution: 6_000,
      }).series
    );
    expect(high.at(-1)!.patrimonio).toBeGreaterThan(low.at(-1)!.patrimonio);
    expect(high.at(-1)!.aportes).toBeGreaterThan(low.at(-1)!.aportes);
  });

  it("densifies a rounded peak with the gold band riding the line", () => {
    const { series, freedomAge } = freedomChartSeries(FREEDOM_DEFAULTS);
    const plot = densifyJourney(series, 12);
    expect(plot.length).toBeGreaterThan(series.length * 8);
    for (const point of series) {
      const layers = layersJourney(point);
      expect(layers.goldTop).toBeCloseTo(point.wealth, 6);
      expect(layers.blueTop).toBeLessThanOrEqual(layers.goldTop + 1e-6);
      expect(layers.coral).toBeLessThanOrEqual(layers.blueTop + 1e-6);
    }
    for (const point of plot) {
      expect(point.goldTop).toBeCloseTo(point.lineY, 6);
      expect(point.goldTop).toBeLessThanOrEqual(point.lineY + 1e-6);
      expect(point.blueTop).toBeLessThanOrEqual(point.goldTop + 1e-6);
      expect(point.coral).toBeLessThanOrEqual(point.blueTop + 1e-6);
      expect(
        point.contributions + point.returns + point.withdrawals
      ).toBeCloseTo(point.lineY, 4);
      if (point.age < freedomAge) {
        expect(point.coral).toBeLessThanOrEqual(1e-6);
      }
    }
    expect(plot.some((point) => point.age > freedomAge && point.coral > 0)).toBe(
      true
    );
    const last = plot.at(-1)!;
    expect(last.goldTop).toBeCloseTo(last.lineY, 6);
    expect(last.coral).toBeGreaterThan(0);
    const paintPeak = Math.max(...plot.map((point) => point.lineY));
    const rawPeak = Math.max(...series.map((point) => point.wealth));
    expect(paintPeak).toBeLessThan(rawPeak);
    expect(paintPeak / rawPeak).toBeGreaterThan(0.86);
  });

  it("paints the reference chrome on ProjectionChart, not bars", () => {
    expect(FREEDOM_AREA_COLORS.line).toBe("#0F766E");
    expect(FREEDOM_AREA_COLORS.contributions).toBe("#A3B9C9");
    expect(FREEDOM_AREA_COLORS.returns).toBe("#D6C190");
    expect(FREEDOM_AREA_COLORS.withdrawals).toBe("#DDB0AB");

    const chart = readFileSync("components/ProjectionChart.tsx", "utf8");
    expect(chart).toContain("ComposedChart");
    expect(chart).toContain('type="monotone"');
    expect(chart).toContain("CartesianGrid");
    expect(chart).toContain("ReferenceDot");
    expect(chart).toContain("ReferenceLine");
    expect(chart).toContain("densifyJourney");
    expect(chart).toContain('data-chart-layout="reference"');
    expect(chart).toContain("projection-chart-title");
    expect(chart).toContain("projection-chart-legend");
    expect(chart).toContain("projection-chart-footer");
    expect(chart).not.toContain("BarChart");
    expect(chart).not.toContain("<Bar");

    const calc = readFileSync(
      "components/calculators/FreedomCalculator.tsx",
      "utf8"
    );
    expect(calc).toContain('from "@/components/ProjectionChart"');
    expect(calc).toContain("toProjectionChartData(series)");
    expect(calc).toContain("NumberField");
    expect(calc).toContain('t("calc.freedom.chart.title")');

    expect(t("pt", "calc.freedom.chart.title")).toBe("SEU FUTURO FINANCEIRO");
    expect(t("pt", "calc.freedom.chart.subtitle")).toBe(
      "Patrimônio ao longo do tempo"
    );
    expect(t("pt", "calc.freedom.chart.axisAge")).toBe("IDADE");
    expect(t("pt", "calc.freedom.chart.footer")).toBe("Feito para o seu futuro");
    expect(t("en", "calc.freedom.chart.contributionsHint")).toBe(
      "(what you add)"
    );
  });
});
