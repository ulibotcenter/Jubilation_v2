"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CashFlowTooltip } from "@/components/ui/CashFlowTooltip";
import {
  CURRENCY_SYMBOLS,
  formatCurrencyValue,
  type ChartDataPoint,
  type Currency,
} from "@/types";

interface ProjectionCashFlowChartProps {
  chartData: ChartDataPoint[];
  currency: Currency;
  projectionRevision: number;
}

export function ProjectionCashFlowChart({
  chartData,
  currency,
  projectionRevision,
}: ProjectionCashFlowChartProps) {
  const sym = CURRENCY_SYMBOLS[currency];

  const flowData = useMemo(
    () =>
      chartData.filter(
        (d) => (d.expenses ?? 0) > 0 || (d.invested ?? 0) > 0 || (d.returns ?? 0) > 0
      ),
    [chartData]
  );

  const peakFlow = useMemo(() => {
    const values = flowData.flatMap((d) => [
      d.requiredIncome ?? 0,
      d.returns ?? 0,
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
    <div className="cash-flow-chart-wrap">
      <div className="cash-flow-chart-header">
        <p className="cash-flow-chart-title">Annual cash flow</p>
        <p className="cash-flow-chart-subtitle">
          Stacked bar = living expenses + invested · Blue = market returns on
          portfolio
        </p>
      </div>
      <div className="cash-flow-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            key={`cashflow-${projectionRevision}`}
            data={flowData}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="18%"
            barGap={4}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(30,41,59,0.55)"
              vertical={false}
            />
            <XAxis
              dataKey="age"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={{ stroke: "#1e293b" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatYAxis}
              width={48}
              domain={[0, Math.ceil(peakFlow * 1.15)]}
            />
            <Tooltip
              content={<CashFlowTooltip currency={currency} />}
              cursor={{ fill: "rgba(255,112,64,0.06)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              iconType="square"
              iconSize={8}
            />
            <Bar
              dataKey="expenses"
              name="Living expenses"
              stackId="income"
              fill="#f87171"
              radius={[0, 0, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="invested"
              name="Invested"
              stackId="income"
              fill="#22c55e"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="returns"
              name="Market returns"
              fill="#60a5fa"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="cash-flow-chart-footnote">
        Income need{" "}
        <span className="text-foreground font-semibold tabular-nums">
          {formatCurrencyValue(
            (flowData[0]?.requiredIncome ?? 0) / 12,
            currency
          )}
          /mo
        </span>{" "}
        ≈ expenses + contributions · Returns vary with portfolio (variable
        income contrast)
      </p>
    </div>
  );
}