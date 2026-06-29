"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { FlaskConical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { IncomeGoalPanel } from "@/components/dashboard/IncomeGoalPanel";
import { KPICards } from "@/components/dashboard/KPICards";
import { ProjectionChartCard } from "@/components/dashboard/ProjectionChartCard";
import { RealPortfolio } from "@/components/dashboard/RealPortfolio";
import { SimulationTab } from "@/components/dashboard/SimulationTab";
import { PlaygroundDiffPanel } from "@/components/simulation/PlaygroundDiffPanel";
import { PlaygroundSummaryStrip } from "@/components/simulation/PlaygroundSummaryStrip";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAppStore } from "@/store/useAppStore";

export function SimulationPlaygroundPage() {
  const sim = useAppStore((s) => s.simPlayground);
  const currency = useAppStore((s) => s.currency);
  const copyPortfolioToSimulation = useAppStore(
    (s) => s.copyPortfolioToSimulation
  );
  const ensureSimPlayground = useAppStore((s) => s.ensureSimPlayground);

  const projectedPortfolio = useMemo(() => {
    const finalRow = sim.projections[sim.projections.length - 1];
    return finalRow?.portfolioValue ?? 0;
  }, [sim.projections]);

  useEffect(() => {
    ensureSimPlayground();
  }, [ensureSimPlayground]);

  const handleReset = () => {
    copyPortfolioToSimulation();
    toast.success("Reset to real portfolio", {
      description:
        "Playground restored from your current holdings and assumptions.",
    });
  };

  return (
    <div className="secondary-page space-y-6">
      <PageHeader
        icon={FlaskConical}
        title="Simulation Playground"
        description="Pre-filled from your real portfolio. Your sandbox persists between sessions until you reset."
        backHref="/"
        backLabel="Back to dashboard"
      />

      <motion.div
        className="playground-toolbar"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="playground-badge">
          <FlaskConical className="w-3.5 h-3.5" size={14} />
          Sandbox mode
          {sim.copiedAt && (
            <span className="text-muted-foreground font-normal">
              · synced{" "}
              {new Date(sim.copiedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn-secondary gap-1.5"
          onClick={handleReset}
        >
          <RotateCcw className="w-4 h-4" size={16} />
          Reset to real portfolio
        </button>
      </motion.div>

      <PlaygroundSummaryStrip />

      <PlaygroundDiffPanel />

      <section aria-label="Playground income goal">
        <IncomeGoalPanel
          mode="playground"
          projectedPortfolio={projectedPortfolio}
        />
      </section>

      <section aria-label="Playground assumptions">
        <KPICards mode="playground" />
      </section>

      <ProjectionChartCard
        mode="playground"
        title="Simulated projection"
        subtitle={`Playground growth from age ${sim.kpis.currentAge} to ${sim.kpis.retirementAge}`}
        chartData={sim.chartData}
        projections={sim.projections}
        kpis={sim.kpis}
        currency={currency}
        projectionRevision={sim.projectionRevision}
        compact
      />

      <section id="playground-portfolio" className="scroll-mt-6">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Playground Portfolio
          </h2>
          <p className="text-[10px] text-muted hidden sm:block">
            Changes here do not affect your real holdings
          </p>
        </div>
        <div className="card-surface p-4 sm:p-6">
          <RealPortfolio mode="playground" />
        </div>
      </section>

      <SimulationTab mode="playground" hideChart />
    </div>
  );
}