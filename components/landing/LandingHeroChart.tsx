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
import { PROJECTION_COLORS } from "@/lib/chartColors";
import { htmlLang } from "@/lib/i18n/htmlLang";
import type { AppLocale } from "@/lib/i18n/messages";
import { chartMotion } from "@/lib/uiMotion";
import { formatCurrencyValue, type Currency } from "@/types";

export type LandingChartPoint = { age: number; wealth: number };

function formatAxis(value: number, currency: Currency, intlLocale: string) {
  return formatCurrencyValue(value, currency, true, intlLocale);
}

function LandingTooltip({
  active,
  payload,
  label,
  currency,
  intlLocale,
  ageLabel,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: number;
  currency: Currency;
  intlLocale: string;
  ageLabel: (age: number) => string;
}) {
  if (!active || payload?.[0]?.value == null || label == null) return null;
  return (
    <div className="landing-chart-tooltip">
      <p className="landing-chart-tooltip-label">{ageLabel(label)}</p>
      <p className="landing-chart-tooltip-value">
        {formatCurrencyValue(payload[0].value, currency, false, intlLocale)}
      </p>
    </div>
  );
}

export function LandingHeroChart({
  series,
  currency,
  locale,
  kicker,
  peakLabel,
  note,
  ageLabel,
  compact = false,
}: {
  series: LandingChartPoint[];
  horizonAge?: number;
  peakWealth?: number;
  currency: Currency;
  locale: AppLocale;
  kicker: string;
  peakLabel: string;
  note: string;
  ageLabel: (age: number) => string;
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  const motion = chartMotion(reduced);
  const intlLocale = htmlLang(locale);
  const fillRaw = useId();
  const fillId = `landingWealthFill-${fillRaw.replace(/:/g, "")}`;

  return (
    <figure
      className={`landing-chart${compact ? " landing-chart--compact" : ""}`}
      data-landing-chart="projection"
    >
      <div className="landing-chart-head">
        <figcaption>
          <p className="landing-chart-kicker">{kicker}</p>
          <p className="landing-chart-peak">{peakLabel}</p>
        </figcaption>
        <p className="landing-chart-note">{note}</p>
      </div>
      <div className="landing-chart-plot" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={series}
            margin={{ top: 12, right: 8, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={PROJECTION_COLORS.base}
                  stopOpacity={0.38}
                />
                <stop
                  offset="100%"
                  stopColor={PROJECTION_COLORS.base}
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
              interval="preserveStartEnd"
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
                <LandingTooltip
                  currency={currency}
                  intlLocale={intlLocale}
                  ageLabel={ageLabel}
                />
              }
              cursor={{ stroke: PROJECTION_COLORS.cursor, strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="wealth"
              stroke={PROJECTION_COLORS.base}
              strokeWidth={2.5}
              fill={`url(#${fillId})`}
              isAnimationActive={motion.isAnimationActive}
              animationDuration={reduced ? 0 : 1400}
              animationEasing={motion.animationEasing}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
