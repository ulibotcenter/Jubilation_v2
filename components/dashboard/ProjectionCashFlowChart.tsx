"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WealthFlowTooltip } from "@/components/ui/WealthFlowTooltip";
import { buildCashFlowChartSeries } from "@/lib/cashFlowChartData";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  CURRENCY_SYMBOLS,
  formatCurrencyValue,
  type ChartDataPoint,
  type Currency,
  type KPIValues,
  type ProjectionYear,
} from "@/types";

interface ProjectionCashFlowChartProps {
  chartData: ChartDataPoint[];
  projections: ProjectionYear[];
  kpis: KPIValues;
  currency: Currency;
  projectionRevision: number;
}

export function ProjectionCashFlowChart({
  projections,
  kpis,
  currency,
  projectionRevision,
}: ProjectionCashFlowChartProps) {
  const { t } = useTranslation();
  const sym = CURRENCY_SYMBOLS[currency];

  const flowData = useMemo(
    () =>
      buildCashFlowChartSeries(projections, kpis, {
        untilAge: kpis.retirementAge,
      }).filter(
        (d) =>
          d.openingWealth > 0 ||
          d.contributions > 0 ||
          d.returns > 0 ||
          d.livingCost > 0
      ),
    [projections, kpis]
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

  const monthlyNeed = formatCurrencyValue(
    (flowData.find((d) => d.livingCost > 0)?.livingCost ?? 0) / 12,
    currency
  );

  return (
    <div className="cash-flow-chart-wrap">
      <div className="cash-flow-chart-header">
        <p className="cash-flow-chart-title">{t("chart.cashflow.title")}</p>
        <p className="cash-flow-chart-subtitle">
          {t("chart.cashflow.subtitleDetail")}
        </p>
      </div>
      <div className="cash-flow-chart-container cash-flow-chart-container--tall">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            key={`cashflow-${projectionRevision}`}
            data={flowData}
            margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
            barCategoryGap="18%"
            barGap={4}
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
              content={<WealthFlowTooltip currency={currency} />}
              cursor={{ fill: "rgba(255,112,64,0.06)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              iconType="square"
              iconSize={8}
            />
            <Bar
              dataKey="openingWealth"
              name={t("chart.cashflow.openingWealth")}
              stackId="build"
              fill="#6366f1"
              maxBarSize={32}
            />
            <Bar
              dataKey="contributions"
              name={t("chart.cashflow.contributions")}
              stackId="build"
              fill="#22c55e"
              maxBarSize={32}
            />
            <Bar
              dataKey="returns"
              name={t("chart.cashflow.investmentReturns")}
              stackId="build"
              fill="#60a5fa"
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="livingCost"
              name={t("chart.cashflow.living")}
              fill="#f87171"
              maxBarSize={22}
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
      <p className="cash-flow-chart-footnote">
        {t("chart.cashflow.footnote", { amount: monthlyNeed })}
      </p>
    </div>
  );
}