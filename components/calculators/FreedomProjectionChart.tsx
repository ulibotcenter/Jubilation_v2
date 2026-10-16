"use client";

import { useId } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
} from "recharts";
import { FREEDOM_PHASE_COLORS } from "@/lib/chartColors";
import type { FreedomChartPoint } from "@/lib/calculators/chartSeries";
import { htmlLang } from "@/lib/i18n/htmlLang";
import type { AppLocale } from "@/lib/i18n/messages";
import { chartMotion } from "@/lib/uiMotion";
import { formatCurrencyValue, type Currency } from "@/types";

function formatAxis(value: number, currency: Currency, intlLocale: string) {
  return formatCurrencyValue(value, currency, true, intlLocale);
}

function PhaseTooltip({
  active,
  payload,
  label,
  currency,
  intlLocale,
  ageLabel,
  accumulateLabel,
  withdrawLabel,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; dataKey?: string }>;
  label?: number;
  currency: Currency;
  intlLocale: string;
  ageLabel: (age: number) => string;
  accumulateLabel: string;
  withdrawLabel: string;
}) {
  if (!active || label == null) return null;
  const accumulate = payload?.find((item) => item.dataKey === "accumulate");
  const withdraw = payload?.find((item) => item.dataKey === "withdraw");
  const value = withdraw?.value ?? accumulate?.value;
  if (value == null) return null;
  const phase = withdraw?.value != null ? withdrawLabel : accumulateLabel;
  return (
    <div className="landing-chart-tooltip">
      <p className="landing-chart-tooltip-label">{ageLabel(label)}</p>
      <p className="landing-chart-tooltip-phase">{phase}</p>
      <p className="landing-chart-tooltip-value">
        {formatCurrencyValue(value, currency, false, intlLocale)}
      </p>
    </div>
  );
}

export function FreedomProjectionChart({
  series,
  currency,
  locale,
  kicker,
  peakLabel,
  note,
  ageLabel,
  accumulateLabel,
  withdrawLabel,
}: {
  series: FreedomChartPoint[];
  currency: Currency;
  locale: AppLocale;
  kicker: string;
  peakLabel: string;
  note: string;
  ageLabel: (age: number) => string;
  accumulateLabel: string;
  withdrawLabel: string;
}) {
  const reduced = useReducedMotion();
  const motion = chartMotion(reduced);
  const intlLocale = htmlLang(locale);
  const fillRaw = useId();
  const accFill = `freedomAccFill-${fillRaw.replace(/:/g, "")}`;
  const wdFill = `freedomWdFill-${fillRaw.replace(/:/g, "")}`;

  return (
    <figure
      className="landing-chart landing-chart--compact landing-chart--phases"
      data-landing-chart="projection"
      data-chart-phases="accumulate-withdraw"
    >
      <div className="landing-chart-head">
        <figcaption>
          <p className="landing-chart-kicker">{kicker}</p>
          <p className="landing-chart-peak">{peakLabel}</p>
        </figcaption>
        <p className="landing-chart-note">{note}</p>
      </div>
      <ul className="landing-chart-legend">
        <li data-phase="accumulate">
          <span className="landing-chart-swatch" aria-hidden="true" />
          {accumulateLabel}
        </li>
        <li data-phase="withdraw">
          <span className="landing-chart-swatch" aria-hidden="true" />
          {withdrawLabel}
        </li>
      </ul>
      <div className="landing-chart-plot" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={series}
            margin={{ top: 12, right: 8, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id={accFill} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={FREEDOM_PHASE_COLORS.accumulate}
                  stopOpacity={0.38}
                />
                <stop
                  offset="100%"
                  stopColor={FREEDOM_PHASE_COLORS.accumulate}
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id={wdFill} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={FREEDOM_PHASE_COLORS.withdraw}
                  stopOpacity={0.34}
                />
                <stop
                  offset="100%"
                  stopColor={FREEDOM_PHASE_COLORS.withdraw}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--chart-grid)"
              vertical={false}
            />
            <XAxis
              dataKey="age"
              tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
              axisLine={{ stroke: "var(--chart-axis)" }}
              tickLine={false}
              minTickGap={28}
              interval="equidistantPreserveStart"
            />
            <YAxis
              tickFormatter={(value: number) =>
                formatAxis(value, currency, intlLocale)
              }
              tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip
              content={
                <PhaseTooltip
                  currency={currency}
                  intlLocale={intlLocale}
                  ageLabel={ageLabel}
                  accumulateLabel={accumulateLabel}
                  withdrawLabel={withdrawLabel}
                />
              }
              cursor={{ stroke: FREEDOM_PHASE_COLORS.cursor, strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="accumulate"
              name={accumulateLabel}
              stroke={FREEDOM_PHASE_COLORS.accumulate}
              strokeWidth={2.5}
              fill={`url(#${accFill})`}
              connectNulls={false}
              isAnimationActive={motion.isAnimationActive}
              animationDuration={reduced ? 0 : 900}
              animationEasing={motion.animationEasing}
            />
            <Area
              type="monotone"
              dataKey="withdraw"
              name={withdrawLabel}
              stroke={FREEDOM_PHASE_COLORS.withdraw}
              strokeWidth={2.5}
              fill={`url(#${wdFill})`}
              connectNulls={false}
              isAnimationActive={motion.isAnimationActive}
              animationDuration={reduced ? 0 : 900}
              animationEasing={motion.animationEasing}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
