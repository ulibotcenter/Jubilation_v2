import type { KPIValues } from "@/types";

export type TaxRegion = "usa" | "eu" | "br";

export interface TaxEstimate {
  region: TaxRegion;
  label: string;
  effectiveRatePct: number;
  estimatedAnnualTax: number;
  notes: string;
}

/** Educational preview only — not tax advice */
export function estimateRetirementTax(
  region: TaxRegion,
  kpis: KPIValues,
  annualIncome: number
): TaxEstimate {
  const income = Math.max(0, annualIncome);

  switch (region) {
    case "usa":
      return {
        region,
        label: "United States (simplified)",
        effectiveRatePct: income > 200_000 ? 22 : income > 90_000 ? 18 : 12,
        estimatedAnnualTax: Math.round(
          income * (income > 200_000 ? 0.22 : income > 90_000 ? 0.18 : 0.12)
        ),
        notes: "Rough federal-style bracket preview. State/local not included.",
      };
    case "eu":
      return {
        region,
        label: "European Union (blended)",
        effectiveRatePct: 28,
        estimatedAnnualTax: Math.round(income * 0.28),
        notes: "Illustrative blended rate for planning conversations.",
      };
    case "br":
      return {
        region,
        label: "Brazil (simplified)",
        effectiveRatePct: income > 400_000 ? 27.5 : 15,
        estimatedAnnualTax: Math.round(
          income * (income > 400_000 ? 0.275 : 0.15)
        ),
        notes: "IRPF-style preview. INSS and gains tax not modeled.",
      };
  }
}