"use client";

import { useMemo } from "react";
import { Flag } from "lucide-react";
import { computeFIMilestones } from "@/lib/fiMilestones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue } from "@/types";

export function FIMilestonesCard() {
  const kpis = useAppStore((s) => s.kpis);
  const projections = useAppStore((s) => s.projections);
  const currency = useAppStore((s) => s.currency);
  const { t } = useTranslation();

  const milestones = useMemo(
    () => computeFIMilestones(kpis, projections),
    [kpis, projections]
  );

  const labelKey = {
    coast: "fi.coast",
    barista: "fi.barista",
    traditional: "fi.traditional",
  } as const;

  return (
    <div className="fi-milestones card-surface p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Flag className="w-4 h-4 text-accent" size={16} />
        <h3 className="text-sm font-bold">{t("fi.milestones.title")}</h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {milestones.map((m) => (
          <div key={m.id} className="fi-milestone-item">
            <p className="fi-milestone-label">{t(labelKey[m.id])}</p>
            <p className="fi-milestone-age">
              {m.targetAge
                ? t("fi.milestones.age", { n: m.targetAge })
                : t("fi.milestones.notYet")}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatCurrencyValue(m.targetPortfolio, currency, true)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}