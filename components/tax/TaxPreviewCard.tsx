"use client";

import { useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { estimateRetirementTax, type TaxRegion } from "@/lib/tax/estimates";
import { canAccess } from "@/lib/plans";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue } from "@/types";

export function TaxPreviewCard() {
  const kpis = useAppStore((s) => s.kpis);
  const plan = useAppStore((s) => s.planTier);
  const currency = useAppStore((s) => s.currency);
  const [region, setRegion] = useState<TaxRegion>("usa");

  const annualIncome =
    kpis.desiredMonthlyIncome > 0
      ? kpis.desiredMonthlyIncome * 12
      : kpis.monthlyExpenses * 12;

  const estimate = useMemo(
    () => estimateRetirementTax(region, kpis, annualIncome),
    [region, kpis, annualIncome]
  );

  if (!canAccess(plan, "tax_preview")) {
    return (
      <div className="card-surface p-4 text-xs text-muted-foreground">
        Tax preview (USA / EU / BR) — Premium. Educational estimates only.
      </div>
    );
  }

  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="w-4 h-4 text-accent" size={16} />
        <h3 className="text-sm font-bold">Tax preview</h3>
      </div>
      <div className="flex gap-1 mb-3">
        {(["usa", "eu", "br"] as TaxRegion[]).map((r) => (
          <button
            key={r}
            type="button"
            className="portfolio-class-chip"
            data-active={region === r ? "true" : "false"}
            onClick={() => setRegion(r)}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-1">{estimate.label}</p>
      <p className="text-lg font-bold tabular-nums">
        {formatCurrencyValue(estimate.estimatedAnnualTax, currency)}/yr
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        ~{estimate.effectiveRatePct}% effective · {estimate.notes}
      </p>
    </div>
  );
}