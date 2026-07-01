import { PROJECTION_END_AGE } from "@/lib/projectionsExtended";
import type { ProjectionYear } from "@/types";

/** Row at planned retirement age (headline KPI, not end-of-life). */
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

export function getEndOfLifeProjectionRow(
  projections: ProjectionYear[],
  endAge: number = PROJECTION_END_AGE
): ProjectionYear | undefined {
  return (
    projections.find((p) => p.age === endAge) ??
    projections[projections.length - 1]
  );
}

export function getChartHorizonAge(projections: ProjectionYear[]): number {
  return (
    projections[projections.length - 1]?.age ??
    PROJECTION_END_AGE
  );
}