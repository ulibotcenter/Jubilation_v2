"use client";

import { ASSUMPTIONS } from "@/lib/engine/assumptions";
import { fisherNominal, fisherReal } from "@/lib/engine/rates";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { DEFAULT_KPI_VALUES } from "@/types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function SensitivityPanel() {
  const { t } = useTranslation();
  const kpis = useAppStore((s) => s.kpis);
  const setKPI = useAppStore((s) => s.setKPI);
  const resetSensitivity = useAppStore((s) => s.resetSensitivity);

  const inflation = kpis.annualInflation;
  const realReturn = round1(
    fisherReal(kpis.expectedCAGR / 100, inflation / 100) * 100
  );
  const lifeExpectancy = kpis.lifeExpectancy;

  const realDefault = ASSUMPTIONS.realReturn.defaultValue;
  const inflationDefault = ASSUMPTIONS.inflation.defaultValue;
  const leDefault = ASSUMPTIONS.lifeExpectancy.defaultValue;

  const realAltered = Math.abs(realReturn - realDefault) > 0.05;
  const inflationAltered = Math.abs(inflation - inflationDefault) > 0.05;
  const leAltered = lifeExpectancy !== leDefault;

  const resetPremises = () => {
    resetSensitivity();
    setKPI("annualInflation", DEFAULT_KPI_VALUES.annualInflation);
    setKPI(
      "expectedCAGR",
      round1(
        fisherNominal(realDefault / 100, inflationDefault / 100) * 100
      )
    );
    setKPI("lifeExpectancy", leDefault);
  };

  return (
    <div className="sensitivity-panel dashboard-insight-card card-surface p-4">
      <div className="dashboard-insight-header flex items-center justify-between">
        <h3 className="text-sm font-bold">{t("sensitivity.title")}</h3>
        <button type="button" className="btn-ghost text-xs" onClick={resetPremises}>
          {t("common.reset")}
        </button>
      </div>
      <div className="dashboard-insight-body flex flex-col">
        <label className="sensitivity-slider" data-impact="high">
          <span>{t("sensitivity.realReturn", { n: realReturn.toFixed(1) })}</span>
          <input
            type="range"
            min={ASSUMPTIONS.realReturn.min}
            max={ASSUMPTIONS.realReturn.max}
            step={ASSUMPTIONS.realReturn.step}
            value={realReturn}
            title={t("sensitivity.plausible", {
              min: ASSUMPTIONS.realReturn.min,
              max: ASSUMPTIONS.realReturn.max,
            })}
            onChange={(e) => {
              const nextReal = parseFloat(e.target.value);
              const nominal = round1(
                fisherNominal(nextReal / 100, inflation / 100) * 100
              );
              setKPI("expectedCAGR", nominal);
            }}
          />
          <span className="sensitivity-meta">
            {t("sensitivity.highImpact")}
            {" · "}
            {realAltered
              ? t("sensitivity.altered")
              : t("sensitivity.default", { n: realDefault })}
          </span>
        </label>

        <label className="sensitivity-slider mt-3" data-impact="high">
          <span>{t("sensitivity.inflation", { n: inflation.toFixed(1) })}</span>
          <input
            type="range"
            min={ASSUMPTIONS.inflation.min}
            max={ASSUMPTIONS.inflation.max}
            step={ASSUMPTIONS.inflation.step}
            value={inflation}
            title={t("sensitivity.plausible", {
              min: ASSUMPTIONS.inflation.min,
              max: ASSUMPTIONS.inflation.max,
            })}
            onChange={(e) =>
              setKPI("annualInflation", parseFloat(e.target.value))
            }
          />
          <span className="sensitivity-meta">
            {t("sensitivity.highImpact")}
            {" · "}
            {inflationAltered
              ? t("sensitivity.altered")
              : t("sensitivity.default", { n: inflationDefault })}
          </span>
        </label>

        <label className="sensitivity-slider mt-3" data-impact="high">
          <span>
            {t("sensitivity.lifeExpectancy", { n: lifeExpectancy })}
          </span>
          <input
            type="range"
            min={ASSUMPTIONS.lifeExpectancy.min}
            max={ASSUMPTIONS.lifeExpectancy.max}
            step={ASSUMPTIONS.lifeExpectancy.step}
            value={lifeExpectancy}
            title={t("sensitivity.plausible", {
              min: ASSUMPTIONS.lifeExpectancy.min,
              max: ASSUMPTIONS.lifeExpectancy.max,
            })}
            onChange={(e) =>
              setKPI("lifeExpectancy", parseInt(e.target.value, 10))
            }
          />
          <span className="sensitivity-meta">
            {t("sensitivity.highImpact")}
            {" · "}
            {leAltered
              ? t("sensitivity.altered")
              : t("sensitivity.default", { n: leDefault })}
          </span>
        </label>
      </div>
    </div>
  );
}
