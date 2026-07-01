import type { KPIValues, ProjectionYear } from "@/types";

export type FIMilestoneId = "half" | "coast" | "full";

export interface FIMilestone {
  id: FIMilestoneId;
  targetAge: number | null;
  targetPortfolio: number;
}

/** Three intuitive checkpoints on the path to retirement */
export function computeFIMilestones(
  kpis: KPIValues,
  projections: ProjectionYear[]
): FIMilestone[] {
  const annualNeed =
    kpis.desiredMonthlyIncome > 0
      ? kpis.desiredMonthlyIncome * 12
      : kpis.monthlyExpenses * 12 * 1.25;
  const fullTarget = annualNeed * 25;
  const halfTarget = fullTarget * 0.5;

  const yearsLeft = Math.max(1, kpis.retirementAge - kpis.currentAge);
  const realReturn = Math.max(
    0.002,
    (kpis.expectedCAGR - kpis.annualInflation) / 100
  );
  /** Portfolio needed today so growth alone reaches full target by retirement */
  const coastTarget = fullTarget / Math.pow(1 + realReturn, yearsLeft);

  const findAge = (target: number) => {
    const hit = projections.find((p) => p.portfolioValue >= target);
    return hit?.age ?? null;
  };

  return [
    {
      id: "half",
      targetAge: findAge(halfTarget),
      targetPortfolio: Math.round(halfTarget),
    },
    {
      id: "coast",
      targetAge: findAge(coastTarget),
      targetPortfolio: Math.round(coastTarget),
    },
    {
      id: "full",
      targetAge: findAge(fullTarget),
      targetPortfolio: Math.round(fullTarget),
    },
  ];
}