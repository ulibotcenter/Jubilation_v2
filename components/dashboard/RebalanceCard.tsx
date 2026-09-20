"use client";

import { useMemo } from "react";
import { PieChart } from "lucide-react";
import { getAssetClassLabel } from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { currentAllocation } from "@/lib/rebalance";
import { FALLBACK_FX_RATES } from "@/lib/fx/types";
import { useAppStore } from "@/store/useAppStore";

export function RebalanceCard() {
  const { t, locale } = useTranslation();
  const portfolio = useAppStore((s) => s.portfolio);
  const currency = useAppStore((s) => s.currency);
  const rates = useAppStore((s) => s.fxSnapshot?.rates) ?? FALLBACK_FX_RATES;
  const slices = useMemo(
    () => currentAllocation(portfolio, { currency, rates }),
    [portfolio, currency, rates]
  );

  return (
    <div className="dashboard-insight-card card-surface p-4">
      <div className="dashboard-insight-header flex items-center gap-2">
        <PieChart className="w-4 h-4 text-accent shrink-0" size={16} />
        <h3 className="text-sm font-bold">{t("rebalance.title")}</h3>
      </div>
      {slices.length === 0 ? (
        <p className="dashboard-insight-body text-xs text-muted-foreground">
          {t("rebalance.empty")}
        </p>
      ) : (
        <ul
          className="dashboard-insight-body space-y-1.5"
          data-testid="allocation-mix"
        >
          {slices.slice(0, 4).map((s) => (
            <li
              key={s.assetClass}
              className="text-xs flex justify-between gap-2"
              data-testid={`allocation-mix-${s.assetClass}`}
            >
              <span className="text-muted-foreground">
                {getAssetClassLabel(locale, s.assetClass)}
              </span>
              <span className="tabular-nums">{s.currentPct}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
