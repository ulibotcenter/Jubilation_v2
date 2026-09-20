"use client";

import { useMemo } from "react";
import { Receipt } from "lucide-react";
import { estimateRetirementTax } from "@/lib/tax/estimates";
import { isCoveredTaxHome } from "@/lib/tax/manual";
import { FALLBACK_FX_RATES } from "@/lib/fx/types";
import {
  getTaxEstimateLabel,
  getTaxEstimateNotes,
} from "@/lib/i18n/resolve";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { canAccess } from "@/lib/plans";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrencyValue } from "@/types";
import { ManualTaxRateField } from "@/components/tax/ManualTaxRateField";

export function TaxPreviewCard() {
  const { t, locale } = useTranslation();
  const kpis = useAppStore((s) => s.kpis);
  const plan = useAppStore((s) => s.planTier);
  const billingLive = useAppStore((s) => s.billingLive);
  const currency = useAppStore((s) => s.currency);
  const country = useAppStore((s) => s.country);
  const manualEffectiveTaxRatePct = useAppStore(
    (s) => s.manualEffectiveTaxRatePct
  );
  const setManualEffectiveTaxRatePct = useAppStore(
    (s) => s.setManualEffectiveTaxRatePct
  );
  const fxRates = useAppStore((s) => s.fxSnapshot?.rates) ?? FALLBACK_FX_RATES;
  const covered = isCoveredTaxHome(country);

  const annualIncome =
    kpis.desiredMonthlyIncome > 0
      ? kpis.desiredMonthlyIncome * 12
      : kpis.monthlyExpenses * 12;

  const estimate = useMemo(
    () =>
      estimateRetirementTax(country, kpis, annualIncome, {
        displayCurrency: currency,
        rates: fxRates,
        manualEffectiveTaxRatePct,
      }),
    [country, kpis, annualIncome, currency, fxRates, manualEffectiveTaxRatePct]
  );

  const label = covered
    ? getTaxEstimateLabel(locale, "br")
    : t("tax.region.manual.label");
  const notes = covered
    ? getTaxEstimateNotes(locale, "br")
    : t("tax.notes.manual");

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
      <ManualTaxRateField
        country={country}
        value={manualEffectiveTaxRatePct}
        onChange={setManualEffectiveTaxRatePct}
        id="tax-preview-manual-rate"
      />
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
