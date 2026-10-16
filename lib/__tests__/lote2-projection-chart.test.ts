import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  freedomChartSeries,
  toProjectionChartData,
} from "@/lib/calculators/chartSeries";
import {
  FREEDOM_DEFAULTS,
  solveFreedomDate,
} from "@/lib/calculators/independence";

describe("lote 2 ProjectionChart on the freedom calculator", () => {
  it("maps the real yearly series without inventing numbers", () => {
    const solved = solveFreedomDate(FREEDOM_DEFAULTS);
    const { result, series } = freedomChartSeries(FREEDOM_DEFAULTS);
    expect(result).toEqual(solved);
    const data = toProjectionChartData(series);
    expect(data).toHaveLength(series.length);
    for (let i = 0; i < series.length; i++) {
      expect(data[i].age).toBe(series[i].age);
      expect(data[i].aportes).toBe(series[i].contributions);
      expect(data[i].rendimentos).toBe(series[i].returns);
      expect(data[i].saques).toBe(series[i].withdrawals);
      expect(data[i].patrimonio).toBe(series[i].wealth);
    }
  });

  it("recomputes the mapped series when an existing field changes", () => {
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
  });

  it("mounts ProjectionChart on the public calculator with the data array", () => {
    const calc = readFileSync(
      "components/calculators/FreedomCalculator.tsx",
      "utf8"
    );
    expect(calc).toContain('from "@/components/ProjectionChart"');
    expect(calc).toContain("toProjectionChartData(series)");
    expect(calc).toContain("<ProjectionChart");
    expect(calc).toContain("data={data}");
    expect(calc).toContain("NumberField");
    expect(calc).not.toContain("FreedomProjectionChart");

    expect(calc).toContain("currency={symbol}");
    expect(calc).toContain("CURRENCY_SYMBOLS[currency]");

    const chart = readFileSync("components/ProjectionChart.tsx", "utf8");
    expect(chart).toContain("export function ProjectionChart");
    expect(chart).toContain("data: Point[]");
    expect(chart).toContain("currency = 'R$'");
    expect(chart).toContain("areaPath('aportes')");
    expect(chart).toContain("areaPath('rendimentos')");
    expect(chart).toContain("areaPath('saques')");
    expect(chart).toContain("d.patrimonio");
    expect(chart).toContain("viewBox={`0 0 ${width} ${height}`}");
    expect(chart).not.toContain("recharts");
    expect(chart).not.toContain("BarChart");
    expect(chart).not.toContain("<Bar");
  });
});
