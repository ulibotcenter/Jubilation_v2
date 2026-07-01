"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { canAccess } from "@/lib/plans";
import { useAppStore } from "@/store/useAppStore";
import { calculatePortfolioValue, formatCurrencyValue } from "@/types";

export function NetWorthHistoryCard() {
  const { t } = useTranslation();
  const portfolio = useAppStore((s) => s.portfolio);
  const snapshots = useAppStore((s) => s.netWorthSnapshots);
  const addSnapshot = useAppStore((s) => s.addNetWorthSnapshot);
  const plan = useAppStore((s) => s.planTier);
  const currency = useAppStore((s) => s.currency);

  if (!canAccess(plan, "net_worth_history") && snapshots.length === 0) {
    return (
      <div className="card-surface p-4 text-xs text-muted-foreground">
        {t("netWorth.locked")}
      </div>
    );
  }

  const capture = () => {
    const value = calculatePortfolioValue(portfolio);
    addSnapshot(value);
    toast.success(t("toast.netWorth.saved"));
  };

  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold">{t("netWorth.title")}</h3>
        <button type="button" className="btn-secondary text-xs gap-1" onClick={capture}>
          <Plus className="w-3 h-3" size={12} /> {t("netWorth.snapshot")}
        </button>
      </div>
      {snapshots.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("netWorth.empty")}</p>
      ) : (
        <ul className="space-y-1 max-h-32 overflow-y-auto">
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