"use client";

import { motion } from "framer-motion";
import { ProjectionChartCard } from "@/components/dashboard/ProjectionChartCard";
import { ProjectionTable } from "@/components/dashboard/ProjectionTable";
import { SimulationAssumptions } from "@/components/dashboard/SimulationAssumptions";
import { MonteCarloCard } from "@/components/ui/MonteCarloCard";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue } from "@/types";

interface SimulationTabProps {
  mode?: "real" | "playground";
  hideChart?: boolean;
}

export function SimulationTab({
  mode = "real",
  hideChart = false,
}: SimulationTabProps) {
  const { t } = useTranslation();
  const currency = useAppStore((s) => s.currency);

  const chartData = useAppStore((s) =>
    mode === "playground" ? s.simPlayground.chartData : s.chartData
  );
  const projections = useAppStore((s) =>
    mode === "playground" ? s.simPlayground.projections : s.projections
  );
  const kpis = useAppStore((s) =>
    mode === "playground" ? s.simPlayground.kpis : s.kpis
  );
  const projectionRevision = useAppStore((s) =>
    mode === "playground"
      ? s.simPlayground.projectionRevision
      : s.projectionRevision
  );

  const finalRow = projections[projections.length - 1];

  const stats = [
    {
      key: "atRetirement",
      label: t("simulation.stat.atRetirement"),
      value: finalRow
        ? formatCurrencyValue(finalRow.portfolioValue, currency, true)
        : "—",
    },
    {
      key: "inflationAdj",
      label: t("simulation.stat.inflationAdj"),
      value: finalRow
        ? formatCurrencyValue(finalRow.inflationAdjusted, currency, true)
        : "—",
    },
    {
      key: "yearsLeft",
      label: t("simulation.stat.yearsLeft"),
      value: `${kpis.retirementAge - kpis.currentAge}`,
    },
    {
      key: "realCagr",
      label: t("simulation.stat.realCagr"),
      value: `${(kpis.expectedCAGR - kpis.annualInflation).toFixed(1)}%`,
    },
  ] as const;

  return (
    <div className="space-y-6">
      {mode !== "playground" && <SimulationAssumptions mode={mode} />}

      {mode !== "playground" && (
        <div
          key={`stats-${projectionRevision}`}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.key}
              className="rounded-xl border border-border bg-surface px-3 py-3 sm:p-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-base sm:text-lg font-bold text-foreground mt-1 tabular-nums">
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {!hideChart && (
        <ProjectionChartCard
          mode={mode}
          title={t("simulation.projection.title")}
          subtitle={t("simulation.projection.subtitle", {
            from: kpis.currentAge,
            to: kpis.retirementAge,
          })}
          chartData={chartData}
          projections={projections}
          kpis={kpis}
          currency={currency}
          projectionRevision={projectionRevision}
        />
      )}

      <ProjectionTable mode={mode} />
      <MonteCarloCard mode={mode} />
    </div>
  );
}