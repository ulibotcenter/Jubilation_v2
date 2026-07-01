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
import { PageHeader } from "@/components/layout/PageHeader";
import { WealthFlowTooltip } from "@/components/ui/WealthFlowTooltip";
import { buildCashFlowChartSeries } from "@/lib/cashFlowChartData";
import { Waves } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { CURRENCY_SYMBOLS } from "@/types";

export function CashFlowPageContent() {
  const { t } = useTranslation();
  const projections = useAppStore((s) => s.projections);
  const kpis = useAppStore((s) => s.kpis);
  const currency = useAppStore((s) => s.currency);
  const sym = CURRENCY_SYMBOLS[currency];

  const flowData = useMemo(
    () =>
      buildCashFlowChartSeries(projections, kpis, {
        untilAge: kpis.retirementAge,
      }),
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

  return (
    <div className="secondary-page space-y-6">
      <PageHeader
        icon={Waves}
        title={t("cashflow.title")}
        description={t("cashflow.description")}
        backHref="/"
        backLabel={t("common.backToDashboard")}
      />
      <div className="card-surface p-4 sm:p-6">
        <h3 className="text-sm font-bold mb-1">{t("cashflow.chart.title")}</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {t("chart.cashflow.subtitleDetail")}
        </p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={flowData} barCategoryGap="16%">
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--chart-grid)"
              />
              <XAxis
                dataKey="age"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickFormatter={formatYAxis}
                width={52}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                domain={[0, Math.ceil(peakFlow * 1.12)]}
              />
              <Tooltip content={<WealthFlowTooltip currency={currency} />} />
              <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={8} />
              <Bar
                dataKey="openingWealth"
                stackId="build"
                fill="#6366f1"
                name={t("chart.cashflow.openingWealth")}
              />
              <Bar
                dataKey="contributions"
                stackId="build"
                fill="#22c55e"
                name={t("chart.cashflow.contributions")}
              />
              <Bar
                dataKey="returns"
                stackId="build"
                fill="#60a5fa"
                name={t("chart.cashflow.investmentReturns")}
              />
              <Bar
                dataKey="livingCost"
                fill="#f87171"
                name={t("chart.cashflow.living")}
              />
              <Line
                type="monotone"
                dataKey="projectedBalance"
                stroke="#ff7040"
                strokeWidth={2.5}
                dot={false}
                name={t("chart.cashflow.projectedBalance")}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}