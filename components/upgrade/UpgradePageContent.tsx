"use client";

import { Crown, Sparkles, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { PLAN_LABELS, PLAN_PRICING, type PlanTier } from "@/lib/plans";
import { useAppStore } from "@/store/useAppStore";

const TIERS: PlanTier[] = ["free", "premium", "horizon"];

export function UpgradePageContent() {
  const { t } = useTranslation();
  const plan = useAppStore((s) => s.planTier);
  const setPlanTier = useAppStore((s) => s.setPlanTier);

  return (
    <div className="secondary-page space-y-6">
      <PageHeader
        icon={Crown}
        title={t("nav.upgrade")}
        description="Free to start. Premium and Horizon unlock depth — demo toggles below."
        backHref="/settings"
        backLabel="Back to settings"
      />
      <div className="upgrade-grid">
        {TIERS.map((tier) => {
          const meta = PLAN_PRICING[tier];
          const active = plan === tier;
          return (
            <div
              key={tier}
              className="upgrade-card"
              data-active={active ? "true" : "false"}
            >
              <div className="flex items-center gap-2 mb-2">
                {tier === "horizon" ? (
                  <Sparkles className="w-4 h-4 text-accent" size={16} />
                ) : tier === "premium" ? (
                  <Zap className="w-4 h-4 text-accent" size={16} />
                ) : (
                  <Crown className="w-4 h-4 text-muted" size={16} />
                )}
                <h3 className="font-bold">{PLAN_LABELS[tier]}</h3>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                {meta.monthly === 0 ? "Free" : `$${meta.monthly}/mo`}
              </p>
              <p className="text-xs text-muted-foreground mt-2 mb-4">{meta.tagline}</p>
              <button
                type="button"
                className={active ? "btn-secondary w-full" : "btn-primary w-full"}
                onClick={() => setPlanTier(tier)}
              >
                {active ? "Current plan" : "Select (demo)"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}