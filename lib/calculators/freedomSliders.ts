/** Visual range for the freedom-page sliders. Does not clamp stored field values. */

export const WEALTH_SLIDER_CAP = 2_000_000;
export const WEALTH_SLIDER_STEP = 10_000;
export const CONTRIBUTION_SLIDER_MAX = 20_000;
export const CONTRIBUTION_SLIDER_STEP = 100;
export const HORIZON_SLIDER_MAX = 90;
export const WITHDRAW_SLIDER_MAX = 8;
export const WITHDRAW_SLIDER_STEP = 0.1;

function decimalPlaces(step: number): number {
  const text = String(step);
  const scientific = text.match(/e-(\d+)$/);
  if (scientific) return Number(scientific[1]);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

/** Clamp and snap a thumb position. Callers keep the typed value separately. */
export function sliderThumb(
  value: number,
  min: number,
  max: number,
  step: number
): number {
  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    !Number.isFinite(step) ||
    step <= 0 ||
    max < min
  ) {
    return Number.isFinite(min) ? min : 0;
  }
  const safe = Number.isFinite(value) ? value : min;
  const clamped = Math.min(max, Math.max(min, safe));
  const steps = Math.round((clamped - min) / step);
  const snapped = min + steps * step;
  const rounded = Number(snapped.toFixed(decimalPlaces(step)));
  if (rounded > max) return Number(max.toFixed(decimalPlaces(step)));
  if (rounded < min) return Number(min.toFixed(decimalPlaces(step)));
  return rounded;
}

/** Stay at 2_000_000 unless the stored wealth needs a higher step-aligned ceiling. */
export function wealthSliderMax(value: number): number {
  if (!Number.isFinite(value) || value <= WEALTH_SLIDER_CAP) {
    return WEALTH_SLIDER_CAP;
  }
  const steps = Math.ceil(value / WEALTH_SLIDER_STEP);
  return steps * WEALTH_SLIDER_STEP;
}

/** Target-age slider: current age + 1 through 90. Never the solved freedom age. */
export function horizonSliderBounds(currentAge: number): {
  min: number;
  max: number;
} {
  const age = Number.isFinite(currentAge) ? currentAge : 0;
  return {
    min: Math.min(HORIZON_SLIDER_MAX, age + 1),
    max: HORIZON_SLIDER_MAX,
  };
}
