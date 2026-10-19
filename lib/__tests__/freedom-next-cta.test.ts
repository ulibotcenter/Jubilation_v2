import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { kpisFromFreedomInput } from "@/lib/calculators/applyFreedomPlan";
import { FREEDOM_DEFAULTS } from "@/lib/calculators/independence";
import { t } from "@/lib/i18n/messages";
import { DASHBOARD_PATH, PLANS_PATH, SIGN_IN_PATH } from "@/lib/routes";
import { DEFAULT_KPI_VALUES } from "@/types";

describe("freedom next-step CTA", () => {
  it("sits under the result card, not inside the chart", () => {
    const calculator = readFileSync(
      "components/calculators/FreedomCalculator.tsx",
      "utf8"
    );
    const chartEnd = calculator.indexOf("</ProjectionChart>");
    const resultAt = calculator.indexOf('className="public-result');
    const ctaAt = calculator.indexOf("<FreedomNextCta");
    const proseAt = calculator.indexOf('className="public-prose"');
    expect(chartEnd).toBeGreaterThan(-1);
    expect(resultAt).toBeGreaterThan(chartEnd);
    expect(ctaAt).toBeGreaterThan(resultAt);
    expect(proseAt).toBeGreaterThan(ctaAt);
    expect(calculator).toContain("showNext");
    expect(calculator).not.toContain("/settings");
  });

  it("sends logged-out users to /entrar and /planos", () => {
    const cta = readFileSync(
      "components/calculators/FreedomNextCta.tsx",
      "utf8"
    );
    expect(cta).toContain("useCloudSignedIn");
    expect(cta).toContain("SIGN_IN_PATH");
    expect(cta).toContain("PLANS_PATH");
    expect(cta).toContain("DASHBOARD_PATH");
    expect(cta).toContain('data-freedom-next="create"');
    expect(cta).toContain('data-freedom-next="plans"');
    expect(cta).toContain('data-freedom-next="save"');
    expect(cta).not.toContain("/settings");
    expect(SIGN_IN_PATH).toBe("/entrar");
    expect(PLANS_PATH).toBe("/planos");
    expect(DASHBOARD_PATH).toBe("/painel");
  });

  it("keeps PT, EN and ES next-step labels", () => {
    expect(t("pt", "calc.freedom.nextCreate")).toBe("Criar conta e salvar");
    expect(t("en", "calc.freedom.nextCreate")).toBe("Create account and save");
    expect(t("es", "calc.freedom.nextCreate")).toBe("Crear cuenta y guardar");
    expect(t("pt", "calc.freedom.nextPlans")).toBe("Ver planos");
    expect(t("en", "calc.freedom.nextPlans")).toBe("See plans");
    expect(t("es", "calc.freedom.nextPlans")).toBe("Ver planes");
    expect(t("pt", "calc.freedom.nextSave")).toBe("Salvar este plano");
    expect(t("en", "calc.freedom.nextSave")).toBe("Save this plan");
    expect(t("es", "calc.freedom.nextSave")).toBe("Guardar este plan");
    expect(t("pt", "calc.freedom.nextSavedLocal")).not.toMatch(
      /nuvem|cloud|postgres|salvo na conta/i
    );
  });

  it("maps freedom numbers onto the local plan without a new API", () => {
    const kpis = kpisFromFreedomInput(FREEDOM_DEFAULTS, 3, 54, DEFAULT_KPI_VALUES);
    expect(kpis.currentAge).toBe(FREEDOM_DEFAULTS.currentAge);
    expect(kpis.currentNetWorth).toBe(FREEDOM_DEFAULTS.liquidWealth);
    expect(kpis.monthlyContribution).toBe(FREEDOM_DEFAULTS.monthlyContribution);
    expect(kpis.desiredMonthlyIncome).toBe(FREEDOM_DEFAULTS.monthlySpending);
    expect(kpis.lifeExpectancy).toBe(FREEDOM_DEFAULTS.lifeExpectancy);
    expect(kpis.retirementAge).toBe(54);
    expect(kpis.annualInflation).toBe(3);
    expect(kpis.expectedCAGR).toBeCloseTo(7.1, 1);
  });
});
