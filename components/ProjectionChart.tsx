"use client";

import { useId, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FREEDOM_AREA_COLORS } from "@/lib/chartColors";
import type { ProjectionChartPoint } from "@/lib/calculators/chartSeries";
import { densifyMonotone } from "@/lib/calculators/smoothPlot";
import { htmlLang } from "@/lib/i18n/htmlLang";
import type { AppLocale } from "@/lib/i18n/messages";
import { chartMotion } from "@/lib/uiMotion";
import { formatCurrencyValue, type Currency } from "@/types";

function formatAxis(value: number, currency: Currency, intlLocale: string) {
  return formatCurrencyValue(value, currency, true, intlLocale);
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
  intlLocale,
  ageLabel,
  aportesLabel,
  rendimentosLabel,
  saquesLabel,
  patrimonioLabel,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: ProjectionChartPoint;
  }>;
  label?: number;
  currency: Currency;
  intlLocale: string;
  ageLabel: (age: number) => string;
  aportesLabel: string;
  rendimentosLabel: string;
  saquesLabel: string;
  patrimonioLabel: string;
}) {
  if (!active || label == null || !payload?.length) return null;
  const point = payload[0]?.payload;
  const patrimonio = point?.patrimonio ?? 0;
  const rows = [
    {
      key: "aportes",
      label: aportesLabel,
      value: point?.aportes ?? 0,
      color: FREEDOM_AREA_COLORS.contributions,
    },
    {
      key: "rendimentos",
      label: rendimentosLabel,
      value: point?.rendimentos ?? 0,
      color: FREEDOM_AREA_COLORS.returns,
    },
    {
      key: "saques",
      label: saquesLabel,
      value: point?.saques ?? 0,
      color: FREEDOM_AREA_COLORS.withdrawals,
    },
  ];
  return (
    <div className="landing-chart-tooltip">
      <p className="landing-chart-tooltip-label">{ageLabel(Math.round(label))}</p>
      <p className="landing-chart-tooltip-value">
        {patrimonioLabel}{" "}
        {formatCurrencyValue(patrimonio, currency, false, intlLocale)}
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

export function ProjectionChart({
  data,
  currency,
  locale,
  kicker,
  peakLabel,
  note,
  ageLabel,
  aportesLabel,
  rendimentosLabel,
  saquesLabel,
  patrimonioLabel,
}: {
  data: ProjectionChartPoint[];
  currency: Currency;
  locale: AppLocale;
  kicker: string;
  peakLabel: string;
  note: string;
  ageLabel: (age: number) => string;
  aportesLabel: string;
  rendimentosLabel: string;
  saquesLabel: string;
  patrimonioLabel: string;
}) {
  const reduced = useReducedMotion();
  const motion = chartMotion(reduced);
  const intlLocale = htmlLang(locale);
  const c = FREEDOM_AREA_COLORS;
  const duration = reduced ? 0 : 420;
  const rawId = useId().replace(/:/g, "");
  const contribFill = `pjContrib-${rawId}`;
  const returnsFill = `pjReturns-${rawId}`;
  const withdrawFill = `pjWithdraw-${rawId}`;
  const plot = useMemo(
    () =>
      densifyMonotone(
        data.map((point) => ({
          age: point.age,
          wealth: point.patrimonio,
          contributions: point.aportes,
          returns: point.rendimentos,
          withdrawals: point.saques,
          accumulate: null,
          withdraw: null,
        })),
        12
      ).map((point) => ({
        ...point,
        aportes: point.contributions,
        rendimentos: point.returns,
        saques: point.withdrawals,
        patrimonio: point.wealth,
      })),
    [data]
  );

  return (
    <figure
      className="landing-chart landing-chart--compact landing-chart--area landing-chart--premium"
      data-landing-chart="projection"
      data-chart="ProjectionChart"
      data-chart-area="aportes-rendimentos-saques"
      data-chart-line="patrimonio"
      data-chart-curve="monotone"
    >
      <div className="landing-chart-head">
        <figcaption>
          <p className="landing-chart-kicker">{kicker}</p>
          <p className="landing-chart-peak">{peakLabel}</p>
        </figcaption>
        <ul className="landing-chart-legend">
          <li data-stack="wealth">
            <span className="landing-chart-swatch" aria-hidden="true" />
            {patrimonioLabel}
          </li>
          <li data-stack="contributions">
            <span className="landing-chart-swatch" aria-hidden="true" />
            {aportesLabel}
          </li>
          <li data-stack="returns">
            <span className="landing-chart-swatch" aria-hidden="true" />
            {rendimentosLabel}
          </li>
          <li data-stack="withdrawals">
            <span className="landing-chart-swatch" aria-hidden="true" />
            {saquesLabel}
          </li>
        </ul>
      </div>
      <div className="landing-chart-plot" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={plot}
            margin={{ top: 12, right: 16, left: 0, bottom: 6 }}
          >
            <defs>
              <linearGradient id={contribFill} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={c.contributions}
                  stopOpacity={c.contribFrom}
                />
                <stop
                  offset="100%"
                  stopColor={c.contributions}
                  stopOpacity={c.contribTo}
                />
              </linearGradient>
              <linearGradient id={returnsFill} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={c.returns}
                  stopOpacity={c.returnsFrom}
                />
                <stop
                  offset="100%"
                  stopColor={c.returns}
                  stopOpacity={c.returnsTo}
                />
              </linearGradient>
              <linearGradient id={withdrawFill} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={c.withdrawals}
                  stopOpacity={c.withdrawFrom}
                />
                <stop
                  offset="100%"
                  stopColor={c.withdrawals}
                  stopOpacity={c.withdrawTo}
                />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="age"
              tick={{ fontSize: 11, fill: "#9a9590" }}
              axisLine={false}
              tickLine={false}
              minTickGap={32}
              interval="equidistantPreserveStart"
              tickFormatter={(value: number) => String(Math.round(value))}
            />
            <YAxis
              tickFormatter={(value: number) =>
                formatAxis(value, currency, intlLocale)
              }
              tick={{ fontSize: 11, fill: "#9a9590" }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip
              content={
                <ChartTooltip
                  currency={currency}
                  intlLocale={intlLocale}
                  ageLabel={ageLabel}
                  aportesLabel={aportesLabel}
                  rendimentosLabel={rendimentosLabel}
                  saquesLabel={saquesLabel}
                  patrimonioLabel={patrimonioLabel}
                />
              }
              cursor={{ stroke: c.line, strokeWidth: 1, strokeOpacity: 0.22 }}
            />
            <Area
              type="monotone"
              dataKey="lineY"
              name={saquesLabel}
              stroke="none"
              fill={`url(#${withdrawFill})`}
              fillOpacity={1}
              dot={false}
              activeDot={false}
              isAnimationActive={motion.isAnimationActive}
              animationDuration={duration}
              animationEasing={motion.animationEasing}
            />
            <Area
              type="monotone"
              dataKey="goldTop"
              name={rendimentosLabel}
              stroke="none"
              fill={`url(#${returnsFill})`}
              fillOpacity={1}
              dot={false}
              activeDot={false}
              isAnimationActive={motion.isAnimationActive}
              animationDuration={duration}
              animationEasing={motion.animationEasing}
            />
            <Area
              type="monotone"
              dataKey="blueTop"
              name={aportesLabel}
              stroke="none"
              fill={`url(#${contribFill})`}
              fillOpacity={1}
              dot={false}
              activeDot={false}
              isAnimationActive={motion.isAnimationActive}
              animationDuration={duration}
              animationEasing={motion.animationEasing}
            />
            <Line
              type="monotone"
              dataKey="lineY"
              name={patrimonioLabel}
              stroke={c.line}
              strokeWidth={2.75}
              dot={false}
              activeDot={{
                r: 4.5,
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
