"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Copy, Eraser, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { IncomeGoalPanel } from "@/components/dashboard/IncomeGoalPanel";
import { KPICards } from "@/components/dashboard/KPICards";
import { ProjectionChartCard } from "@/components/dashboard/ProjectionChartCard";
import { RealPortfolio } from "@/components/dashboard/RealPortfolio";
import { SimulationTab } from "@/components/dashboard/SimulationTab";
import { PlaygroundDiffPanel } from "@/components/simulation/PlaygroundDiffPanel";
import { PlaygroundSummaryStrip } from "@/components/simulation/PlaygroundSummaryStrip";
import { ScenarioManager } from "@/components/simulation/ScenarioManager";
import { PageHeader } from "@/components/layout/PageHeader";
import { PersistentDisclaimer } from "@/components/legal/PersistentDisclaimer";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

export function SimulationPlaygroundPage() {
  const { t } = useTranslation();
  const sim = useAppStore((s) => s.simPlayground);
  const currency = useAppStore((s) => s.currency);
  const copyPortfolioToSimulation = useAppStore(
    (s) => s.copyPortfolioToSimulation
  );
  const clearSimulationPlayground = useAppStore(
    (s) => s.clearSimulationPlayground
  );
  const ensureSimPlayground = useAppStore((s) => s.ensureSimPlayground);

  const projectedPortfolio = useMemo(() => {
    const finalRow = sim.projections[sim.projections.length - 1];
    return finalRow?.portfolioValue ?? 0;
  }, [sim.projections]);

  useEffect(() => {
    ensureSimPlayground();
  }, [ensureSimPlayground]);

  const handleClear = () => {
    clearSimulationPlayground();
    toast.success(t("simulation.playground.clear"), {
      description: t("toast.playground.clear"),
    });
  };

  const handleCopy = () => {
    copyPortfolioToSimulation();
    toast.success(t("simulation.playground.copyPortfolio"), {
      description: t("toast.playground.copy"),
    });
  };

  return (
    <div className="secondary-page space-y-6">
      <PageHeader
        icon={FlaskConical}
        title={t("simulation.playground.title")}
        description={t("simulation.playground.description")}
        backHref="/"
        backLabel={t("common.backToDashboard")}
      />

      <PlaygroundSummaryStrip />

      <section aria-label="Playground assumptions">
        <KPICards mode="playground" />
      </section>

      <section data-sim-block="chart">
        <ProjectionChartCard
          mode="playground"
          title={t("simulation.playground.projectionTitle")}
          subtitle={t("simulation.projection.subtitle", {
            from: sim.kpis.currentAge,
            to:
              sim.projections[sim.projections.length - 1]?.age ??
              sim.kpis.retirementAge,
          })}
          chartData={sim.chartData}
          projections={sim.projections}
          kpis={sim.kpis}
          currency={currency}
          projectionRevision={sim.projectionRevision}
          showAssetFilter
        />
      </section>

      <section aria-label="Playground income goal" data-sim-block="income">
        <IncomeGoalPanel
          mode="playground"
          projectedPortfolio={projectedPortfolio}
        />
      </section>

      <PlaygroundDiffPanel />

      <section id="playground-portfolio" className="scroll-mt-6">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("simulation.playground.portfolioTitle")}
          </h2>
          <p className="text-[10px] text-muted hidden sm:block">
            {t("simulation.playground.portfolioHint")}
          </p>
        </div>
        <motion.section
          className="playground-actions mb-3"
          aria-label={t("simulation.playground.actionsLabel")}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            type="button"
            className="btn-secondary"
            data-sim-action="clear"
            onClick={handleClear}
          >
            <Eraser className="w-4 h-4" size={16} aria-hidden />
            {t("simulation.playground.clear")}
          </button>
          <button
            type="button"
            className="btn-primary"
            data-sim-action="copy"
            onClick={handleCopy}
          >
            <Copy className="w-4 h-4" size={16} aria-hidden />
            {t("simulation.playground.copyPortfolio")}
          </button>
          <p className="playground-actions-hint">
            {t("simulation.playground.actionsHint")}
          </p>
        </motion.section>
        <div className="card-surface p-4 sm:p-6">
          <RealPortfolio mode="playground" />
        </div>
      </section>

      <section
        aria-label={t("simulation.scenarios.title")}
        className="card-surface p-4"
        data-sim-block="scenarios"
      >
        <h3 className="text-sm font-bold mb-2">{t("simulation.scenarios.title")}</h3>
        <ScenarioManager />
      </section>

      <SimulationTab mode="playground" hideChart />

      <footer className="playground-page-end" data-sim-block="page-end">
        <div className="playground-toolbar">
          <div className="playground-badge">
            <FlaskConical className="w-3.5 h-3.5" size={14} />
            {t("simulation.playground.badge")}
            {sim.copiedAt && (
              <span className="text-muted-foreground font-normal">
                ·{" "}
                {t("simulation.playground.synced", {
                  date: new Date(sim.copiedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })}
              </span>
            )}
          </div>
        </div>
        <PersistentDisclaimer />
      </footer>
    </div>
  );
}
