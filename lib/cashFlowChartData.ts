import type { KPIValues, ProjectionYear } from "@/types";

export type CashFlowPhase = "accumulation" | "retirement";

export interface CashFlowChartPoint {
  age: number;
  year: number;
  phase: CashFlowPhase;
  /** Patrimônio no início do período */
  openingWealth: number;
  /** Novos aportes no período */
  contributions: number;
  /** Retorno dos investimentos (CAGR real) — do motor de projeção */
  returns: number;
  /** Custo de vida (acumulação, referência) ou retiradas (aposentadoria) */
  livingCost: number;
  /** Saldo = portfolioValue do motor (linha do gráfico) */
  projectedBalance: number;
  /** Saídas que reduzem o patrimônio neste período */
  outflowAffectsBalance: boolean;
}

/**
 * Cash-flow series aligned with generateExtendedProjections.
 * During accumulation, living costs are shown for context but do not reduce
 * the portfolio line (expenses are funded outside invested assets).
 */
export function buildCashFlowChartSeries(
  projections: ProjectionYear[],
  kpis: KPIValues,
  options?: { untilAge?: number }
): CashFlowChartPoint[] {
  const until = options?.untilAge ?? kpis.lifeExpectancy;
  const slice = projections.filter((p) => p.age <= until);

  return slice.map((row, index) => {
    const isRetired = row.age >= kpis.retirementAge;
    const openingWealth =
      index === 0
        ? kpis.currentNetWorth
        : (slice[index - 1]?.portfolioValue ?? kpis.currentNetWorth);

    return {
      age: row.age,
      year: row.year,
      phase: isRetired ? "retirement" : "accumulation",
      openingWealth: Math.round(openingWealth),
      contributions: row.contributions,
      returns: row.returns,
      livingCost: row.expenses,
      projectedBalance: row.portfolioValue,
      outflowAffectsBalance: isRetired,
    };
  });
}