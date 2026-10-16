"use client";

import { currentPlanDisplay } from "@/lib/plans/currentLabel";
import type { MessageKey } from "@/lib/i18n/messages";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

export type CurrentPlanPlacement = "header" | "menu" | "planos" | "settings";

export function useCurrentPlanDisplay() {
  const { t } = useTranslation();
  const planTier = useAppStore((s) => s.planTier);
  const billingLive = useAppStore((s) => s.billingLive);
  const subscriptionStatus = useAppStore((s) => s.user.subscriptionStatus);
  const display = currentPlanDisplay(billingLive, planTier, subscriptionStatus);
  const name = t(`plan.${display.plan}` as MessageKey);
  const label = display.trialing
    ? t("plan.trialing", { plan: name })
    : name;
  return { ...display, name, label };
}

export function CurrentPlanLabel({
  placement,
  className,
}: {
  placement: CurrentPlanPlacement;
  className?: string;
}) {
  const { t } = useTranslation();
  const { plan, trialing, label } = useCurrentPlanDisplay();

  return (
    <span
      className={className}
      data-current-plan-label={placement}
      data-plan-tier={plan}
      data-plan-trialing={trialing ? "true" : "false"}
      title={label}
      aria-label={t("plan.headerAria", { plan: label })}
    >
      {label}
    </span>
  );
}
