"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FIMilestonesCard } from "@/components/dashboard/FIMilestonesCard";
import { IncomeGoalPanel } from "@/components/dashboard/IncomeGoalPanel";
import { NetWorthHistoryCard } from "@/components/dashboard/NetWorthHistoryCard";
import { ProjectionChartCard } from "@/components/dashboard/ProjectionChartCard";
import { RebalanceCard } from "@/components/dashboard/RebalanceCard";
import {
  RetirementHero,
  useHeroProjectedValue,
} from "@/components/dashboard/RetirementHero";
import { KPICards } from "@/components/dashboard/KPICards";
import { RealPortfolio } from "@/components/dashboard/RealPortfolio";
import { AppShell } from "@/components/layout/AppShell";
import { NeedleDeltaCard } from "@/components/platform/NeedleDeltaCard";
import { SensitivityPanel } from "@/components/platform/SensitivityPanel";
import { ShareSnapshotButton } from "@/components/platform/ShareSnapshotButton";
import { TaxPreviewCard } from "@/components/tax/TaxPreviewCard";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

function DashboardIncomeSection() {
  const projected = useHeroProjectedValue();
  return (
    <section className="mb-5 sm:mb-6">
      <IncomeGoalPanel projectedPortfolio={projected} />
    </section>
  );
}

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

export default function DashboardPage() {
  const { t } = useTranslation();

  return (
    <AppShell enableHashSync>
      <RetirementHero />
      <DashboardIncomeSection />

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
        <div className="dashboard-insights-stack">
          <TaxPreviewCard />
          <NetWorthHistoryCard />
          <RebalanceCard />
        </div>
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

      <footer className="mt-8 sm:mt-10 pb-6 text-center space-y-2">
        <p className="text-[10px] sm:text-xs text-muted leading-relaxed max-w-md mx-auto px-4">
          {t("footer.disclaimer")}
        </p>
        <p className="text-[10px] text-muted-foreground">
          <Link href="/cash-flow" className="text-accent hover:underline">
            {t("footer.link.cashflow")}
          </Link>
          {" · "}
          <Link href="/simulation" className="text-accent hover:underline">
            {t("footer.link.simulation")}
          </Link>
        </p>
      </footer>
    </AppShell>
  );
}