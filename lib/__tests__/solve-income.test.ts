import { describe, expect, it } from "vitest";
import { defaultPlan } from "@/lib/engine/plan";
import { projectPlan } from "@/lib/engine/project";
import { solvePlan } from "@/lib/engine/solve";
import { liveSolve } from "@/lib/solveLive";
import { kpisFromOnboarding } from "@/lib/onboarding/plan";
import { buildAssetFromPreset, presetById } from "@/lib/physicalAssetPresets";
import { normalizeKpiValues } from "@/types";

describe("solvePlan income is max sustainable", () => {
  it("does not return the 50k cap when spending 0 would fall through to 4%", () => {
    const plan = defaultPlan({
      currentAge: 52,
      retirementAge: 65,
      lifeExpectancy: 90,
      liquidCents: 0,
      monthlyContributionCents: 150_000,
      monthlySpendingCents: 1_200_000,
      monthlyLifestyleCents: 1_200_000,
      liquidRealReturn: 0.035,
    });
    const result = solvePlan(plan, "income");
    expect(result.feasible).toBe(true);
    expect(result.value).toBeGreaterThan(500);
    expect(result.value).toBeLessThan(5_000);
    expect(result.value).not.toBe(50_000);

    const funded = projectPlan({
      ...plan,
      monthlySpendingCents: Math.round(result.value * 100),
      monthlyLifestyleCents: 0,
    });
    expect(funded.ruinAge).toBeNull();

    const tooMuch = projectPlan({
      ...plan,
      monthlySpendingCents: Math.round(result.value * 1.2 * 100),
      monthlyLifestyleCents: 0,
    });
    expect(tooMuch.ruinAge).not.toBeNull();
  });

  it("matches liveSolve on the onboarding case (one path)", () => {
    const kpis = kpisFromOnboarding({
      age: 52,
      income: 12_000,
      contribution: 1_500,
      lifeExpectancy: 90,
    });
    const live = liveSolve(
      {
        kpis,
        portfolio: [],
        includedAssetIds: [],
        outsidePortfolio: 0,
        currency: "BRL",
      },
      "income"
    );
    expect(live.feasible).toBe(true);
    expect(live.value).toBeGreaterThan(1_000);
    expect(live.value).toBeLessThan(2_000);
    expect(live.value).toBeCloseTo(1_406, 0);
  });

  it("cash R$ 400k: max holds, 1.2× ruins; UI path equals engine", () => {
    const kpis = normalizeKpiValues({
      currentAge: 40,
      retirementAge: 65,
      lifeExpectancy: 90,
      currentNetWorth: 400_000,
      monthlyContribution: 3_000,
      monthlyExpenses: 6_000,
      desiredMonthlyIncome: 6_000,
      expectedCAGR: 7.1,
      annualInflation: 3,
    });
    const cash = buildAssetFromPreset({
      preset: presetById("cash")!,
      name: "Liquidez",
      purchase: 400_000,
      value: 400_000,
      asOf: "2026-01-01",
      ownership: "holder",
      currency: "BRL",
      portfolio: [],
    });
    const input = {
      kpis,
      portfolio: [cash],
      includedAssetIds: [cash.id],
      outsidePortfolio: 0,
      currency: "BRL" as const,
    };
    const live = liveSolve(input, "income");
    expect(live.feasible).toBe(true);
    expect(live.value).toBeGreaterThan(3_000);
    expect(live.value).toBeLessThan(6_000);

    const engine = solvePlan(
      defaultPlan({
        currentAge: 40,
        retirementAge: 65,
        lifeExpectancy: 90,
        liquidCents: 40_000_000,
        monthlyContributionCents: 300_000,
        monthlySpendingCents: 600_000,
        monthlyLifestyleCents: 600_000,
        liquidRealReturn: 0.04,
      }),
      "income"
    );
    const funded = projectPlan({
      ...defaultPlan({
        currentAge: 40,
        retirementAge: 65,
        lifeExpectancy: 90,
        liquidCents: 40_000_000,
        monthlyContributionCents: 300_000,
        liquidRealReturn: 0.04,
        applyTaxes: false,
      }),
      monthlySpendingCents: Math.round(engine.value * 100),
      monthlyLifestyleCents: 0,
    });
    expect(funded.ruinAge).toBeNull();
    const over = projectPlan({
      ...defaultPlan({
        currentAge: 40,
        retirementAge: 65,
        lifeExpectancy: 90,
        liquidCents: 40_000_000,
        monthlyContributionCents: 300_000,
        liquidRealReturn: 0.04,
        applyTaxes: false,
      }),
      monthlySpendingCents: Math.round(engine.value * 1.2 * 100),
      monthlyLifestyleCents: 0,
    });
    expect(over.ruinAge).not.toBeNull();
  });
});
