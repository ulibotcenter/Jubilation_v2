"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FREEDOM_AREA_COLORS } from "@/lib/chartColors";
import type { FreedomChartPoint } from "@/lib/calculators/chartSeries";
import { htmlLang } from "@/lib/i18n/htmlLang";
import type { AppLocale } from "@/lib/i18n/messages";
import { chartMotion } from "@/lib/uiMotion";
import { formatCurrencyValue, type Currency } from "@/types";

function formatAxis(value: number, currency: Currency, intlLocale: string) {
  return formatCurrencyValue(value, currency, true, intlLocale);
}

function AreaTooltip({
  active,
  payload,
  label,
  currency,
  intlLocale,
  ageLabel,
  contributionsLabel,
  returnsLabel,
  withdrawalsLabel,
  wealthLabel,
}: {
  active?: boolean;
  payload?: Array<{
    value?: number;
    dataKey?: string;
    payload?: FreedomChartPoint;
  }>;
  label?: number;
  currency: Currency;
  intlLocale: string;
  ageLabel: (age: number) => string;
  contributionsLabel: string;
  returnsLabel: string;
  withdrawalsLabel: string;
  wealthLabel: string;
}) {
  if (!active || label == null || !payload?.length) return null;
  const point = payload[0]?.payload;
  const wealth = point?.wealth ?? 0;
  const rows = [
    {
      key: "contributions",
      label: contributionsLabel,
      value: point?.contributions ?? 0,
      color: FREEDOM_AREA_COLORS.contributions,
    },
    {
      key: "returns",
      label: returnsLabel,
      value: point?.returns ?? 0,
      color: FREEDOM_AREA_COLORS.returns,
    },
    {
      key: "withdrawals",
      label: withdrawalsLabel,
      value: point?.withdrawals ?? 0,
      color: FREEDOM_AREA_COLORS.withdrawals,
    },
  ];
  return (
    <div className="landing-chart-tooltip">
      <p className="landing-chart-tooltip-label">{ageLabel(label)}</p>
      <p className="landing-chart-tooltip-value">
        {wealthLabel}{" "}
        {formatCurrencyValue(wealth, currency, false, intlLocale)}
      </p>
      {rows.map((row) => (
        <p key={row.key} className="landing-chart-tooltip-row">
          <span
            className="landing-chart-tooltip-swatch"
            style={{ background: row.color }}
            aria-hidden="true"
          />
          <span>{row.label}</span>
          <span>{formatCurrencyValue(row.value, currency, false, intlLocale)}</span>
        </p>
      ))}
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
  contributionsLabel,
  returnsLabel,
  withdrawalsLabel,
  wealthLabel,
}: {
  series: FreedomChartPoint[];
  currency: Currency;
  locale: AppLocale;
  kicker: string;
  peakLabel: string;
  note: string;
  ageLabel: (age: number) => string;
  contributionsLabel: string;
  returnsLabel: string;
  withdrawalsLabel: string;
  wealthLabel: string;
}) {
  const reduced = useReducedMotion();
  const motion = chartMotion(reduced);
  const intlLocale = htmlLang(locale);
  const c = FREEDOM_AREA_COLORS;
  const duration = reduced ? 0 : 320;
  const plot = useMemo(
    () =>
      series.map((point) => ({
        ...point,
        remaining: point.contributions + point.returns,
        envelope: point.contributions + point.returns + point.withdrawals,
      })),
    [series]
  );

  return (
    <figure
      className="landing-chart landing-chart--compact landing-chart--area"
      data-landing-chart="projection"
      data-chart-area="contributions-returns-withdrawals"
      data-chart-line="wealth"
    >
      <div className="landing-chart-head">
        <figcaption>
          <p className="landing-chart-kicker">{kicker}</p>
          <p className="landing-chart-peak">{peakLabel}</p>
        </figcaption>
        <ul className="landing-chart-legend">
          <li data-stack="wealth">
            <span className="landing-chart-swatch" aria-hidden="true" />
            {wealthLabel}
          </li>
          <li data-stack="contributions">
            <span className="landing-chart-swatch" aria-hidden="true" />
            {contributionsLabel}
          </li>
          <li data-stack="returns">
            <span className="landing-chart-swatch" aria-hidden="true" />
            {returnsLabel}
          </li>
          <li data-stack="withdrawals">
            <span className="landing-chart-swatch" aria-hidden="true" />
            {withdrawalsLabel}
          </li>
        </ul>
      </div>
      <div className="landing-chart-plot" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={plot}
            margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="0"
              stroke="rgba(13, 79, 86, 0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="age"
              tick={{ fontSize: 11, fill: "#8a8580" }}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
              interval="equidistantPreserveStart"
            />
            <YAxis
              tickFormatter={(value: number) =>
                formatAxis(value, currency, intlLocale)
              }
              tick={{ fontSize: 11, fill: "#8a8580" }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip
              content={
                <AreaTooltip
                  currency={currency}
                  intlLocale={intlLocale}
                  ageLabel={ageLabel}
                  contributionsLabel={contributionsLabel}
                  returnsLabel={returnsLabel}
                  withdrawalsLabel={withdrawalsLabel}
                  wealthLabel={wealthLabel}
                />
              }
              cursor={{ stroke: c.line, strokeWidth: 1, strokeOpacity: 0.35 }}
            />
            <Area
              type="monotone"
              dataKey="envelope"
              name={withdrawalsLabel}
              stroke="none"
              fill={c.withdrawals}
              isAnimationActive={motion.isAnimationActive}
              animationDuration={duration}
              animationEasing={motion.animationEasing}
            />
            <Area
              type="monotone"
              dataKey="remaining"
              name={returnsLabel}
              stroke="none"
              fill={c.returns}
              isAnimationActive={motion.isAnimationActive}
              animationDuration={duration}
              animationEasing={motion.animationEasing}
            />
            <Area
              type="monotone"
              dataKey="contributions"
              name={contributionsLabel}
              stroke="none"
              fill={c.contributions}
              isAnimationActive={motion.isAnimationActive}
              animationDuration={duration}
              animationEasing={motion.animationEasing}
            />
            <Line
              type="monotone"
              dataKey="wealth"
              name={wealthLabel}
              stroke={c.line}
              strokeWidth={3.25}
              dot={false}
              activeDot={{
                r: 4,
                fill: c.line,
                stroke: "#fff",
                strokeWidth: 2,
              }}
              isAnimationActive={motion.isAnimationActive}
              animationDuration={duration}
              animationEasing={motion.animationEasing}
              legendType="line"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="landing-chart-note">{note}</p>
    </figure>
  );
}
