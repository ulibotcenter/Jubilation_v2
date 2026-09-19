import type { KPIValues } from "@/types";
import { retirementTarget } from "@/lib/engine/target";

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

function mentions(q: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(q));
}

/**
 * Deterministic help text — not investment advice, not AI.
 * Stays on saving / spending / age; never names a security or allocation.
 */
export function coachReply(
  question: string,
  context: {
    kpis: KPIValues;
    projectedAtRetirement: number;
    score?: number;
  }
): string {
  const q = question.toLowerCase().trim();
  const { kpis, projectedAtRetirement } = context;
  const years = kpis.retirementAge - kpis.currentAge;
  const target =
    retirementTarget({
      desiredMonthlyIncome: kpis.desiredMonthlyIncome,
      monthlyExpenses: kpis.monthlyExpenses,
    }).capitalTarget ?? 0;

  if (
    mentions(q, [
      /\bcontribution/,
      /contribui/,
      /\binvest(ing|ment|ir)?\b/,
      /aporte/,
    ])
  ) {
    return `You're investing ${kpis.monthlyContribution.toLocaleString()}/mo. Over ${years} years, that habit plus market growth is a major driver of your ${projectedAtRetirement.toLocaleString()} projection at retirement. Try +500/mo in Simulation and compare.`;
  }

  if (mentions(q, [/\bexpense/, /gasto/, /\bspend/, /despesa/])) {
    return `Living costs of ${kpis.monthlyExpenses.toLocaleString()}/mo imply ${(kpis.monthlyExpenses + kpis.monthlyContribution).toLocaleString()}/mo gross income need today. Lowering expenses by 10% frees cash without touching investments.`;
  }

  if (
    mentions(q, [
      /\bindepend/,
      /aposent/,
      /\bfi\b/,
      /financial independence/,
      /independência financeira/,
    ])
  ) {
    const gap = target - projectedAtRetirement;
    if (target <= 0) {
      return `Set a retirement income (or living expenses) so the plan has a spending target. Without that, a success rate is meaningless.`;
    }
    if (gap <= 0) {
      return `Your projection (${projectedAtRetirement.toLocaleString()}) meets the spending-based capital target (${target.toLocaleString()}). Next: run Monte Carlo through retirement to see sequence-of-returns risk.`;
    }
    return `You're about ${gap.toLocaleString()} below the spending-based capital target. Options: retire later, raise contributions, or adjust desired income. Use the sandbox to test each.`;
  }

  if (mentions(q, [/\bscore\b/, /prontid[aã]o/, /readiness/])) {
    return `Readiness blends projection vs your spending goal${context.score != null ? ` (score ~${context.score})` : ""}. The usual levers are the gap between contributions and expenses, and the retirement age — not a specific mix of assets.`;
  }

  return `Based on age ${kpis.currentAge} → ${kpis.retirementAge}, net worth ${kpis.currentNetWorth.toLocaleString()}, and projected ${projectedAtRetirement.toLocaleString()}: ask about contributions, expenses, or the independence gap — I'll ground answers in your numbers. This is educational, not personalized investment advice.`;
}
