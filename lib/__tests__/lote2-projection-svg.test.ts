import { createHash } from "node:crypto";
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

/** SHA-256 of the uploaded pure SVG chart — do not restyle this file. */
const UPLOADED_SVG_SHA256 =
  "808581f1b441928875197f242ea2c18513bbc83eecf9d4537c2735e42811559a";

describe("lote 2 pure SVG ProjectionChart", () => {
  it("keeps components/ProjectionChart.tsx identical to the uploaded SVG", () => {
    const bytes = readFileSync("components/ProjectionChart.tsx");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      UPLOADED_SVG_SHA256
    );
    const chart = bytes.toString("utf8");
    expect(chart).toContain("viewBox={`0 0 ${width} ${height}`}");
    expect(chart).toContain('id="gAportes"');
    expect(chart).toContain('id="gRend"');
    expect(chart).toContain('id="gSaques"');
    expect(chart).toContain('stopColor="#93C5FD"');
    expect(chart).toContain('stopColor="#FCD34D"');
    expect(chart).toContain('stopColor="#FCA5A5"');
    expect(chart).toContain('stroke="#0F766E"');
    expect(chart).toContain("areaPath('aportes')");
    expect(chart).toContain("areaPath('rendimentos')");
    expect(chart).toContain("areaPath('saques')");
    expect(chart).toContain("currency = 'R$'");
    expect(chart).not.toContain("recharts");
    expect(chart).not.toContain("ComposedChart");
    expect(chart).not.toContain("densifyJourney");
  });

  it("maps the live calculator series 1:1 into the SVG data array", () => {
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

  it("wires data and the active currency symbol into FreedomCalculator", () => {
    expect(CURRENCY_SYMBOLS.BRL).toBe("R$");
    expect(CURRENCY_SYMBOLS.USD).toBe("$");
    expect(CURRENCY_SYMBOLS.EUR).toBe("€");

    const calc = readFileSync(
      "components/calculators/FreedomCalculator.tsx",
      "utf8"
    );
    expect(calc).toContain('from "@/components/ProjectionChart"');
    expect(calc).toContain("toProjectionChartData(series)");
    expect(calc).toContain("const data = useMemo(() => toProjectionChartData(series), [series]);");
    expect(calc).toContain("const symbol = CURRENCY_SYMBOLS[currency];");
    expect(calc).toContain("<ProjectionChart data={data} currency={symbol} />");
    expect(calc).toContain('name="idade"');
    expect(calc).toContain('name="reserva"');
    expect(calc).toContain('name="aporte"');
    expect(calc).toContain('name="gasto"');
    expect(calc).toContain('name="alvo"');
    expect(calc).toContain('name="juro"');
    expect(calc).toContain('name="saque"');
    expect(calc).toContain("NumberField");
    expect(calc).not.toContain("FreedomProjectionChart");
    expect(calc).not.toContain("locale={locale}");
    expect(calc).not.toContain("peakTitle=");
    expect(calc).not.toContain("axisAgeLabel=");
  });
});
