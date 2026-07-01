"use client";

import { useMemo } from "react";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { buildCashFlowChartSeries } from "@/lib/cashFlowChartData";
import { getChartHorizonAge } from "@/lib/projectionUtils";
import { Waves } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue } from "@/types";

export function CashFlowPageContent() {
  const { t } = useTranslation();
  const projections = useAppStore((s) => s.projections);
  const kpis = useAppStore((s) => s.kpis);
  const currency = useAppStore((s) => s.currency);
  const horizon = getChartHorizonAge(projections, kpis);

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
        <p className="text-xs text-muted-foreground mb-3">
          {t("chart.cashflow.subtitleDetail", {
            from: kpis.currentAge,
            to: horizon,
          })}
        </p>
        <div className="cash-flow-phase-legend mb-4">
          <span className="cash-flow-phase-pill cash-flow-phase-pill--accum">
            {t("chart.phase.accumulation")}
          </span>
          <span className="cash-flow-phase-pill cash-flow-phase-pill--retire">
            {t("chart.phase.retirement")}
          </span>
        </div>
        <div className="cash-flow-page-chart">
          <CashFlowChart projections={projections} kpis={kpis} currency={currency} />
        </div>
        <p className="cash-flow-chart-footnote mt-3">
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
    </div>
  );
}