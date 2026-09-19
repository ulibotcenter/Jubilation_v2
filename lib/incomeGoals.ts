import { retirementTarget } from "@/lib/engine/target";

/** Sustainable monthly income from projected portfolio (4% rule, real). */
export function computeSuggestedMonthlyIncome(
  projectedPortfolioAtRetirement: number
): number {
  if (!projectedPortfolioAtRetirement || projectedPortfolioAtRetirement <= 0) {
    return 0;
  }
  return Math.round((projectedPortfolioAtRetirement * 0.04) / 12);
}

/** Portfolio needed to fund desired monthly income — same target as MC/stress. */
export function computeFITargetFromDesired(
  desiredMonthlyIncome: number,
  monthlyExpenses = 0
): number {
  return (
    retirementTarget({ desiredMonthlyIncome, monthlyExpenses }).capitalTarget ??
    0
  );
}

export interface IncomeGapAnalysis {
  suggested: number;
  desired: number;
  gap: number;
  gapPct: number;
  progressPct: number;
  status: "ahead" | "on-track" | "behind" | "far-behind";
  statusLabel: string;
}

export function analyzeIncomeGap(
  suggested: number,
  desired: number
): IncomeGapAnalysis {
  if (desired <= 0) {
    return {
      suggested,
      desired,
      gap: 0,
      gapPct: 0,
      progressPct: 100,
      status: "on-track",
      statusLabel: "Set your retirement income goal",
    };
  }

  const gap = desired - suggested;
  const progressPct = Math.min(150, Math.round((suggested / desired) * 100));
  const gapPct = Math.round((gap / desired) * 100);

  let status: IncomeGapAnalysis["status"] = "behind";
  let statusLabel = "Below your goal";

  if (progressPct >= 100) {
    status = "ahead";
    statusLabel = "At or above your goal";
  } else if (progressPct >= 85) {
    status = "on-track";
    statusLabel = "Close to your goal";
  } else if (progressPct >= 60) {
    status = "behind";
    statusLabel = "Below your goal";
  } else {
    status = "far-behind";
    statusLabel = "Far from your goal";
  }

  return {
    suggested,
    desired,
    gap,
    gapPct,
    progressPct,
    status,
    statusLabel,
  };
}
