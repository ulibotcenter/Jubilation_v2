import type { KPIValues } from "@/types";
import { calculateAnnualIrpf } from "@/lib/engine/tax";

export type TaxRegion = "usa" | "eu" | "br";

export interface TaxEstimate {
  region: TaxRegion;
  label: string;
  effectiveRatePct: number;
  estimatedAnnualTax: number;
  notes: string;
}

function usaFederalPreview(income: number): { tax: number; rate: number } {
  const brackets = [
    { upTo: 11_600, rate: 0.1 },
    { upTo: 47_150, rate: 0.12 },
    { upTo: 100_525, rate: 0.22 },
    { upTo: 191_950, rate: 0.24 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.32 },
  ];
  let remaining = Math.max(0, income);
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    const slice = Math.min(remaining, b.upTo - prev);
    if (slice <= 0) break;
    tax += slice * b.rate;
    remaining -= slice;
    prev = b.upTo;
    if (remaining <= 0) break;
  }
  return { tax: Math.round(tax), rate: income > 0 ? tax / income : 0 };
}

/** Educational preview. Brazil uses the real 2026 IRPF engine (no cliff). */
export function estimateRetirementTax(
  region: TaxRegion,
  kpis: KPIValues,
  annualIncome: number
): TaxEstimate {
  const income = Math.max(0, annualIncome);

  switch (region) {
    case "usa": {
      const { tax, rate } = usaFederalPreview(income);
      return {
        region,
        label: "United States (simplified)",
        effectiveRatePct: Math.round(rate * 1000) / 10,
        estimatedAnnualTax: tax,
        notes: "Rough federal-style bracket preview. State/local not included.",
      };
    }
    case "eu":
      return {
        region,
        label: "European Union (blended)",
        effectiveRatePct: 28,
        estimatedAnnualTax: Math.round(income * 0.28),
        notes: "Illustrative blended rate for planning conversations.",
      };
    case "br": {
      const result = calculateAnnualIrpf(Math.round(income * 100), {
        age: Math.max(kpis.currentAge, kpis.retirementAge),
        retirementIncome: true,
        year: 2026,
      });
      return {
        region,
        label: "Brazil (IRPF 2026)",
        effectiveRatePct: Math.round(result.effectiveRate * 1000) / 10,
        estimatedAnnualTax: Math.round(result.taxCents / 100),
        notes:
          "Tabela progressiva 2026 + desconto simplificado + parcela 65 anos. Come-cotas e ganho de capital por veículo entram na Fase 1.",
      };
    }
  }
}
