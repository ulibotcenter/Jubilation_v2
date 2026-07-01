"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

export function SensitivityPanel() {
  const { t } = useTranslation();
  const kpis = useAppStore((s) => s.kpis);
  const sensitivity = useAppStore((s) => s.sensitivity);
  const setSensitivity = useAppStore((s) => s.setSensitivity);
  const resetSensitivity = useAppStore((s) => s.resetSensitivity);

  const cagr = sensitivity.cagr ?? kpis.expectedCAGR;
  const inflation = sensitivity.inflation ?? kpis.annualInflation;

  return (
    <div className="sensitivity-panel card-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">{t("sensitivity.title")}</h3>
        <button type="button" className="text-xs text-accent" onClick={resetSensitivity}>
          {t("common.reset")}
        </button>
      </div>
      <label className="sensitivity-slider">
        <span>{t("sensitivity.cagr", { n: cagr.toFixed(1) })}</span>
        <input
          type="range"
          min={2}
          max={14}
          step={0.1}
          value={cagr}
          onChange={(e) =>
            setSensitivity({ cagr: parseFloat(e.target.value), inflation })
          }
        />
      </label>
      <label className="sensitivity-slider mt-3">
        <span>{t("sensitivity.inflation", { n: inflation.toFixed(1) })}</span>
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={inflation}
          onChange={(e) =>
            setSensitivity({ cagr, inflation: parseFloat(e.target.value) })
          }
        />
      </label>
    </div>
  );
}