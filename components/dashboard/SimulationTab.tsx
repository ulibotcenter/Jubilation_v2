"use client";

import { motion } from "framer-motion";
import { ProjectionChartCard } from "@/components/dashboard/ProjectionChartCard";
import { ProjectionTable } from "@/components/dashboard/ProjectionTable";
import { SimulationAssumptions } from "@/components/dashboard/SimulationAssumptions";
import { MonteCarloCard } from "@/components/ui/MonteCarloCard";
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

  return (
    <div className="space-y-6">
      <SimulationAssumptions mode={mode} />

      <div
        key={`stats-${projectionRevision}`}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          {
            label: "At Retirement",
            value: finalRow
              ? formatCurrencyValue(finalRow.portfolioValue, currency, true)
              : "—",
          },
          {
            label: "Inflation-Adj.",
            value: finalRow
              ? formatCurrencyValue(finalRow.inflationAdjusted, currency, true)
              : "—",
          },
          {
            label: "Years Left",
            value: `${kpis.retirementAge - kpis.currentAge}`,
          },
          {
            label: "Real CAGR",
            value: `${(kpis.expectedCAGR - kpis.annualInflation).toFixed(1)}%`,
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
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

      {!hideChart && (
        <ProjectionChartCard
          mode={mode}
          title="Retirement Projection"
          subtitle={`Portfolio growth from age ${kpis.currentAge} to ${kpis.retirementAge}`}
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