"use client";

import { useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { taxRegionForCountry } from "@/lib/onboarding/country";
import { estimateRetirementTax, type TaxRegion } from "@/lib/tax/estimates";
import { FALLBACK_FX_RATES } from "@/lib/fx/types";
import {
  getTaxEstimateLabel,
  getTaxEstimateNotes,
} from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { canAccess } from "@/lib/plans";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue } from "@/types";

export function TaxPreviewCard() {
  const { t, locale } = useTranslation();
  const kpis = useAppStore((s) => s.kpis);
  const plan = useAppStore((s) => s.planTier);
  const billingLive = useAppStore((s) => s.billingLive);
  const currency = useAppStore((s) => s.currency);
  const country = useAppStore((s) => s.country);
  const fxRates = useAppStore((s) => s.fxSnapshot?.rates) ?? FALLBACK_FX_RATES;
  const countryRegion = taxRegionForCountry(country);
  const [pickedRegion, setPickedRegion] = useState<TaxRegion | null>(null);
  const [regionCountry, setRegionCountry] = useState(country);
  if (regionCountry !== country) {
    setRegionCountry(country);
    setPickedRegion(null);
  }
  const region = pickedRegion ?? countryRegion;

  const annualIncome =
    kpis.desiredMonthlyIncome > 0
      ? kpis.desiredMonthlyIncome * 12
      : kpis.monthlyExpenses * 12;

  const estimate = useMemo(
    () =>
      estimateRetirementTax(region, kpis, annualIncome, {
        displayCurrency: currency,
        rates: fxRates,
      }),
    [region, kpis, annualIncome, currency, fxRates]
  );

  const label = getTaxEstimateLabel(locale, region);
  const notes = getTaxEstimateNotes(locale, region);

  if (!canAccess(plan, "tax_preview", billingLive)) {
    return (
      <div className="dashboard-insight-card card-surface p-4 text-xs text-muted-foreground">
        {t("tax.locked")}
      </div>
    );
  }

  return (
    <div className="dashboard-insight-card card-surface p-4">
      <div className="dashboard-insight-header flex items-center gap-2">
        <Receipt className="w-4 h-4 text-accent shrink-0" size={16} />
        <h3 className="text-sm font-bold">{t("tax.title")}</h3>
      </div>
      <div className="dashboard-insight-body flex flex-col gap-3">
      <div className="flex gap-1">
        {(["usa", "eu", "br"] as TaxRegion[]).map((r) => (
          <button
            key={r}
            type="button"
            className="portfolio-class-chip"
            data-active={region === r ? "true" : "false"}
            onClick={() => setPickedRegion(r)}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold tabular-nums">
        {formatCurrencyValue(estimate.estimatedAnnualTax, currency)}
        {t("common.perYear")}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("tax.effective", {
          n: estimate.effectiveRatePct,
          notes,
        })}
      </p>
      </div>
    </div>
  );
}