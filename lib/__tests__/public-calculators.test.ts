import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FREEDOM_DEFAULTS,
  INCOME_DEFAULTS,
  publicIndependencePlan,
  solveFreedomDate,
  solveRetirementIncome,
  twoPhaseReturnOptions,
} from "@/lib/calculators/independence";
import {
  INSS_DEFAULTS,
  buildPublicInssPerson,
  simulatePublicInss,
} from "@/lib/calculators/inssPublic";
import { INSS_NOT_OFFICIAL, PUBLIC_DISCLAIMER_FOOTER } from "@/lib/calculators/copy";
import {
  parseFreedomInput,
  parseIncomeInput,
  parseInssInput,
} from "@/lib/calculators/parse";
import {
  CALCULATOR_PATHS,
  CALCULATOR_SEO,
  PUBLIC_SITEMAP_PATHS,
  calculatorMetadata,
} from "@/lib/calculators/seo";
import { defaultPlan } from "@/lib/engine/plan";
import { evaluateInss, fillContributionRange } from "@/lib/engine/inss";
import { solvePlan } from "@/lib/engine/solve";
import { DEFAULT_PARAMETER_SET, paramsForYear } from "@/lib/engine/parameters";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

describe("public calculator routes", () => {
  it("exposes the four public paths and sitemap entries", () => {
    expect(CALCULATOR_PATHS.index).toBe("/calculadoras");
    expect(CALCULATOR_PATHS.freedomDate).toBe("/calculadoras/quando-fico-livre");
    expect(CALCULATOR_PATHS.retirementIncome).toBe(
      "/calculadoras/quanto-vou-receber"
    );
    expect(CALCULATOR_PATHS.inss).toBe("/calculadoras/simulador-inss");
    expect(PUBLIC_SITEMAP_PATHS).toEqual(
      expect.arrayContaining([
        "/calculadoras",
        "/calculadoras/quando-fico-livre",
        "/calculadoras/quanto-vou-receber",
        "/calculadoras/simulador-inss",
        "/privacy",
      ])
    );
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((url) => url.endsWith("/calculadoras"))).toBe(true);
    expect(robots().rules).toMatchObject({
      allow: "/",
      disallow: ["/api/"],
    });
  });

  it("marks calculator pages indexable in pt-BR", () => {
    const meta = calculatorMetadata("inss");
    expect(meta.robots).toMatchObject({ index: true, follow: true });
    expect(meta.openGraph).toMatchObject({ locale: "pt_BR" });
    expect(meta.keywords).toEqual(
      expect.arrayContaining(["independência financeira", "simulador INSS"])
    );
    expect(JSON.stringify(meta.keywords)).not.toMatch(/Monte Carlo/i);
    expect(String(meta.description)).toMatch(/não é o Meu INSS/i);
    expect(CALCULATOR_SEO.freedomDate.title).toMatch(/Quando fico livre/);
    expect(CALCULATOR_SEO.retirementIncome.title).toMatch(/Quanto vou receber/);
  });

  it("keeps the public calculator free forever, outside the Básico trial", () => {
    const layout = readFileSync("app/calculadoras/layout.tsx", "utf8");
    expect(layout).toContain("PublicChrome");
    expect(layout).not.toContain("PlannerGate");
    expect(layout).not.toContain("trial");
    expect(layout).not.toContain("AppShell");
  });
});

describe("public solve wrappers call the engine", () => {
  it("quando fico livre matches solvePlan(date)", () => {
    const publicResult = solveFreedomDate(FREEDOM_DEFAULTS);
    const engineResult = solvePlan(
      publicIndependencePlan(FREEDOM_DEFAULTS),
      "date",
      (trial) =>
        twoPhaseReturnOptions(trial, FREEDOM_DEFAULTS.withdrawalRealReturn)
    );
    expect(publicResult).toEqual(engineResult);
    expect(publicResult.feasible).toBe(true);
    expect(publicResult.value).toBeGreaterThan(FREEDOM_DEFAULTS.currentAge);
    expect(publicResult.value).toBeLessThan(FREEDOM_DEFAULTS.lifeExpectancy);
  });

  it("quanto vou receber matches solvePlan(income)", () => {
    const publicResult = solveRetirementIncome(INCOME_DEFAULTS);
    const engineResult = solvePlan(
      publicIndependencePlan(INCOME_DEFAULTS),
      "income"
    );
    expect(publicResult).toEqual(engineResult);
    expect(publicResult.feasible).toBe(true);
    expect(publicResult.value).toBeGreaterThan(1_000);
    expect(publicResult.value).toBeLessThan(20_000);
  });

  it("does not invent a second plan shape", () => {
    const plan = publicIndependencePlan(FREEDOM_DEFAULTS);
    const baseline = defaultPlan();
    expect(plan.asOf).toBe(baseline.asOf);
    expect(plan.currency).toBe("BRL");
    expect(plan.applyTaxes).toBe(false);
  });
});

describe("public INSS wrapper", () => {
  it("feeds evaluateInss and keeps the same best benefit", () => {
    const view = simulatePublicInss(INSS_DEFAULTS);
    const person = buildPublicInssPerson(INSS_DEFAULTS);
    const raw = evaluateInss(person);
    expect(view.evaluation.best?.ruleId).toBe(raw.best?.ruleId);
    expect(view.evaluation.best?.rmiCents).toBe(raw.best?.rmiCents);
    expect(view.best).not.toBeNull();
    expect(view.carenciaMonths).toBeGreaterThanOrEqual(180);
    expect(person.history.length).toBe(Math.round(INSS_DEFAULTS.contributionYears * 12));
  });

  it("uses fillContributionRange instead of a homemade history loop", () => {
    const person = buildPublicInssPerson(INSS_DEFAULTS);
    const expected = fillContributionRange(
      person.history[0]!.yearMonth,
      person.history.at(-1)!.yearMonth,
      Math.round(INSS_DEFAULTS.monthlyWage * 100),
      "clt",
      { inpcFactor: 1 }
    );
    expect(person.history).toEqual(expected);
  });

  it("reads 2026 transition numbers from the parameter pack", () => {
    const year = paramsForYear(DEFAULT_PARAMETER_SET, 2026);
    expect(year.inssPointsWoman).toBe(93);
    expect(year.inssPointsMan).toBe(103);
    expect(year.inssProgressiveAgeWomanMonths).toBe(59 * 12 + 6);
    expect(year.inssProgressiveAgeManMonths).toBe(64 * 12 + 6);
  });

  it("does not impersonate Meu INSS", () => {
    expect(INSS_NOT_OFFICIAL).toMatch(/não é o Meu INSS/i);
    expect(INSS_NOT_OFFICIAL.toLowerCase()).not.toContain("agende seu atendimento");
    expect(PUBLIC_DISCLAIMER_FOOTER.toLowerCase()).toContain("não indicamos ticker");
  });
});

describe("public calculator query parsing", () => {
  it("clamps out-of-range independence inputs", () => {
    const parsed = parseFreedomInput({
      idade: "9",
      reserva: "-10",
      aporte: "9999999",
      gasto: "50",
      alvo: "200",
      juro: "40",
    });
    expect(parsed.currentAge).toBe(18);
    expect(parsed.liquidWealth).toBe(0);
    expect(parsed.monthlyContribution).toBe(500_000);
    expect(parsed.monthlySpending).toBe(100);
    expect(parsed.lifeExpectancy).toBe(120);
    expect(parsed.realReturn).toBe(0.12);
  });

  it("keeps income-date defaults when the query is empty", () => {
    const parsed = parseIncomeInput({});
    expect(parsed.currentAge).toBe(INCOME_DEFAULTS.currentAge);
    expect(parsed.retirementAge).toBe(INCOME_DEFAULTS.retirementAge);
  });

  it("maps INSS radios without inventing a second sex code", () => {
    const parsed = parseInssInput({
      sexo: "M",
      antes2019: "nao",
      professor: "sim",
      anos: "8",
    });
    expect(parsed.sex).toBe("M");
    expect(parsed.filiatedBeforeReform).toBe(false);
    expect(parsed.teacher).toBe(true);
    expect(parsed.contributionYears).toBe(8);
  });
});
