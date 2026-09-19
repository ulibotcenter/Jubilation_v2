/** Single definition of "how much retirement costs" — reused by MC, stress, FI, income. */

export interface SpendingInputs {
  desiredMonthlyIncome: number;
  monthlyExpenses: number;
  /** Safe withdrawal rate used only to translate spending → capital target */
  safeWithdrawalRate?: number;
}

export interface RetirementTarget {
  /** Annual spending the plan must fund, in today's money. Null = no goal. */
  annualSpending: number | null;
  /** 25× / SWR capital heuristic. Null when there is no spending goal. */
  capitalTarget: number | null;
  source: "desired-income" | "lifestyle-expenses" | "none";
}

export const DEFAULT_SAFE_WITHDRAWAL_RATE = 0.04;

export function retirementTarget(input: SpendingInputs): RetirementTarget {
  const swr = input.safeWithdrawalRate ?? DEFAULT_SAFE_WITHDRAWAL_RATE;
  if (input.desiredMonthlyIncome > 0) {
    const annualSpending = input.desiredMonthlyIncome * 12;
    return {
      annualSpending,
      capitalTarget: annualSpending / swr,
      source: "desired-income",
    };
  }
  if (input.monthlyExpenses > 0) {
    const annualSpending = input.monthlyExpenses * 12;
    return {
      annualSpending,
      capitalTarget: annualSpending / swr,
      source: "lifestyle-expenses",
    };
  }
  return { annualSpending: null, capitalTarget: null, source: "none" };
}

export function impliedWithdrawalFromPortfolio(
  portfolioAtRetirement: number,
  swr = DEFAULT_SAFE_WITHDRAWAL_RATE
): number {
  if (portfolioAtRetirement <= 0) return 0;
  return Math.round(portfolioAtRetirement * swr);
}
