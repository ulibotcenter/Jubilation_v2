"use client";

import { showsManualTaxRate, parseManualTaxRatePct } from "@/lib/tax/manual";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { Country } from "@/types";

interface ManualTaxRateFieldProps {
  country: Country;
  value: number | null;
  onChange: (next: number | null) => void;
  id?: string;
  className?: string;
}

/** One optional % — rendered only for uncovered tax homes. */
export function ManualTaxRateField({
  country,
  value,
  onChange,
  id = "manual-tax-rate",
  className = "household-field",
}: ManualTaxRateFieldProps) {
  const { t } = useTranslation();
  if (!showsManualTaxRate(country)) return null;

  return (
    <label className={className} htmlFor={id} data-testid="manual-tax-rate-field">
      <span>{t("tax.manual.field")}</span>
      <input
        id={id}
        data-testid="manual-tax-rate"
        type="number"
        min={0}
        max={100}
        step={0.1}
        inputMode="decimal"
        value={value ?? ""}
        placeholder="0"
        onChange={(e) => onChange(parseManualTaxRatePct(e.target.value))}
      />
      <span className="text-[11px] text-muted-foreground mt-1">
        {t("tax.manual.why")}
      </span>
    </label>
  );
}
