import type { Country, Currency, KPIValues } from "@/types";
import { calculateAnnualIrpf } from "@/lib/engine/tax";
import { convertAmount } from "@/lib/fx/convert";
import { FALLBACK_FX_RATES, type FxRates } from "@/lib/fx/types";
import { taxRegionForCountry } from "@/lib/onboarding/country";
import {
  isCoveredTaxHome,
  resolveManualTaxRatePct,
} from "@/lib/tax/manual";

export type TaxRegion = "usa" | "eu" | "br";

const TAX_HOME_CURRENCY: Record<TaxRegion, Currency> = {
  usa: "USD",
  eu: "EUR",
  br: "BRL",
};

export function taxHomeCurrency(region: TaxRegion): Currency {
  return TAX_HOME_CURRENCY[region];
}

export interface TaxEstimate {
  region: TaxRegion;
  label: string;
  effectiveRatePct: number;
  estimatedAnnualTax: number;
  notes: string;
}

export interface TaxEstimateFx {
  displayCurrency: Currency;
  rates?: FxRates;
  /** Ignored when the tax home is covered (Brazil). Empty = 0. */
  manualEffectiveTaxRatePct?: number | null;
}

/** Educational preview. Covered home = IRPF. Uncovered = the % the person typed. */
export function estimateRetirementTax(
  country: Country,
  kpis: KPIValues,
  annualIncome: number,
  fx?: TaxEstimateFx
): TaxEstimate {
  const display = fx?.displayCurrency ?? "BRL";
  const rates = fx?.rates ?? FALLBACK_FX_RATES;
  const region = taxRegionForCountry(country);
  const home = TAX_HOME_CURRENCY[region];
  const incomeHome = Math.max(
    0,
    convertAmount(annualIncome, display, home, rates)
  );

  if (isCoveredTaxHome(country)) {
    const result = calculateAnnualIrpf(Math.round(incomeHome * 100), {
      age: Math.max(kpis.currentAge, kpis.retirementAge),
      retirementIncome: true,
      year: 2026,
    });
    return {
      region,
      label: "Brazil (IRPF 2026)",
      effectiveRatePct: Math.round(result.effectiveRate * 1000) / 10,
      estimatedAnnualTax: convertAmount(
        result.taxCents / 100,
        home,
        display,
        rates
      ),
      notes:
        "Tabela progressiva 2026 + desconto simplificado + parcela 65 anos. Come-cotas e ganho de capital por veículo entram na Fase 1.",
    };
  }

  const ratePct = resolveManualTaxRatePct(
    country,
    fx?.manualEffectiveTaxRatePct
  );
  return {
    region,
    label: "Manual effective rate (simplification)",
    effectiveRatePct: Math.round(ratePct * 10) / 10,
    estimatedAnnualTax: convertAmount(
      incomeHome * (ratePct / 100),
      home,
      display,
      rates
    ),
    notes:
      "Simplification until this country's rules exist. Empty = 0%. We do not invent a rate.",
  };
}
