import { describe, expect, it } from "vitest";
import { defaultPlan } from "@/lib/engine/plan";
import { projectPlan } from "@/lib/engine/project";
import { solvePlan } from "@/lib/engine/solve";
import { fisherReal } from "@/lib/engine/rates";

describe("invariants", () => {
  it("conserves liquid wealth: start + contrib + returns − withdrawals − tax", () => {
    const plan = defaultPlan({
      currentAge: 40,
      retirementAge: 50,
      lifeExpectancy: 55,
      liquidCents: 10_000_000,
      monthlyContributionCents: 100_000,
      monthlySpendingCents: 50_000,
      liquidRealReturn: fisherReal(0.08, 0.03),
      inflation: 0.03,
      applyTaxes: false,
    });
    const { years } = projectPlan(plan);
    for (let i = 1; i < years.length; i++) {
      const prev = years[i - 1]!;
      const cur = years[i]!;
      const retired = cur.age >= plan.retirementAge;
      const outflow = retired ? cur.expenses + cur.taxes : 0;
      const expected =
        prev.liquidValue + cur.returns + cur.contributions - outflow;
      expect(Math.abs(cur.liquidValue - Math.max(0, expected))).toBeLessThanOrEqual(2);
    }
  });

  it("never deflates a real series (inflationAdjusted === portfolioValue)", () => {
    const { years } = projectPlan(
      defaultPlan({
        liquidCents: 5_000_000,
        inflation: 0.06,
        liquidRealReturn: 0.04,
        currentAge: 30,
        retirementAge: 40,
        lifeExpectancy: 45,
      })
    );
    for (const row of years) {
      expect(row.inflationAdjusted).toBe(row.portfolioValue);
    }
  });

  it("more contribution never reduces terminal liquid wealth", () => {
    const base = defaultPlan({
      currentAge: 30,
      retirementAge: 60,
      lifeExpectancy: 90,
      liquidCents: 10_000_000,
      monthlyContributionCents: 100_000,
      monthlySpendingCents: 400_000,
      liquidRealReturn: 0.04,
    });
    const low = projectPlan(base).liquidEndCents;
    const high = projectPlan({
      ...base,
      monthlyContributionCents: 200_000,
    }).liquidEndCents;
    expect(high).toBeGreaterThanOrEqual(low);
  });

  it("retiring later never reduces solvable income", () => {
    const plan = defaultPlan({
      currentAge: 40,
      retirementAge: 60,
      lifeExpectancy: 90,
      liquidCents: 80_000_000,
      monthlyContributionCents: 200_000,
      liquidRealReturn: 0.04,
    });
    const early = solvePlan(plan, "income").value;
    const later = solvePlan({ ...plan, retirementAge: 65 }, "income").value;
    expect(later).toBeGreaterThanOrEqual(early - 1);
  });
});
