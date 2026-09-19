import { describe, expect, it } from "vitest";
import { liveSolve } from "@/lib/solveLive";
import { buildAssetFromPreset, presetById } from "@/lib/physicalAssetPresets";
import { normalizeKpiValues } from "@/types";

describe("liveSolve", () => {
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

  it("solves the maximum sustainable income via the engine", () => {
    const result = liveSolve(input, "income");
    expect(result.unknown).toBe("income");
    expect(result.feasible).toBe(true);
    expect(result.value).toBeGreaterThan(3_000);
    expect(result.value).toBeLessThan(6_000);
  });

  it("solves an earlier retirement age with contribution fixed", () => {
    const result = liveSolve(input, "date");
    expect(result.unknown).toBe("date");
    expect(result.feasible).toBe(true);
    expect(result.value).toBeGreaterThan(kpis.currentAge);
    expect(result.value).toBeLessThan(kpis.lifeExpectancy);
  });
});
