"use client";

import { useId, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { Shield } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  useChartWidth,
  useXAxisScale,
  useYAxisScale,
} from "recharts";
import { FREEDOM_AREA_COLORS } from "@/lib/chartColors";
import type { ProjectionChartPoint } from "@/lib/calculators/chartSeries";
import { densifyJourney } from "@/lib/calculators/smoothPlot";
import { htmlLang } from "@/lib/i18n/htmlLang";
import type { AppLocale } from "@/lib/i18n/messages";
import { chartMotion } from "@/lib/uiMotion";
import { formatCurrencyValue, type Currency } from "@/types";

type PlotPoint = ProjectionChartPoint & {
  blueTop: number;
  goldTop: number;
  coral: number;
  lineY: number;
};

function formatAxis(value: number, currency: Currency, intlLocale: string) {
  return formatCurrencyValue(value, currency, true, intlLocale);
}

function ageTicks(plot: PlotPoint[]): number[] {
  if (plot.length === 0) return [];
  const start = Math.round(plot[0]!.age);
  const end = Math.round(plot.at(-1)!.age);
  const ticks = new Set<number>([start, end]);
  const step = 10;
  const first = Math.ceil((start + 1) / step) * step;
  for (let age = first; age < end; age += step) ticks.add(age);
  return [...ticks].sort((a, b) => a - b);
}

function nearest(plot: PlotPoint[], age: number): PlotPoint {
  return plot.reduce((best, point) =>
    Math.abs(point.age - age) < Math.abs(best.age - age) ? point : best
  );
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
    payload?: PlotPoint;
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

function BandLabel({
  x,
  y,
  fill,
  title,
  hint,
  compact,
}: {
  x: number;
  y: number;
  fill: string;
  title: string;
  hint: string;
  compact: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill={fill}
      style={{ fontSize: compact ? 10 : 11, fontWeight: 600 }}
    >
      <tspan x={x} dy={0}>
        {title}
      </tspan>
      {hint ? (
        <tspan
          x={x}
          dy={13}
          style={{ fontSize: compact ? 8 : 9, fontWeight: 500, fillOpacity: 0.85 }}
        >
          {hint}
        </tspan>
      ) : null}
    </text>
  );
}

function JourneyMarks({
  plot,
  peak,
  end,
  peakTitle,
  peakDetail,
  endTitle,
  endDetail,
  aportesLabel,
  aportesHint,
  rendimentosLabel,
  rendimentosHint,
  saquesLabel,
  saquesHint,
}: {
  plot: PlotPoint[];
  peak: PlotPoint;
  end: PlotPoint;
  peakTitle: string;
  peakDetail: string;
  endTitle: string;
  endDetail: string;
  aportesLabel: string;
  aportesHint: string;
  rendimentosLabel: string;
  rendimentosHint: string;
  saquesLabel: string;
  saquesHint: string;
}) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const width = useChartWidth();
  if (!xScale || !yScale || plot.length < 2) return null;

  const px = xScale(peak.age);
  const py = yScale(peak.lineY);
  const ex = xScale(end.age);
  const ey = yScale(end.lineY);
  if (px == null || py == null || ex == null || ey == null) return null;

  const start = plot[0]!.age;
  const last = plot.at(-1)!.age;
  const span = Math.max(1, last - start);
  const compact = (width ?? 800) < 560;
  const aportesAt = nearest(plot, start + span * 0.28);
  const returnsAt = nearest(plot, start + span * 0.58);
  const withdrawAt = nearest(plot, start + span * 0.78);

  const ax = xScale(aportesAt.age);
  const ay = yScale((aportesAt.coral + aportesAt.blueTop) / 2);
  const rx = xScale(returnsAt.age);
  const ry = yScale((returnsAt.blueTop + returnsAt.goldTop) / 2);
  const wx = xScale(withdrawAt.age);
  const wy = yScale(Math.max(withdrawAt.coral / 2, withdrawAt.coral * 0.55));

  const c = FREEDOM_AREA_COLORS;

  return (
    <g className="projection-chart-marks" pointerEvents="none">
      {ax != null && ay != null && aportesAt.blueTop > 0 ? (
        <BandLabel
          x={ax}
          y={ay}
          fill="#5A7388"
          title={aportesLabel}
          hint={compact ? "" : aportesHint}
          compact={compact}
        />
      ) : null}
      {rx != null && ry != null && returnsAt.rendimentos > 0 ? (
        <BandLabel
          x={rx}
          y={ry}
          fill="#9A7B3A"
          title={rendimentosLabel}
          hint={compact ? "" : rendimentosHint}
          compact={compact}
        />
      ) : null}
      {wx != null &&
      wy != null &&
      withdrawAt.coral > 0 &&
      withdrawAt.saques > 0 ? (
        <BandLabel
          x={wx}
          y={wy}
          fill="#B56B64"
          title={saquesLabel}
          hint={compact ? "" : saquesHint}
          compact={compact}
        />
      ) : null}

      <text
        x={px}
        y={py - 28}
        textAnchor="middle"
        fill={c.line}
        style={{ fontSize: compact ? 10 : 11, fontWeight: 650 }}
      >
        <tspan x={px} dy={0}>
          {peakTitle}
        </tspan>
        <tspan x={px} dy={13} style={{ fontWeight: 500, fontSize: compact ? 9 : 10 }}>
          {peakDetail}
        </tspan>
      </text>
      <text
        x={ex + 12}
        y={ey - 6}
        textAnchor="start"
        fill={c.line}
        style={{ fontSize: compact ? 10 : 11, fontWeight: 650 }}
      >
        <tspan x={ex + 12} dy={0}>
          {endTitle}
        </tspan>
        <tspan x={ex + 12} dy={13} style={{ fontWeight: 500, fontSize: compact ? 9 : 10 }}>
          {endDetail}
        </tspan>
      </text>
    </g>
  );
}

export function ProjectionChart({
  data,
  currency,
  locale,
  title,
  subtitle,
  description,
  peakTitle,
  peakDetail,
  endTitle,
  endDetail,
  axisAgeLabel,
  footerLabel,
  footerHint,
  ageLabel,
  aportesLabel,
  aportesHint,
  rendimentosLabel,
  rendimentosHint,
  saquesLabel,
  saquesHint,
  patrimonioLabel,
}: {
  data: ProjectionChartPoint[];
  currency: Currency;
  locale: AppLocale;
  title: string;
  subtitle: string;
  description: string;
  peakTitle: string;
  peakDetail: string;
  endTitle: string;
  endDetail: string;
  axisAgeLabel: string;
  footerLabel: string;
  footerHint: string;
  ageLabel: (age: number) => string;
  aportesLabel: string;
  aportesHint: string;
  rendimentosLabel: string;
  rendimentosHint: string;
  saquesLabel: string;
  saquesHint: string;
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

  const plot = useMemo<PlotPoint[]>(() => {
    const series = data.map((point) => ({
      age: point.age,
      wealth: point.patrimonio,
      contributions: point.aportes,
      returns: point.rendimentos,
      withdrawals: point.saques,
      accumulate: null,
      withdraw: null,
    }));
    return densifyJourney(series, 12).map((point) => ({
      age: point.age,
      aportes: point.contributions,
      rendimentos: point.returns,
      saques: point.withdrawals,
      patrimonio: point.wealth,
      blueTop: point.blueTop,
      goldTop: point.goldTop,
      coral: point.coral,
      lineY: point.lineY,
    }));
  }, [data]);

  const peak = useMemo(
    () =>
      plot.reduce(
        (best, point) => (point.lineY > best.lineY ? point : best),
        plot[0]
      ),
    [plot]
  );
  const end = plot.at(-1);
  const ticks = useMemo(() => ageTicks(plot), [plot]);
  const yMax = useMemo(() => {
    let max = 0;
    for (const point of plot) {
      max = Math.max(max, point.lineY, point.goldTop, point.blueTop, point.coral);
    }
    return max <= 0 ? 1 : max * 1.14;
  }, [plot]);

  if (!peak || !end || plot.length === 0) return null;

  return (
    <figure
      className="projection-chart"
      data-landing-chart="projection"
      data-chart="ProjectionChart"
      data-chart-area="aportes-rendimentos-saques"
      data-chart-line="patrimonio"
      data-chart-curve="monotone"
      data-chart-layout="reference"
    >
      <div className="projection-chart-head">
        <figcaption className="projection-chart-title-block">
          <p className="projection-chart-title">{title}</p>
          <p className="projection-chart-subtitle">{subtitle}</p>
          <p className="projection-chart-description">{description}</p>
        </figcaption>
        <ul className="projection-chart-legend">
          <li data-stack="contributions">
            <span className="projection-chart-swatch" aria-hidden="true" />
            <span>
              {aportesLabel}{" "}
              <em>{aportesHint}</em>
            </span>
          </li>
          <li data-stack="returns">
            <span className="projection-chart-swatch" aria-hidden="true" />
            <span>
              {rendimentosLabel}{" "}
              <em>{rendimentosHint}</em>
            </span>
          </li>
          <li data-stack="withdrawals">
            <span className="projection-chart-swatch" aria-hidden="true" />
            <span>
              {saquesLabel}{" "}
              <em>{saquesHint}</em>
            </span>
          </li>
        </ul>
      </div>
      <div className="projection-chart-plot" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={plot}
            margin={{ top: 36, right: 88, left: 4, bottom: 8 }}
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
            <CartesianGrid
              vertical={false}
              stroke={c.grid}
              strokeDasharray="4 8"
              strokeWidth={1}
            />
            <XAxis
              dataKey="age"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={ticks}
              tick={{ fontSize: 11, fill: c.axis }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
              tickFormatter={(value: number) => String(Math.round(value))}
            />
            <YAxis
              domain={[0, yMax]}
              tickFormatter={(value: number) =>
                formatAxis(value, currency, intlLocale)
              }
              tick={{ fontSize: 11, fill: c.axis }}
              axisLine={false}
              tickLine={false}
              width={64}
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
              name={patrimonioLabel}
              stroke="none"
              fill={c.pale}
              fillOpacity={0.38}
              dot={false}
              activeDot={false}
              legendType="none"
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
              legendType="none"
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
              legendType="none"
              isAnimationActive={motion.isAnimationActive}
              animationDuration={duration}
              animationEasing={motion.animationEasing}
            />
            <Area
              type="monotone"
              dataKey="coral"
              name={saquesLabel}
              stroke="none"
              fill={`url(#${withdrawFill})`}
              fillOpacity={1}
              dot={false}
              activeDot={false}
              legendType="none"
              isAnimationActive={motion.isAnimationActive}
              animationDuration={duration}
              animationEasing={motion.animationEasing}
            />
            <Line
              type="monotone"
              dataKey="lineY"
              name={patrimonioLabel}
              stroke={c.line}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
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
              legendType="none"
            />
            <ReferenceLine
              x={end.age}
              stroke={c.axis}
              strokeDasharray="4 6"
              strokeWidth={1}
              ifOverflow="visible"
            />
            <ReferenceDot
              x={peak.age}
              y={peak.lineY}
              r={5.5}
              fill={c.line}
              stroke="#fff"
              strokeWidth={2}
              ifOverflow="visible"
            />
            <ReferenceDot
              x={end.age}
              y={end.lineY}
              r={6}
              fill="#fff"
              stroke={c.line}
              strokeWidth={2}
              ifOverflow="visible"
            />
            <JourneyMarks
              plot={plot}
              peak={peak}
              end={end}
              peakTitle={peakTitle}
              peakDetail={peakDetail}
              endTitle={endTitle}
              endDetail={endDetail}
              aportesLabel={aportesLabel}
              aportesHint={aportesHint}
              rendimentosLabel={rendimentosLabel}
              rendimentosHint={rendimentosHint}
              saquesLabel={saquesLabel}
              saquesHint={saquesHint}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="projection-chart-axis-age">{axisAgeLabel}</p>
      <p className="projection-chart-footer">
        <Shield aria-hidden="true" />
        <span>
          <strong>{footerLabel}</strong>
          <span>{footerHint}</span>
        </span>
      </p>
    </figure>
  );
}
