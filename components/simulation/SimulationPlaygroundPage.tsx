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
    toast.success(t("simulation.playground.reset"), {
      description: t("toast.playground.reset"),
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

      <PersistentDisclaimer />

      <motion.div
        className="playground-toolbar"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
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
        <button
          type="button"
          className="btn-secondary gap-1.5"
          onClick={handleReset}
        >
          <RotateCcw className="w-4 h-4" size={16} />
          {t("simulation.playground.reset")}
        </button>
      </motion.div>

      <PlaygroundSummaryStrip />

      <PlaygroundDiffPanel />

      <section
        aria-label={t("simulation.scenarios.title")}
        className="card-surface p-4"
      >
        <h3 className="text-sm font-bold mb-2">{t("simulation.scenarios.title")}</h3>
        <ScenarioManager />
      </section>

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

      <section id="playground-portfolio" className="scroll-mt-6">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("simulation.playground.portfolioTitle")}
          </h2>
          <p className="text-[10px] text-muted hidden sm:block">
            {t("simulation.playground.portfolioHint")}
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