"use client";

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
import { chartMotion } from "@/lib/uiMotion";
import { formatCurrencyValue } from "@/types";

type LandingChartPoint = { age: number; wealth: number };

function formatAxis(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)} mi`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)} mil`;
  return formatCurrencyValue(value, "BRL", false, "pt-BR");
}

function LandingTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: number;
}) {
  if (!active || payload?.[0]?.value == null || label == null) return null;
  return (
    <div className="landing-chart-tooltip">
      <p className="landing-chart-tooltip-label">Aos {label} anos</p>
      <p className="landing-chart-tooltip-value">
        {formatCurrencyValue(payload[0].value, "BRL", false, "pt-BR")}
      </p>
    </div>
  );
}

export function LandingHeroChart({
  series,
  horizonAge,
  peakWealth,
}: {
  series: LandingChartPoint[];
  horizonAge: number;
  peakWealth: number;
}) {
  const reduced = useReducedMotion();
  const motion = chartMotion(reduced);
  const peak = formatCurrencyValue(peakWealth, "BRL", true, "pt-BR");

  return (
    <figure className="landing-chart" data-landing-chart="projection">
      <div className="landing-chart-head">
        <figcaption>
          <p className="landing-chart-kicker">Exemplo ilustrativo</p>
          <p className="landing-chart-peak">
            Aos {horizonAge}, {peak}
          </p>
        </figcaption>
        <p className="landing-chart-note">
          Patrimônio em reais de hoje · juro real 4% · motor do app
        </p>
      </div>
      <div className="landing-chart-plot" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={series}
            margin={{ top: 12, right: 8, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id="landingWealthFill" x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={formatAxis}
              tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip
              content={<LandingTooltip />}
              cursor={{ stroke: PROJECTION_COLORS.cursor, strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="wealth"
              stroke={PROJECTION_COLORS.base}
              strokeWidth={2.5}
              fill="url(#landingWealthFill)"
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
