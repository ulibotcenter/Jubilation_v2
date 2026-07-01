import type { KPIValues } from "@/types";

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export function coachReply(
  question: string,
  context: {
    kpis: KPIValues;
    projectedAtRetirement: number;
    score?: number;
  }
): string {
  const q = question.toLowerCase().trim();
  const { kpis, projectedAtRetirement, score } = context;
  const years = kpis.retirementAge - kpis.currentAge;
  const target =
    kpis.desiredMonthlyIncome > 0
      ? kpis.desiredMonthlyIncome * 12 * 25
      : kpis.currentNetWorth * 25;

  if (q.includes("contribution") || q.includes("contribui") || q.includes("invest")) {
    return `You're investing ${kpis.monthlyContribution.toLocaleString()}/mo. Over ${years} years, that habit plus market growth is a major driver of your ${projectedAtRetirement.toLocaleString()} projection at retirement. Try +$500/mo in Simulation and compare.`;
  }

  if (q.includes("expense") || q.includes("gasto") || q.includes("spend")) {
    return `Living costs of ${kpis.monthlyExpenses.toLocaleString()}/mo imply ${(kpis.monthlyExpenses + kpis.monthlyContribution).toLocaleString()}/mo gross income need today. Lowering expenses by 10% frees cash without touching investments.`;
  }

  if (q.includes("fi") || q.includes("independ") || q.includes("aposent")) {
    const gap = target - projectedAtRetirement;
    if (gap <= 0) {
      return `Your projection (${projectedAtRetirement.toLocaleString()}) meets or beats the 25× income target (${target.toLocaleString()}). Focus on sequence-of-returns risk — run Monte Carlo in Simulation.`;
    }
    return `You're about ${gap.toLocaleString()} below a 25× income target. Options: retire later (+2 years), raise contributions, or adjust desired income. Use the sandbox to test each.`;
  }

  if (q.includes("score") || score != null) {
    return `Readiness blends projection vs goal${score != null ? ` (score ~${score})` : ""}. Improve it by widening the gap between contributions and expenses, or smoothing portfolio volatility with more bonds/ETFs.`;
  }

  return `Based on age ${kpis.currentAge} → ${kpis.retirementAge}, net worth ${kpis.currentNetWorth.toLocaleString()}, and projected ${projectedAtRetirement.toLocaleString()}: ask about contributions, expenses, FI gap, or Monte Carlo — I'll ground answers in your numbers.`;
}