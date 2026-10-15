"use client";

import { Briefcase } from "lucide-react";
import { RealPortfolio } from "@/components/dashboard/RealPortfolio";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConnectorsSection } from "@/components/connectors/ConnectorsSection";
import { B3ConsentCard } from "@/components/settings/B3ConsentCard";
import { ImportFilesCard } from "@/components/settings/ImportFilesCard";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function PortfolioPageContent() {
  const { t } = useTranslation();

  return (
    <div className="secondary-page">
      <PageHeader
        icon={Briefcase}
        title={t("portfolio.page.title")}
        description={t("portfolio.page.description")}
        backHref="/"
        backLabel={t("common.backToDashboard")}
      />

      <section className="card-surface p-4 sm:p-6">
        <RealPortfolio />
      </section>

      <div className="mt-4">
        <ConnectorsSection>
          <ImportFilesCard />
          <B3ConsentCard />
        </ConnectorsSection>
      </div>
    </div>
  );
}