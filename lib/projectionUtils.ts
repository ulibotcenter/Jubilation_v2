import type { ProjectionYear } from "@/types";

/** Row at planned retirement age (not end-of-life projection). */
export function getRetirementProjectionRow(
  projections: ProjectionYear[],
  retirementAge: number
): ProjectionYear | undefined {
  return projections.find((p) => p.age === retirementAge);
}

export function getRetirementPortfolioValue(
  projections: ProjectionYear[],
  retirementAge: number
): number {
  return (
    getRetirementProjectionRow(projections, retirementAge)?.portfolioValue ?? 0
  );
}