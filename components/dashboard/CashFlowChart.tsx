"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WealthFlowTooltip } from "@/components/ui/WealthFlowTooltip";
import { buildCashFlowChartSeries } from "@/lib/cashFlowChartData";
import { getChartHorizonAge } from "@/lib/projectionUtils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  CURRENCY_SYMBOLS,
  type Currency,
  type KPIValues,
  type ProjectionYear,
} from "@/types";

interface CashFlowChartProps {
  projections: ProjectionYear[];
  kpis: KPIValues;
  currency: Currency;
  revision?: number;
  tall?: boolean;
}

export function CashFlowChart({
  projections,
  kpis,
  currency,
  revision = 0,
  tall = false,
}: CashFlowChartProps) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency];
  const horizon = getChartHorizonAge(projections);

  const flowData = useMemo(
    () => buildCashFlowChartSeries(projections, kpis, { untilAge: horizon }),
    [projections, kpis, horizon]
  );

  const peakFlow = useMemo(() => {
    const values = flowData.flatMap((d) => [
      d.openingWealth + d.contributions + d.returns,
      d.livingCost,
      d.projectedBalance,
    ]);
    return Math.max(...values, 0);
  }, [flowData]);

  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1000) return `${sym}${(value / 1000).toFixed(0)}K`;
    return `${sym}${value}`;
  };

  if (flowData.length === 0) return null;

  return (
    <div
      className={
        tall
          ? "cash-flow-chart-container cash-flow-chart-container--tall"
          : "cash-flow-chart-container cash-flow-chart-container--full"
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          key={`cashflow-${revision}`}
          data={flowData}
          margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
          barCategoryGap="12%"
          barGap={3}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--chart-grid)"
            vertical={false}
          />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatYAxis}
            width={52}
            domain={[0, Math.ceil(peakFlow * 1.12)]}
          />
          <Tooltip
            content={
              <WealthFlowTooltip
                currency={currency}
                retirementAge={kpis.retirementAge}
              />
            }
            cursor={{ fill: "rgba(255,112,64,0.06)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
            iconType="square"
            iconSize={8}
          />
          <ReferenceLine
            x={kpis.retirementAge}
            stroke="#ff7040"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: t("chart.phase.retirement"),
              position: "insideTopRight",
              fill: "#ff7040",
              fontSize: 9,
            }}
          />
          <Bar
            dataKey="openingWealth"
            name={t("chart.cashflow.openingWealth")}
            stackId="build"
            fill="#6366f1"
            maxBarSize={28}
          />
          <Bar
            dataKey="contributions"
            name={t("chart.cashflow.contributions")}
            stackId="build"
            fill="#22c55e"
            maxBarSize={28}
          />
          <Bar
            dataKey="returns"
            name={t("chart.cashflow.investmentReturns")}
            stackId="build"
            fill="#60a5fa"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="livingCost"
            name={t("chart.cashflow.outflows")}
            fill="#f87171"
            maxBarSize={20}
            opacity={0.9}
          />
          <Line
            type="monotone"
            dataKey="projectedBalance"
            name={t("chart.cashflow.projectedBalance")}
            stroke="#ff7040"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#ff7040", strokeWidth: 0 }}
            legendType="line"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}