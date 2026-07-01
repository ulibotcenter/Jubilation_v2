import { DEFAULT_LIFE_EXPECTANCY } from "@/types";
import type { KPIValues, ProjectionYear } from "@/types";

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
  endAge?: number
): ProjectionYear | undefined {
  const target = endAge ?? projections[projections.length - 1]?.age;
  if (target == null) return projections[projections.length - 1];
  return (
    projections.find((p) => p.age === target) ??
    projections[projections.length - 1]
  );
}

export function getChartHorizonAge(
  projections: ProjectionYear[],
  kpis?: Pick<KPIValues, "lifeExpectancy">
): number {
  return (
    projections[projections.length - 1]?.age ??
    kpis?.lifeExpectancy ??
    DEFAULT_LIFE_EXPECTANCY
  );
}