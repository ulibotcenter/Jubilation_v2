"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { canUseFullPlanner, plannerGateReady } from "@/lib/plans";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

export function FreePlanGate() {
  const { t } = useTranslation();
  return (
    <section className="card-surface p-6 sm:p-8 space-y-4" data-plan-gate="free">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
        {t("plan.free")}
      </p>
      <h2 className="text-xl font-bold">{t("free.gate.title")}</h2>
      <p className="text-sm text-muted-foreground max-w-xl">{t("free.gate.body")}</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/calculadoras" className="btn-primary">
          {t("free.gate.calculator")}
        </Link>
        <Link href="/planos" className="btn-secondary">
          {t("free.gate.plans")}
        </Link>
        <Link href="/settings#cloud-account" className="btn-ghost text-sm">
          {t("free.gate.signup")}
        </Link>
      </div>
    </section>
  );
}

/** Paid planner, or the public-calculator gate. Waits for billing status so a paid plan does not flash as free. */
export function PlannerGate({
  children,
  empty,
}: {
  children: ReactNode;
  /** Replaces the free-plan gate. Cash flow and simulation keep the default. */
  empty?: ReactNode;
}) {
  const planTier = useAppStore((s) => s.planTier);
  const billingChecked = useAppStore((s) => s.billingChecked);
  const billingLive = useAppStore((s) => s.billingLive);
  if (!plannerGateReady({ billingChecked, billingLive, planTier })) {
    return <div className="card-surface h-40 skeleton" data-plan-gate="pending" />;
  }
  if (!canUseFullPlanner(planTier)) return empty ?? <FreePlanGate />;
  return children;
}
