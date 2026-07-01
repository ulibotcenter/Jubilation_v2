import type { KPIValues, ProjectionYear } from "@/types";

export interface CashFlowChartPoint {
  age: number;
  year: number;
  /** Patrimônio no início do período */
  openingWealth: number;
  /** Novos aportes no período */
  contributions: number;
  /** Retorno dos investimentos (CAGR real) */
  returns: number;
  /** Custo de vida / saídas */
  livingCost: number;
  /** Saldo projetado (linha) = entradas − saídas */
  projectedBalance: number;
}

/** Build annual cash-flow series: stacked inflows + living cost bar + balance line */
export function buildCashFlowChartSeries(
  projections: ProjectionYear[],
  kpis: KPIValues,
  options?: { untilAge?: number }
): CashFlowChartPoint[] {
  const until = options?.untilAge;
  const slice =
    until != null
      ? projections.filter((p) => p.age <= until)
      : projections;

  const realReturn = (kpis.expectedCAGR - kpis.annualInflation) / 100;
  let openingWealth = kpis.currentNetWorth;

  return slice.map((row, index) => {
    const contributions = row.contributions;
    const returns =
      index === 0 ? 0 : Math.round(openingWealth * realReturn);
    const livingCost = row.expenses;
    const projectedBalance = Math.max(
      0,
      openingWealth + contributions + returns - livingCost
    );

    const point: CashFlowChartPoint = {
      age: row.age,
      year: row.year,
      openingWealth: Math.round(index === 0 ? kpis.currentNetWorth : openingWealth),
      contributions,
      returns,
      livingCost,
      projectedBalance: Math.round(projectedBalance),
    };

    openingWealth = projectedBalance;
    return point;
  });
}