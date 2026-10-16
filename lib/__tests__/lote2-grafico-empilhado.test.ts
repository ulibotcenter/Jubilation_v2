import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { freedomChartSeries } from "@/lib/calculators/chartSeries";
import {
  FREEDOM_DEFAULTS,
  solveFreedomDate,
} from "@/lib/calculators/independence";
import { FREEDOM_AREA_COLORS } from "@/lib/chartColors";
import { t } from "@/lib/i18n/messages";

describe("lote 2 stacked freedom chart", () => {
  it("does not change the numeric freedom-age result", () => {
    const solved = solveFreedomDate(FREEDOM_DEFAULTS);
    const { result, freedomAge } = freedomChartSeries(FREEDOM_DEFAULTS);
    expect(result).toEqual(solved);
    expect(freedomAge).toBe(Math.round(solved.value));
  });

  it("stacks remaining contributions + returns to current wealth", () => {
    const { series, freedomAge, result } = freedomChartSeries(FREEDOM_DEFAULTS);
    expect(result.feasible).toBe(true);

    for (const point of series) {
      expect(point.contributions + point.returns).toBeCloseTo(point.wealth, 6);
      expect(point.contributions).toBeGreaterThanOrEqual(0);
      expect(point.returns).toBeGreaterThanOrEqual(0);
    }

    const accumulating = series.filter((point) => point.age < freedomAge);
    expect(accumulating.every((point) => point.withdrawals === 0)).toBe(true);
    expect(accumulating.some((point) => point.contributions > 0)).toBe(true);
    expect(accumulating.some((point) => point.returns > 0)).toBe(true);

    for (let i = 1; i < accumulating.length; i++) {
      expect(accumulating[i].wealth).toBeGreaterThan(accumulating[i - 1].wealth);
    }
  });

  it("shows a withdrawals layer after freedom without snapping remaining wealth to zero", () => {
    const { series, freedomAge } = freedomChartSeries(FREEDOM_DEFAULTS);
    const after = series.filter((point) => point.age > freedomAge);
    expect(after.length).toBeGreaterThan(2);
    expect(after.some((point) => point.withdrawals > 0)).toBe(true);
    expect(after.some((point) => point.returns > 0)).toBe(true);

    const peak = Math.max(...series.map((point) => point.wealth));
    let declined = false;
    for (let i = 1; i < after.length; i++) {
      if (after[i].wealth < after[i - 1].wealth) declined = true;
      expect(after[i].withdrawals).toBeGreaterThanOrEqual(
        after[i - 1].withdrawals
      );
      expect(after[i].contributions + after[i].returns + after[i].withdrawals).toBeCloseTo(
        peak,
        0
      );
      const drop = after[i - 1].wealth - after[i].wealth;
      expect(drop).toBeLessThan(after[i - 1].wealth * 0.85);
    }
    expect(declined).toBe(true);

    const last = series.at(-1)!;
    expect(last.age).toBe(FREEDOM_DEFAULTS.lifeExpectancy);
    expect(last.wealth).toBeGreaterThan(0);
    expect(last.wealth).toBeLessThan(peak);
    expect(last.withdrawals).toBeGreaterThan(0);
    expect(last.returns).toBeGreaterThan(0);
  });

  it("still stacks from zero starting wealth", () => {
    const { series, result } = freedomChartSeries({
      ...FREEDOM_DEFAULTS,
      liquidWealth: 0,
    });
    expect(series[0]?.wealth).toBe(0);
    expect(series[0]?.contributions).toBe(0);
    expect(result.feasible).toBe(true);
    expect(series.some((point) => point.contributions > 0)).toBe(true);
    expect(series.some((point) => point.returns > 0)).toBe(true);
  });

  it("recomputes the stack when an existing field changes", () => {
    const low = freedomChartSeries({
      ...FREEDOM_DEFAULTS,
      monthlyContribution: 2_000,
    });
    const high = freedomChartSeries({
      ...FREEDOM_DEFAULTS,
      monthlyContribution: 6_000,
    });
    expect(high.freedomAge).toBeLessThanOrEqual(low.freedomAge);
    expect(high.series.at(-1)!.wealth).toBeGreaterThan(low.series.at(-1)!.wealth);
  });

  it("paints the public chart as stacked areas under a wealth line", () => {
    expect(FREEDOM_AREA_COLORS.line).toBe("#0F766E");
    expect(FREEDOM_AREA_COLORS.contributions).toBe("#93C5FD");
    expect(FREEDOM_AREA_COLORS.returns).toBe("#FCD34D");
    expect(FREEDOM_AREA_COLORS.withdrawals).toBe("#FCA5A5");

    const chart = readFileSync(
      "components/calculators/FreedomProjectionChart.tsx",
      "utf8"
    );
    expect(chart).toContain("ComposedChart");
    expect(chart).toContain("type=\"monotone\"");
    expect(chart).toContain('dataKey="blueTop"');
    expect(chart).toContain('dataKey="goldTop"');
    expect(chart).toContain('dataKey="wealth"');
    expect(chart).toContain(
      'data-chart-area="contributions-returns-withdrawals"'
    );
    expect(chart).not.toContain("BarChart");
    expect(chart).not.toContain("Bar\n");
    expect(chart).not.toContain("<Bar");

    expect(t("pt", "calc.freedom.chart.contributions")).toBe("Aportes");
    expect(t("en", "calc.freedom.chart.returns")).toBe("Returns");
    expect(t("es", "calc.freedom.chart.withdrawals")).toBe("Retiros");
  });

  it("does not restyle the landing hero chart", () => {
    const landing = readFileSync("components/landing/LandingHeroChart.tsx", "utf8");
    expect(landing).toContain("AreaChart");
    expect(landing).not.toContain("BarChart");
    expect(landing).not.toContain("FREEDOM_AREA_COLORS");
    expect(landing).not.toContain("ComposedChart");
  });
});
