"use client";

import { useId, type ChangeEvent } from "react";
import {
  CONTRIBUTION_SLIDER_MAX,
  CONTRIBUTION_SLIDER_STEP,
  horizonSliderBounds,
  sliderThumb,
  SPEND_SLIDER_STEP,
  spendSliderMax,
  WEALTH_SLIDER_CAP,
  WEALTH_SLIDER_STEP,
} from "@/lib/calculators/freedomSliders";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatCurrencyValue, type Currency } from "@/types";

type SliderKey = "reserva" | "aporte" | "alvo" | "gasto";

function formatAge(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
    value
  );
}

function FreedomSlider({
  id,
  slider,
  label,
  readout,
  min,
  max,
  step,
  value,
  onValue,
}: {
  id: string;
  slider: SliderKey;
  label: string;
  readout: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onValue: (value: number) => void;
}) {
  const thumb = sliderThumb(value, min, max, step);
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (!Number.isFinite(next)) return;
    onValue(sliderThumb(next, min, max, step));
  };

  return (
    <div className="freedom-slider">
      <label className="freedom-slider-label" htmlFor={id}>
        {label}
      </label>
      <span className="freedom-slider-value" data-slider-readout={slider}>
        {readout}
      </span>
      <input
        id={id}
        type="range"
        data-slider={slider}
        min={min}
        max={max}
        step={step}
        value={thumb}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={thumb}
        aria-valuetext={readout}
        onChange={onChange}
      />
    </div>
  );
}

export function FreedomSliders({
  wealth,
  contribution,
  currentAge,
  horizon,
  spend,
  onWealth,
  onContribution,
  onHorizon,
  onSpend,
  currency,
  locale,
}: {
  wealth: number;
  contribution: number;
  currentAge: number;
  horizon: number;
  spend: number;
  onWealth: (value: number) => void;
  onContribution: (value: number) => void;
  onHorizon: (value: number) => void;
  onSpend: (value: number) => void;
  currency: Currency;
  locale: string;
}) {
  const { t } = useTranslation();
  const baseId = useId();
  const spendMax = spendSliderMax(spend);
  const horizonBounds = horizonSliderBounds(currentAge);

  return (
    <div
      className="freedom-sliders"
      role="group"
      aria-label={t("calc.freedom.slider.group")}
    >
      <FreedomSlider
        id={`${baseId}-reserva`}
        slider="reserva"
        label={t("calc.freedom.slider.wealth")}
        readout={formatCurrencyValue(wealth, currency, false, locale)}
        min={0}
        max={WEALTH_SLIDER_CAP}
        step={WEALTH_SLIDER_STEP}
        value={wealth}
        onValue={onWealth}
      />
      <FreedomSlider
        id={`${baseId}-aporte`}
        slider="aporte"
        label={t("calc.freedom.slider.contribution")}
        readout={formatCurrencyValue(contribution, currency, false, locale)}
        min={0}
        max={CONTRIBUTION_SLIDER_MAX}
        step={CONTRIBUTION_SLIDER_STEP}
        value={contribution}
        onValue={onContribution}
      />
      <FreedomSlider
        id={`${baseId}-alvo`}
        slider="alvo"
        label={t("calc.freedom.slider.horizon")}
        readout={formatAge(horizon, locale)}
        min={horizonBounds.min}
        max={horizonBounds.max}
        step={1}
        value={horizon}
        onValue={onHorizon}
      />
      <FreedomSlider
        id={`${baseId}-gasto`}
        slider="gasto"
        label={t("calc.freedom.slider.spend")}
        readout={formatCurrencyValue(spend, currency, false, locale)}
        min={0}
        max={spendMax}
        step={SPEND_SLIDER_STEP}
        value={spend}
        onValue={onSpend}
      />
    </div>
  );
}
