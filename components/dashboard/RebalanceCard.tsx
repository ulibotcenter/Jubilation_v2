"use client";

import { useMemo } from "react";
import { PieChart } from "lucide-react";
import { getAssetClassLabel } from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { suggestRebalance } from "@/lib/rebalance";
import { useAppStore } from "@/store/useAppStore";

export function RebalanceCard() {
  const { t, locale } = useTranslation();
  const portfolio = useAppStore((s) => s.portfolio);
  const suggestions = useMemo(() => suggestRebalance(portfolio), [portfolio]);

  return (
    <div className="dashboard-insight-card card-surface p-4">
      <div className="dashboard-insight-header flex items-center gap-2">
        <PieChart className="w-4 h-4 text-accent shrink-0" size={16} />
        <h3 className="text-sm font-bold">{t("rebalance.title")}</h3>
      </div>
      {suggestions.length === 0 ? (
        <p className="dashboard-insight-body text-xs text-muted-foreground">
          {t("rebalance.empty")}
        </p>
      ) : (
      <ul className="dashboard-insight-body space-y-1.5">
        {suggestions.slice(0, 4).map((s) => (
          <li key={s.assetClass} className="text-xs flex justify-between gap-2">
            <span className="text-muted-foreground">
              {getAssetClassLabel(locale, s.assetClass)}
            </span>
            <span
              className={
                s.deltaPct > 0 ? "text-green-400" : "text-amber-400"
              }
            >
              {s.currentPct}% → {s.targetPct}% ({s.deltaPct > 0 ? "+" : ""}
              {s.deltaPct}%)
            </span>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}