"use client";

import { useMemo } from "react";
import { Flag, HelpCircle } from "lucide-react";
import { computeFIMilestones, type FIMilestoneId } from "@/lib/fiMilestones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue } from "@/types";

const MILESTONE_ORDER: FIMilestoneId[] = ["half", "coast", "full"];

const TITLE_KEYS: Record<FIMilestoneId, "fi.half.title" | "fi.coast.title" | "fi.full.title"> = {
  half: "fi.half.title",
  coast: "fi.coast.title",
  full: "fi.full.title",
};

const DESC_KEYS: Record<FIMilestoneId, "fi.half.desc" | "fi.coast.desc" | "fi.full.desc"> = {
  half: "fi.half.desc",
  coast: "fi.coast.desc",
  full: "fi.full.desc",
};

export function FIMilestonesCard() {
  const kpis = useAppStore((s) => s.kpis);
  const projections = useAppStore((s) => s.projections);
  const currency = useAppStore((s) => s.currency);
  const { t } = useTranslation();

  const milestones = useMemo(
    () => computeFIMilestones(kpis, projections),
    [kpis, projections]
  );

  const byId = useMemo(
    () => Object.fromEntries(milestones.map((m) => [m.id, m])),
    [milestones]
  );

  return (
    <div className="fi-milestones card-surface p-4 sm:p-5">
      <div className="flex items-start gap-2 mb-1">
        <Flag className="w-4 h-4 text-accent shrink-0 mt-0.5" size={16} />
        <div>
          <h3 className="text-sm font-bold">{t("fi.milestones.title")}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            {t("fi.milestones.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 mt-3">
        {MILESTONE_ORDER.map((id) => {
          const m = byId[id];
          if (!m) return null;
          const reached = m.targetAge != null;
          return (
            <div key={id} className="fi-milestone-item" data-reached={reached ? "true" : "false"}>
              <p className="fi-milestone-label">{t(TITLE_KEYS[id])}</p>
              <p className="fi-milestone-age">
                {reached
                  ? t("fi.milestones.age", { n: m.targetAge! })
                  : t("fi.milestones.notYet")}
              </p>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {formatCurrencyValue(m.targetPortfolio, currency, true)}
              </p>
              <p className="fi-milestone-desc">{t(DESC_KEYS[id])}</p>
            </div>
          );
        })}
      </div>

      <p className="fi-milestones-footnote mt-3 flex items-start gap-1.5 text-[10px] text-muted-foreground">
        <HelpCircle className="w-3 h-3 shrink-0 mt-0.5 opacity-70" size={12} />
        {t("fi.milestones.footnote")}
      </p>
    </div>
  );
}