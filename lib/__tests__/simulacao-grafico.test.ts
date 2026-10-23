import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  freedomChartSeries,
  freedomProjection,
  toProjectionChartData,
} from "@/lib/calculators/chartSeries";
import { FREEDOM_DEFAULTS } from "@/lib/calculators/independence";
import { simulationProjectionChartInput } from "@/lib/calculators/simulationChartAdapter";
import { DEFAULT_KPI_VALUES } from "@/types";

describe("simulation uses the public calculator chart", () => {
  it("keeps the public calculator on ProjectionChart without restyling it", () => {
    const calc = readFileSync(
      "components/calculators/FreedomCalculator.tsx",
      "utf8"
    );
    const chart = readFileSync("components/ProjectionChart.tsx", "utf8");
    expect(calc).toContain('from "@/components/ProjectionChart"');
    expect(calc).toContain("toProjectionChartData(series)");
    expect(calc).not.toContain("scenarios=");
    expect(calc).not.toContain("FreedomProjectionChart");
    expect(chart).toContain("export function ProjectionChart");
    expect(chart).toContain("densifyHill");
    expect(chart).toContain("FREEDOM_AREA_COLORS");
    expect(chart).not.toContain("recharts");
  });

  it("leaves the painel / portfolio three-line chart on ProjectionChartCard", () => {
    const painel = readFileSync("app/painel/page.tsx", "utf8");
    const card = readFileSync(
      "components/dashboard/ProjectionChartCard.tsx",
      "utf8"
    );
    expect(painel).toContain("ProjectionChartCard");
    expect(painel).toContain('mode="real"');
    expect(card).toContain("from \"recharts\"");
    expect(card).toContain("dataKey=\"pessimistic\"");
    expect(card).toContain("dataKey=\"optimistic\"");
  });

  it("mounts ProjectionChart on /simulation immediately under the cards", () => {
    const page = readFileSync(
      "components/simulation/SimulationPlaygroundPage.tsx",
      "utf8"
    );
    const wrap = readFileSync(
      "components/simulation/SimulationProjectionChart.tsx",
      "utf8"
    );
    const cardsAt = page.indexOf('<KPICards mode="playground"');
    const chartAt = page.indexOf("<SimulationProjectionChart");
    const incomeAt = page.indexOf("<IncomeGoalPanel");
    expect(chartAt).toBeGreaterThan(cardsAt);
    expect(incomeAt).toBeGreaterThan(chartAt);
    expect(page).not.toContain("ProjectionChartCard");
    expect(wrap).toContain('from "@/components/ProjectionChart"');
    expect(wrap).toContain("simulationProjectionChartInput");
    expect(wrap).not.toContain("scenarios=");
  });

  it("widens only the simulation chart to the page column", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(
      /\.simulation-projection-chart \.projection-chart\s*\{[^}]*width:\s*100%/
    );
    expect(css).toContain("width: min(64rem, calc(100vw - 4rem))");
  });

  it("maps the sandbox path onto calculator rows without changing wealth", () => {
    const { years, freedomAge } = freedomProjection(FREEDOM_DEFAULTS);
    const { series } = freedomChartSeries(FREEDOM_DEFAULTS);
    const expected = toProjectionChartData(series);
    const kpis = {
      ...DEFAULT_KPI_VALUES,
      currentAge: FREEDOM_DEFAULTS.currentAge,
      retirementAge: freedomAge,
      lifeExpectancy: FREEDOM_DEFAULTS.lifeExpectancy,
    };
    const input = simulationProjectionChartInput(years, kpis);
    expect(input.freedomAge).toBe(freedomAge);
    expect(input.data).toHaveLength(expected.length);
    for (let i = 0; i < expected.length; i++) {
      expect(input.data[i]!.age).toBe(expected[i]!.age);
      expect(input.data[i]!.patrimonio).toBe(expected[i]!.patrimonio);
      expect(input.data[i]!.aportes).toBe(expected[i]!.aportes);
      expect(input.data[i]!.rendimentos).toBe(expected[i]!.rendimentos);
      expect(input.data[i]!.saques).toBe(expected[i]!.saques);
    }
  });
});
