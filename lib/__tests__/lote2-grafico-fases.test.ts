import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { freedomChartSeries } from "@/lib/calculators/chartSeries";
import {
  DEFAULT_WITHDRAWAL_REAL_RETURN,
  FREEDOM_DEFAULTS,
  shareRealReturn,
} from "@/lib/calculators/independence";
import { parseFreedomInput } from "@/lib/calculators/parse";

describe("lote 2 two-phase freedom chart", () => {
  it("keeps the engine withdrawal default, and the page shares one rate", () => {
    expect(DEFAULT_WITHDRAWAL_REAL_RETURN).toBe(0.02);
    expect(FREEDOM_DEFAULTS.withdrawalRealReturn).toBe(0.02);
    expect(parseFreedomInput({}).withdrawalRealReturn).toBe(0.02);
    const shared = shareRealReturn(parseFreedomInput({}));
    expect(shared.withdrawalRealReturn).toBe(shared.realReturn);
    expect(shared.realReturn).toBe(FREEDOM_DEFAULTS.realReturn);
  });

  it("grows while contributing then declines after freedom without snapping to zero", () => {
    const { series, result, freedomAge } = freedomChartSeries(FREEDOM_DEFAULTS);
    expect(result.feasible).toBe(true);
    expect(series[0]?.wealth).toBeGreaterThanOrEqual(0);
    expect(series[0]?.accumulate).toBe(series[0]?.wealth);
    expect(series[0]?.withdraw).toBeNull();

    const split = series.find((point) => point.age === freedomAge);
    expect(split?.accumulate).toBe(split?.wealth);
    expect(split?.withdraw).toBe(split?.wealth);

    const after = series.filter((point) => point.age > freedomAge);
    expect(after.length).toBeGreaterThan(2);
    expect(after.every((point) => point.accumulate == null)).toBe(true);
    expect(after.every((point) => point.withdraw === point.wealth)).toBe(true);

    const last = series.at(-1)!;
    expect(last.age).toBe(FREEDOM_DEFAULTS.lifeExpectancy);
    expect(last.wealth).toBeGreaterThan(0);
    expect(last.wealth).toBeLessThan(split!.wealth);

    let declined = false;
    for (let i = 1; i < after.length; i++) {
      if (after[i].wealth < after[i - 1].wealth) declined = true;
      const drop = after[i - 1].wealth - after[i].wealth;
      expect(drop).toBeLessThan(after[i - 1].wealth * 0.85);
    }
    expect(declined).toBe(true);
  });

  it("still charts from zero wealth", () => {
    const { series, result } = freedomChartSeries({
      ...FREEDOM_DEFAULTS,
      liquidWealth: 0,
    });
    expect(series[0]?.wealth).toBe(0);
    expect(result.feasible).toBe(true);
    const grown = series.some((point) => point.wealth > 0);
    expect(grown).toBe(true);
  });

  it("recomputes when the withdrawal yield changes", () => {
    const low = freedomChartSeries({
      ...FREEDOM_DEFAULTS,
      withdrawalRealReturn: 0.01,
    });
    const high = freedomChartSeries({
      ...FREEDOM_DEFAULTS,
      withdrawalRealReturn: 0.06,
    });
    expect(high.freedomAge).toBeLessThanOrEqual(low.freedomAge);
    const lowTail = low.series.at(-1)!.wealth;
    const highTail = high.series.at(-1)!.wealth;
    expect(highTail).toBeGreaterThan(lowTail);
  });

  it("uses currency symbols on the shared landing/calculator control", () => {
    const controls = readFileSync(
      "components/platform/LocaleCurrencyControls.tsx",
      "utf8"
    );
    expect(controls).toContain('className="prefs-chip-label">{option.symbol}');
  });
});
