"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { canAccess } from "@/lib/plans";
import { useAppStore } from "@/store/useAppStore";
import { FALLBACK_FX_RATES } from "@/lib/fx/types";
import { calculatePortfolioValue, formatCurrencyValue } from "@/types";

export function NetWorthHistoryCard() {
  const { t } = useTranslation();
  const portfolio = useAppStore((s) => s.portfolio);
  const snapshots = useAppStore((s) => s.netWorthSnapshots);
  const addSnapshot = useAppStore((s) => s.addNetWorthSnapshot);
  const plan = useAppStore((s) => s.planTier);
  const billingLive = useAppStore((s) => s.billingLive);
  const currency = useAppStore((s) => s.currency);
  const rates = useAppStore((s) => s.fxSnapshot?.rates) ?? FALLBACK_FX_RATES;

  if (!canAccess(plan, "net_worth_history", billingLive) && snapshots.length === 0) {
    return (
      <div className="dashboard-insight-card card-surface p-4 text-xs text-muted-foreground">
        {t("netWorth.locked")}
      </div>
    );
  }

  const capture = () => {
    const value = calculatePortfolioValue(portfolio, { currency, rates });
    addSnapshot(value);
    toast.success(t("toast.netWorth.saved"));
  };

  return (
    <div className="dashboard-insight-card card-surface p-4">
      <div className="dashboard-insight-header flex items-center justify-between">
        <h3 className="text-sm font-bold">{t("netWorth.title")}</h3>
        <button type="button" className="btn-secondary text-xs gap-1" onClick={capture}>
          <Plus className="w-3 h-3" size={12} /> {t("netWorth.snapshot")}
        </button>
      </div>
      {snapshots.length === 0 ? (
        <p className="dashboard-insight-body text-xs text-muted-foreground">{t("netWorth.empty")}</p>
      ) : (
        <ul className="dashboard-insight-body space-y-1 max-h-32 overflow-y-auto">
          {snapshots.slice(-8).reverse().map((s) => (
            <li key={s.id} className="text-xs flex justify-between tabular-nums">
              <span className="text-muted-foreground">
                {new Date(s.capturedAt).toLocaleDateString()}
              </span>
              <span>{formatCurrencyValue(s.value, currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}