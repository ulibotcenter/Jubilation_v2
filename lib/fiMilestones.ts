import type { KPIValues, ProjectionYear } from "@/types";

export interface FIMilestone {
  id: "coast" | "barista" | "traditional";
  label: string;
  description: string;
  targetAge: number | null;
  targetPortfolio: number;
}

/** Coast FI: portfolio covers retirement spending without new contributions */
export function computeFIMilestones(
  kpis: KPIValues,
  projections: ProjectionYear[]
): FIMilestone[] {
  const annualNeed =
    kpis.desiredMonthlyIncome > 0
      ? kpis.desiredMonthlyIncome * 12
      : kpis.monthlyExpenses * 12 * 1.25;
  const traditionalTarget = annualNeed * 25;
  const coastTarget = traditionalTarget;
  const baristaTarget = traditionalTarget * 0.5;

  const findAge = (target: number) => {
    const hit = projections.find((p) => p.portfolioValue >= target);
    return hit?.age ?? null;
  };

  return [
    {
      id: "coast",
      label: "Coast FI",
      description: "Stop contributing — portfolio may grow to full FI by retirement",
      targetAge: findAge(coastTarget),
      targetPortfolio: Math.round(coastTarget),
    },
    {
      id: "barista",
      label: "Barista FIRE",
      description: "Half FI — part-time income could cover the gap",
      targetAge: findAge(baristaTarget),
      targetPortfolio: Math.round(baristaTarget),
    },
    {
      id: "traditional",
      label: "Traditional FI",
      description: "25× annual spending — full financial independence",
      targetAge: findAge(traditionalTarget),
      targetPortfolio: Math.round(traditionalTarget),
    },
  ];
}