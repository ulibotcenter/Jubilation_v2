"use client";

import { Briefcase } from "lucide-react";
import { RealPortfolio } from "@/components/dashboard/RealPortfolio";
import { PageHeader } from "@/components/layout/PageHeader";

export function PortfolioPageContent() {
  return (
    <div className="secondary-page">
      <PageHeader
        icon={Briefcase}
        title="Real Portfolio"
        description="Your tracked holdings with live prices, allocation, and performance."
        backHref="/"
        backLabel="Back to dashboard"
      />

      <section className="card-surface p-4 sm:p-6">
        <RealPortfolio />
      </section>
    </div>
  );
}