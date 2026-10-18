"use client";

import { useEffect, useState } from "react";
import { Briefcase, Sparkles } from "lucide-react";
import { AddAssetModal } from "@/components/ui/AddAssetModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLocationHash } from "@/hooks/useLocationHash";
import { CALCULATOR_PATHS } from "@/lib/calculators/seo";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { PLANS_PATH } from "@/lib/routes";

export function PainelEmptyState() {
  const { t } = useTranslation();

  return (
    <section
      className="mb-6"
      data-empty="painel"
      aria-labelledby="empty-painel-title"
    >
      <EmptyState
        wide
        heading="h1"
        titleId="empty-painel-title"
        icon={Sparkles}
        title={t("empty.painel.title")}
        description={t("empty.painel.body")}
        links={[
          {
            label: t("empty.painel.cta"),
            href: CALCULATOR_PATHS.freedomDate,
            testId: "calculator",
          },
          {
            label: t("landing.cta.plans"),
            href: PLANS_PATH,
            variant: "secondary",
            testId: "plans",
          },
        ]}
      />
    </section>
  );
}

export function PortfolioEmptyState({ canAdd = false }: { canAdd?: boolean }) {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div data-empty="portfolio">
      <EmptyState
        wide
        heading="h2"
        titleId="empty-portfolio-title"
        icon={Briefcase}
        title={t("empty.portfolio.title")}
        description={t("empty.portfolio.body")}
        action={
          canAdd
            ? {
                label: t("portfolio.addAsset"),
                onClick: () => setAddOpen(true),
                testId: "add",
              }
            : undefined
        }
        links={
          canAdd
            ? [
                {
                  label: t("empty.painel.cta"),
                  href: CALCULATOR_PATHS.freedomDate,
                  variant: "secondary",
                  testId: "calculator",
                },
              ]
            : [
                {
                  label: t("landing.cta.plans"),
                  href: PLANS_PATH,
                  testId: "plans",
                },
                {
                  label: t("empty.painel.cta"),
                  href: CALCULATOR_PATHS.freedomDate,
                  variant: "secondary",
                  testId: "calculator",
                },
              ]
        }
      />
      {canAdd ? (
        <AddAssetModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          mode="real"
        />
      ) : null}
    </div>
  );
}

/** No saved plan, or a planner with no book and no money inputs. */
export function UnplannedPainel({ canAdd }: { canAdd: boolean }) {
  const { t } = useTranslation();
  const hash = useLocationHash();
  const portfolioFocus = hash === "#portfolio";

  useEffect(() => {
    if (!portfolioFocus) return;
    document.getElementById("portfolio")?.scrollIntoView({
      block: "start",
    });
  }, [portfolioFocus]);

  if (portfolioFocus) {
    return (
      <section
        id="portfolio"
        className="scroll-mt-6 mb-6"
        aria-label={t("portfolio.section.title")}
      >
        <PortfolioEmptyState canAdd={canAdd} />
      </section>
    );
  }

  return <PainelEmptyState />;
}
