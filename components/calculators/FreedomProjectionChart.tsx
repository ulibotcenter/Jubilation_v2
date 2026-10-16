"use client";

import { useReducedMotion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FREEDOM_STACK_COLORS } from "@/lib/chartColors";
import type { FreedomChartPoint } from "@/lib/calculators/chartSeries";
import { htmlLang } from "@/lib/i18n/htmlLang";
import type { AppLocale } from "@/lib/i18n/messages";
import { chartMotion } from "@/lib/uiMotion";
import { formatCurrencyValue, type Currency } from "@/types";

function formatAxis(value: number, currency: Currency, intlLocale: string) {
  return formatCurrencyValue(value, currency, true, intlLocale);
}

function StackTooltip({
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
  payload?: Array<{ value?: number; dataKey?: string; color?: string }>;
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
  const valueOf = (key: string) =>
    payload.find((item) => item.dataKey === key)?.value ?? 0;
  const contributions = valueOf("contributions");
  const returns = valueOf("returns");
  const withdrawals = valueOf("withdrawals");
  const wealth = contributions + returns;
  const rows = [
    {
      key: "contributions",
      label: contributionsLabel,
      value: contributions,
      color: FREEDOM_STACK_COLORS.contributions,
    },
    {
      key: "returns",
      label: returnsLabel,
      value: returns,
      color: FREEDOM_STACK_COLORS.returns,
    },
    {
      key: "withdrawals",
      label: withdrawalsLabel,
      value: withdrawals,
      color: FREEDOM_STACK_COLORS.withdrawals,
    },
  ];
  return (
    <div className="landing-chart-tooltip">
      <p className="landing-chart-tooltip-label">{ageLabel(label)}</p>
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
      <p className="landing-chart-tooltip-value">
        {wealthLabel}{" "}
        {formatCurrencyValue(wealth, currency, false, intlLocale)}
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
  const c = FREEDOM_STACK_COLORS;

  return (
    <figure
      className="landing-chart landing-chart--compact landing-chart--stack"
      data-landing-chart="projection"
      data-chart-stack="contributions-returns-withdrawals"
    >
      <div className="landing-chart-head">
        <figcaption>
          <p className="landing-chart-kicker">{kicker}</p>
          <p className="landing-chart-peak">{peakLabel}</p>
        </figcaption>
        <p className="landing-chart-note">{note}</p>
      </div>
      <ul className="landing-chart-legend">
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
      <div className="landing-chart-plot" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={series}
            margin={{ top: 12, right: 8, left: 4, bottom: 4 }}
            barCategoryGap="18%"
            barGap={0}
          >
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
                <StackTooltip
                  currency={currency}
                  intlLocale={intlLocale}
                  ageLabel={ageLabel}
                  contributionsLabel={contributionsLabel}
                  returnsLabel={returnsLabel}
                  withdrawalsLabel={withdrawalsLabel}
                  wealthLabel={wealthLabel}
                />
              }
              cursor={{ fill: c.cursor }}
            />
            <Bar
              dataKey="contributions"
              name={contributionsLabel}
              stackId="wealth"
              fill={c.contributions}
              maxBarSize={22}
              isAnimationActive={motion.isAnimationActive}
              animationDuration={reduced ? 0 : 280}
              animationEasing={motion.animationEasing}
            />
            <Bar
              dataKey="returns"
              name={returnsLabel}
              stackId="wealth"
              fill={c.returns}
              maxBarSize={22}
              isAnimationActive={motion.isAnimationActive}
              animationDuration={reduced ? 0 : 280}
              animationEasing={motion.animationEasing}
            />
            <Bar
              dataKey="withdrawals"
              name={withdrawalsLabel}
              stackId="wealth"
              fill={c.withdrawals}
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
              isAnimationActive={motion.isAnimationActive}
              animationDuration={reduced ? 0 : 280}
              animationEasing={motion.animationEasing}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
