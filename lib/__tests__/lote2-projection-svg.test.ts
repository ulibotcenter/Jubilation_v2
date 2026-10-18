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
import { CURRENCY_SYMBOLS } from "@/types";

describe("lote 2 freedom chart replaces the uploaded SVG", () => {
  it("maps the live calculator series 1:1 into the chart data array", () => {
    const solved = solveFreedomDate(FREEDOM_DEFAULTS);
    const { result, series } = freedomChartSeries(FREEDOM_DEFAULTS);
    expect(result).toEqual(solved);
    const data = toProjectionChartData(series);
    expect(data).toHaveLength(series.length);
    for (let i = 0; i < series.length; i++) {
      expect(data[i]!.age).toBe(series[i]!.age);
      expect(data[i]!.aportes).toBe(series[i]!.contributions);
      expect(data[i]!.rendimentos).toBe(series[i]!.returns);
      expect(data[i]!.saques).toBe(series[i]!.withdrawals);
      expect(data[i]!.patrimonio).toBe(series[i]!.wealth);
    }
  });

  it("wires data, currency, and the freedom age into FreedomCalculator", () => {
    expect(CURRENCY_SYMBOLS.BRL).toBe("R$");
    expect(CURRENCY_SYMBOLS.USD).toBe("$");
    expect(CURRENCY_SYMBOLS.EUR).toBe("€");

    const calc = readFileSync(
      "components/calculators/FreedomCalculator.tsx",
      "utf8"
    );
    expect(calc).toContain('from "@/components/ProjectionChart"');
    expect(calc).toContain("toProjectionChartData(series)");
    expect(calc).toContain(
      "const data = useMemo(() => toProjectionChartData(series), [series]);"
    );
    expect(calc).toContain("const symbol = CURRENCY_SYMBOLS[currency];");
    expect(calc).toContain("data={data}");
    expect(calc).toContain("currency={symbol}");
    expect(calc).toContain("currencyCode={currency}");
    expect(calc).toContain("freedomAge={freedomAge}");
    expect(calc).toContain('name="idade"');
    expect(calc).toContain('name="reserva"');
    expect(calc).toContain('name="aporte"');
    expect(calc).toContain('name="gasto"');
    expect(calc).toContain('name="alvo"');
    expect(calc).toContain('name="juro"');
    expect(calc).toContain('name="inflacao"');
    expect(calc).not.toContain('name="saque"');
    expect(calc).toContain("NumberField");
    expect(calc).not.toContain("FreedomProjectionChart");

    const chart = readFileSync("components/ProjectionChart.tsx", "utf8");
    expect(chart).toContain("densifyHill");
    expect(chart).toContain("clipPath");
    expect(chart).not.toContain('id="gAportes"');
    expect(chart).not.toContain("areaPath('aportes')");
    expect(chart).not.toContain("recharts");
  });
});
