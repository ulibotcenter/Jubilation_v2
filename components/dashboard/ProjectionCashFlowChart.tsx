"use client";

import { useMemo } from "react";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { buildCashFlowChartSeries } from "@/lib/cashFlowChartData";
import { getChartHorizonAge } from "@/lib/projectionUtils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
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
  const horizon = getChartHorizonAge(projections);

  const flowData = useMemo(
    () =>
      buildCashFlowChartSeries(projections, kpis, { untilAge: horizon }),
    [projections, kpis, horizon]
  );

  const accumulationMonthly = useMemo(() => {
    const row = flowData.find(
      (d) => d.phase === "accumulation" && d.livingCost > 0
    );
    return (row?.livingCost ?? 0) / 12;
  }, [flowData]);

  const retirementMonthly = useMemo(() => {
    const row = flowData.find(
      (d) => d.phase === "retirement" && d.livingCost > 0
    );
    return (row?.livingCost ?? 0) / 12;
  }, [flowData]);

  if (flowData.length === 0) return null;

  return (
    <div className="cash-flow-chart-wrap">
      <div className="cash-flow-chart-header">
        <p className="cash-flow-chart-title">{t("chart.cashflow.title")}</p>
        <p className="cash-flow-chart-subtitle">
          {t("chart.cashflow.subtitleDetail", {
            from: kpis.currentAge,
            to: horizon,
          })}
        </p>
        <div className="cash-flow-phase-legend">
          <span className="cash-flow-phase-pill cash-flow-phase-pill--accum">
            {t("chart.phase.accumulation")}
          </span>
          <span className="cash-flow-phase-pill cash-flow-phase-pill--retire">
            {t("chart.phase.retirement")}
          </span>
        </div>
      </div>
      <CashFlowChart
        projections={projections}
        kpis={kpis}
        currency={currency}
        revision={projectionRevision}
        tall
      />
      <p className="cash-flow-chart-footnote">
        {accumulationMonthly > 0 &&
          t("chart.cashflow.footnoteAccum", {
            amount: formatCurrencyValue(accumulationMonthly, currency),
          })}
        {accumulationMonthly > 0 && retirementMonthly > 0 && " · "}
        {retirementMonthly > 0 &&
          t("chart.cashflow.footnoteRetire", {
            amount: formatCurrencyValue(retirementMonthly, currency),
          })}
      </p>
    </div>
  );
}