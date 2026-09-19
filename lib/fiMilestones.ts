import { retirementTarget } from "@/lib/engine/target";
import type { KPIValues, ProjectionYear } from "@/types";

export type FIMilestoneId = "half" | "coast" | "full";

export interface FIMilestone {
  id: FIMilestoneId;
  targetAge: number | null;
  targetPortfolio: number;
}

/** Three checkpoints against the same capital target used by MC and stress. */
export function computeFIMilestones(
  kpis: KPIValues,
  projections: ProjectionYear[]
): FIMilestone[] {
  const target = retirementTarget({
    desiredMonthlyIncome: kpis.desiredMonthlyIncome,
    monthlyExpenses: kpis.monthlyExpenses,
  });
  const fullTarget = target.capitalTarget ?? 0;
  const halfTarget = fullTarget * 0.5;

  const yearsLeft = Math.max(1, kpis.retirementAge - kpis.currentAge);
  const realReturn = Math.max(
    0.002,
    (1 + kpis.expectedCAGR / 100) / (1 + kpis.annualInflation / 100) - 1
  );
  const coastTarget =
    fullTarget > 0 ? fullTarget / Math.pow(1 + realReturn, yearsLeft) : 0;

  const findAge = (goal: number) => {
    if (goal <= 0) return null;
    const hit = projections.find((p) => p.portfolioValue >= goal);
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
