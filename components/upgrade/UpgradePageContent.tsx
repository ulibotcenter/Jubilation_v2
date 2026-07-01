"use client";

import { Crown, Sparkles, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import type { MessageKey } from "@/lib/i18n/messages";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { PLAN_PRICING, type PlanTier } from "@/lib/plans";
import { useAppStore } from "@/store/useAppStore";

const TIERS: PlanTier[] = ["free", "premium", "horizon"];

const PLAN_NAME_KEYS: Record<PlanTier, MessageKey> = {
  free: "plan.free",
  premium: "plan.premium",
  horizon: "plan.horizon",
};

const PLAN_TAGLINE_KEYS: Record<PlanTier, MessageKey> = {
  free: "plan.tagline.free",
  premium: "plan.tagline.premium",
  horizon: "plan.tagline.horizon",
};

export function UpgradePageContent() {
  const { t } = useTranslation();
  const plan = useAppStore((s) => s.planTier);
  const setPlanTier = useAppStore((s) => s.setPlanTier);

  return (
    <div className="secondary-page space-y-6">
      <PageHeader
        icon={Crown}
        title={t("nav.upgrade")}
        description={t("upgrade.description")}
        backHref="/settings"
        backLabel={t("common.backToSettings")}
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
                <h3 className="font-bold">{t(PLAN_NAME_KEYS[tier])}</h3>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                {meta.monthly === 0
                  ? t("upgrade.priceFree")
                  : t("upgrade.priceMonthly", { n: meta.monthly })}
              </p>
              <p className="text-xs text-muted-foreground mt-2 mb-4">
                {t(PLAN_TAGLINE_KEYS[tier])}
              </p>
              <button
                type="button"
                className={active ? "btn-secondary w-full" : "btn-primary w-full"}
                onClick={() => setPlanTier(tier)}
              >
                {active ? t("upgrade.currentPlan") : t("upgrade.selectDemo")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}