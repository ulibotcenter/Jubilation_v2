import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  horizonSliderBounds,
  sliderThumb,
  spendSliderMax,
  WEALTH_SLIDER_CAP,
} from "@/lib/calculators/freedomSliders";
import { t } from "@/lib/i18n/messages";

describe("freedom page sliders", () => {
  it("snaps the thumb and leaves out-of-range values to the caller", () => {
    expect(sliderThumb(12_000_000, 0, WEALTH_SLIDER_CAP, 10_000)).toBe(10_000_000);
    expect(sliderThumb(3_000_000, 0, WEALTH_SLIDER_CAP, 10_000)).toBe(3_000_000);
    expect(sliderThumb(-10, 0, 20_000, 100)).toBe(0);
    expect(sliderThumb(8.04, 0, 8, 0.1)).toBe(8);
    expect(sliderThumb(2.04, 0, 8, 0.1)).toBe(2);
    expect(sliderThumb(2.06, 0, 8, 0.1)).toBe(2.1);
    expect(sliderThumb(2050, 0, 20_000, 100)).toBe(2100);
    expect(sliderThumb(50_000, 0, WEALTH_SLIDER_CAP, 10_000)).toBe(50_000);
    expect(sliderThumb(2, 0, 8, 0.1)).toBe(2);
  });

  it("pins wealth above 10 million to the thumb without raising the range", () => {
    expect(WEALTH_SLIDER_CAP).toBe(10_000_000);
    expect(sliderThumb(10_000_000, 0, WEALTH_SLIDER_CAP, 10_000)).toBe(10_000_000);
    expect(sliderThumb(15_000_000, 0, WEALTH_SLIDER_CAP, 10_000)).toBe(10_000_000);
    expect(sliderThumb(10_004_000, 0, WEALTH_SLIDER_CAP, 10_000)).toBe(10_000_000);
  });

  it("raises the monthly withdrawal ceiling only above 50_000", () => {
    expect(spendSliderMax(6_000)).toBe(50_000);
    expect(spendSliderMax(50_000)).toBe(50_000);
    expect(spendSliderMax(50_100)).toBe(50_500);
    expect(spendSliderMax(80_000)).toBe(80_000);
    expect(sliderThumb(62_300, 0, 62_500, 500)).toBe(62_500);
    expect(sliderThumb(70_000, 0, 50_000, 500)).toBe(50_000);
  });

  it("bounds target age from the current age through 120, not the solved freedom age", () => {
    expect(horizonSliderBounds(32)).toEqual({ min: 33, max: 120 });
    expect(horizonSliderBounds(95)).toEqual({ min: 96, max: 120 });
    expect(horizonSliderBounds(130)).toEqual({ min: 120, max: 120 });
    expect(sliderThumb(130, 33, 120, 1)).toBe(120);
    expect(sliderThumb(90, 33, 120, 1)).toBe(90);
    expect(sliderThumb(40, 33, 120, 1)).toBe(40);
  });

  it("places the four sliders under the chart and binds the draft fields", () => {
    const calculator = readFileSync(
      "components/calculators/FreedomCalculator.tsx",
      "utf8"
    );
    const chartAt = calculator.indexOf("<ProjectionChart");
    const slidersAt = calculator.indexOf("<FreedomSliders");
    const chartEnd = calculator.indexOf("</ProjectionChart>");
    const resultAt = calculator.indexOf('className="public-result');
    expect(chartAt).toBeGreaterThan(-1);
    expect(slidersAt).toBeGreaterThan(chartAt);
    expect(chartEnd).toBeGreaterThan(slidersAt);
    expect(resultAt).toBeGreaterThan(chartEnd);
    const chart = readFileSync("components/ProjectionChart.tsx", "utf8");
    const axisAt = chart.indexOf('className="projection-chart-axis-age"');
    const childrenAt = chart.indexOf("{children}");
    expect(axisAt).toBeGreaterThan(-1);
    expect(childrenAt).toBeGreaterThan(axisAt);
    expect(chart).not.toContain("projection-chart-footer");
    expect(calculator).toContain('onWealth={(value) => patch("reserva", value)}');
    expect(calculator).toContain(
      'onContribution={(value) => patch("aporte", value)}'
    );
    expect(calculator).toContain('onHorizon={(value) => patch("alvo", value)}');
    expect(calculator).toContain('onSpend={(value) => patch("gasto", value)}');
    expect(calculator).toContain("spend={draft.gasto}");
    expect(calculator).toContain('name="gasto"');
    expect(calculator).toContain('name="inflacao"');
    expect(calculator).not.toContain('name="saque"');
    expect(calculator).not.toContain('onWithdrawRate');
    expect(calculator).toContain("shareRealReturn");
    expect(calculator).toContain("horizon={draft.alvo}");
    expect(calculator).not.toContain("horizon={freedomAge}");

    const sliders = readFileSync(
      "components/calculators/FreedomSliders.tsx",
      "utf8"
    );
    expect(sliders).not.toContain("freedomAge");
    expect(sliders).toContain('slider="reserva"');
    expect(sliders).toContain('slider="aporte"');
    expect(sliders).toContain('slider="alvo"');
    expect(sliders).toContain('slider="gasto"');
    expect(sliders).not.toContain('slider="saque"');
    expect(sliders).not.toContain("withdrawRate");

    expect(t("pt", "calc.freedom.slider.wealth")).toBe("Patrimônio atual");
    expect(t("pt", "calc.freedom.slider.contribution")).toBe("Aporte mensal");
    expect(t("pt", "calc.freedom.slider.horizon")).toBe("Idade alvo");
    expect(t("pt", "calc.freedom.slider.spend")).toBe("Valor desejado de saque");
    expect(t("en", "calc.freedom.slider.spend")).toBe(
      "Desired monthly withdrawal"
    );
    expect(t("es", "calc.freedom.slider.spend")).toBe("Valor deseado de retiro");
    expect(t("pt", "calc.freedom.rate")).toBe("Quanto cresce ao ano");
    expect(t("pt", "calc.freedom.inflation")).toBe("Inflação média ao ano");
    expect(t("pt", "calc.freedom.spend")).toBe(
      "Quanto quero ter por mês na liberdade"
    );
    expect(t("en", "calc.freedom.spend")).toBe(
      "What I want each month in freedom"
    );
    expect(t("es", "calc.freedom.spend")).toBe(
      "Cuánto quiero tener al mes en la libertad"
    );
    expect(calculator).not.toContain("withdrawRate");
  });
});
