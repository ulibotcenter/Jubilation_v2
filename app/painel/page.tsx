"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FIMilestonesCard } from "@/components/dashboard/FIMilestonesCard";
import { NetWorthHistoryCard } from "@/components/dashboard/NetWorthHistoryCard";
import { ProjectionChartCard } from "@/components/dashboard/ProjectionChartCard";
import { RebalanceCard } from "@/components/dashboard/RebalanceCard";
import { RetirementHero } from "@/components/dashboard/RetirementHero";
import { KPICards } from "@/components/dashboard/KPICards";
import { OriginTotalsStrip } from "@/components/dashboard/OriginTotalsStrip";
import { UnplannedPainel } from "@/components/dashboard/EmptyScreens";
import { RealPortfolio } from "@/components/dashboard/RealPortfolio";
import { AppShell } from "@/components/layout/AppShell";
import { PlannerGate } from "@/components/plans/PlannerGate";
import { hasDashboardData } from "@/lib/dashboard/hasDashboardData";
import { NeedleDeltaCard } from "@/components/platform/NeedleDeltaCard";
import { SensitivityPanel } from "@/components/platform/SensitivityPanel";
import { ShareSnapshotButton } from "@/components/platform/ShareSnapshotButton";
import { TaxPreviewCard } from "@/components/tax/TaxPreviewCard";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

function RealProjectionSection() {
  const { t } = useTranslation();
  const chartData = useAppStore((s) => s.chartData);
  const projections = useAppStore((s) => s.projections);
  const kpis = useAppStore((s) => s.kpis);
  const currency = useAppStore((s) => s.currency);
  const projectionRevision = useAppStore((s) => s.projectionRevision);

  return (
    <section className="mb-5 sm:mb-6" id="projection">
      <ProjectionChartCard
        mode="real"
        title={t("dashboard.projection.title")}
        subtitle={t("dashboard.projection.subtitle")}
        chartData={chartData}
        projections={projections}
        kpis={kpis}
        currency={currency}
        projectionRevision={projectionRevision}
        compact
      />
      <div className="flex flex-wrap justify-end gap-2 mt-3">
        <ShareSnapshotButton />
        <Link href="/simulation" className="dashboard-cta-link">
          {t("dashboard.cta.simulation")}
          <ArrowRight className="w-3.5 h-3.5" size={14} />
        </Link>
      </div>
    </section>
  );
}

function PlannedPainel() {
  const { t } = useTranslation();
  const portfolio = useAppStore((s) => s.portfolio);
  const kpis = useAppStore((s) => s.kpis);
  const hasData = hasDashboardData({
    portfolioCount: portfolio.length,
    currentNetWorth: kpis.currentNetWorth,
    monthlyContribution: kpis.monthlyContribution,
    monthlyExpenses: kpis.monthlyExpenses,
    desiredMonthlyIncome: kpis.desiredMonthlyIncome,
  });

  if (!hasData) return <UnplannedPainel canAdd />;

  return (
    <>
      <RetirementHero />

      <OriginTotalsStrip />

      <section className="mb-5 sm:mb-6" id="dashboard">
        <KPICards mode="real" />
      </section>

      <section className="mb-5 sm:mb-6">
        <NeedleDeltaCard />
      </section>

      <section className="mb-5 sm:mb-6">
        <FIMilestonesCard />
      </section>

      <section className="mb-5 sm:mb-6 dashboard-insights-grid">
        <SensitivityPanel />
        <TaxPreviewCard />
        <NetWorthHistoryCard />
        <RebalanceCard />
      </section>

      <RealProjectionSection />

      <section id="portfolio" className="scroll-mt-6 mb-6">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("portfolio.section.title")}
          </h2>
        </div>
        <div className="card-surface p-4 sm:p-6">
          <RealPortfolio />
        </div>
      </section>
    </>
  );
}

export default function DashboardPage() {
  return (
    <AppShell enableHashSync>
      <PlannerGate empty={<UnplannedPainel canAdd={false} />}>
        <PlannedPainel />
      </PlannerGate>
    </AppShell>
  );
}
