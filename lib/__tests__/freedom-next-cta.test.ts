import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { freedomInputsToKpis } from "@/lib/calculators/applyFreedomPlan";
import { t } from "@/lib/i18n/messages";
import { DASHBOARD_PATH, PLANS_PATH, SIGN_IN_PATH } from "@/lib/routes";

describe("freedom calculator next-step CTA", () => {
  it("sits below the result card and keeps the chart", () => {
    const calculator = readFileSync(
      "components/calculators/FreedomCalculator.tsx",
      "utf8"
    );
    const cta = readFileSync(
      "components/calculators/FreedomNextStepCta.tsx",
      "utf8"
    );
    const chartAt = calculator.indexOf("<ProjectionChart");
    const resultAt = calculator.indexOf('className="public-result');
    const nextAt = calculator.indexOf("<FreedomNextStepCta");
    const proseAt = calculator.indexOf('className="public-prose"');
    expect(chartAt).toBeGreaterThan(-1);
    expect(resultAt).toBeGreaterThan(chartAt);
    expect(nextAt).toBeGreaterThan(resultAt);
    expect(proseAt).toBeGreaterThan(nextAt);
    expect(calculator).not.toMatch(
      /<ProjectionChart[\s\S]*FreedomNextStepCta[\s\S]*<\/ProjectionChart>/
    );
    expect(cta).toContain("SIGN_IN_PATH");
    expect(cta).toContain("PLANS_PATH");
    expect(cta).toContain("DASHBOARD_PATH");
    expect(cta).not.toContain("/settings");
    expect(calculator).toContain("secondaryHref={SIGN_IN_PATH}");
    expect(SIGN_IN_PATH).toBe("/entrar");
    expect(PLANS_PATH).toBe("/planos");
    expect(DASHBOARD_PATH).toBe("/painel");
  });

  it("translates the next-step labels in pt, en, and es", () => {
    expect(t("pt", "calc.freedom.next.title")).toBe("E agora?");
    expect(t("pt", "calc.freedom.next.create")).toBe("Criar conta e salvar");
    expect(t("pt", "calc.freedom.next.plans")).toBe("Ver planos");
    expect(t("pt", "calc.freedom.next.save")).toBe("Salvar este plano");
    expect(t("en", "calc.freedom.next.create")).toBe("Create account and save");
    expect(t("en", "calc.freedom.next.plans")).toBe("See plans");
    expect(t("en", "calc.freedom.next.save")).toBe("Save this plan");
    expect(t("es", "calc.freedom.next.create")).toBe("Crear cuenta y guardar");
    expect(t("es", "calc.freedom.next.plans")).toBe("Ver planes");
    expect(t("es", "calc.freedom.next.save")).toBe("Guardar este plan");
    expect(t("pt", "calc.freedom.next.saveConfirm")).not.toMatch(
      /salvo na nuvem|cloud save/i
    );
    expect(t("en", "calc.freedom.next.saveConfirm")).toMatch(/this device/i);
    expect(t("es", "calc.freedom.next.saveConfirm")).toMatch(/este aparato/i);
  });

  it("maps the public numbers onto the existing local plan KPIs", () => {
    expect(
      freedomInputsToKpis({
        currentAge: 32,
        liquidWealth: 50_000,
        monthlyContribution: 2_000,
        monthlySpending: 6_000,
        lifeExpectancy: 90,
        inflationPercent: 3,
        freedomAge: 60.4,
      })
    ).toEqual({
      currentAge: 32,
      currentNetWorth: 50_000,
      monthlyContribution: 2_000,
      desiredMonthlyIncome: 6_000,
      lifeExpectancy: 90,
      annualInflation: 3,
      retirementAge: 60,
    });
  });
});
