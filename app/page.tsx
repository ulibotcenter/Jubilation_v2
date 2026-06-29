"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { IncomeGoalPanel } from "@/components/dashboard/IncomeGoalPanel";
import { ProjectionChartCard } from "@/components/dashboard/ProjectionChartCard";
import {
  RetirementHero,
  useHeroProjectedValue,
} from "@/components/dashboard/RetirementHero";
import { KPICards } from "@/components/dashboard/KPICards";
import { RealPortfolio } from "@/components/dashboard/RealPortfolio";
import { AppShell } from "@/components/layout/AppShell";
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
  const chartData = useAppStore((s) => s.chartData);
  const projections = useAppStore((s) => s.projections);
  const kpis = useAppStore((s) => s.kpis);
  const currency = useAppStore((s) => s.currency);
  const projectionRevision = useAppStore((s) => s.projectionRevision);

  return (
    <section className="mb-5 sm:mb-6" id="projection">
      <ProjectionChartCard
        mode="real"
        title="Real portfolio projection"
        subtitle="Based on your tracked holdings and current assumptions"
        chartData={chartData}
        projections={projections}
        kpis={kpis}
        currency={currency}
        projectionRevision={projectionRevision}
        compact
      />
      <div className="flex justify-end mt-3">
        <Link href="/simulation" className="dashboard-cta-link">
          Open simulation playground
          <ArrowRight className="w-3.5 h-3.5" size={14} />
        </Link>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <AppShell enableHashSync>
      <RetirementHero />
      <DashboardIncomeSection />

      <section className="mb-5 sm:mb-6" id="dashboard">
        <KPICards mode="real" />
      </section>

      <RealProjectionSection />

      <section id="portfolio" className="scroll-mt-6 mb-6">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Real Portfolio
          </h2>
        </div>
        <div className="card-surface p-4 sm:p-6">
          <RealPortfolio />
        </div>
      </section>

      <footer className="mt-8 sm:mt-10 pb-6 text-center space-y-2">
        <p className="text-[10px] sm:text-xs text-muted leading-relaxed max-w-md mx-auto px-4">
          Jubilation is for educational purposes only and does not provide
          financial, investment, tax, or legal advice.
        </p>
        <p className="text-[10px] text-muted-foreground">
          <Link href="/simulation" className="text-accent hover:underline">
            Run simulations in the playground →
          </Link>
        </p>
      </footer>
    </AppShell>
  );
}