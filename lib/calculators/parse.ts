import { ASSUMPTIONS } from "@/lib/engine/assumptions";
import {
  FREEDOM_DEFAULTS,
  INCOME_DEFAULTS,
  type PublicIndependenceInput,
} from "@/lib/calculators/independence";
import {
  INSS_DEFAULTS,
  type PublicInssInput,
} from "@/lib/calculators/inssPublic";

export type SearchValue = string | string[] | undefined;
export type SearchBag = Record<string, SearchValue>;

export function firstParam(value: SearchValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseClampedNumber(
  raw: SearchValue,
  fallback: number,
  min: number,
  max: number
): number {
  const n = Number(firstParam(raw)?.replace(",", "."));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseIndependence(
  q: SearchBag,
  defaults: PublicIndependenceInput
): PublicIndependenceInput {
  const realPct = parseClampedNumber(
    q.juro,
    defaults.realReturn * 100,
    ASSUMPTIONS.realReturn.min,
    ASSUMPTIONS.realReturn.max
  );
  return {
    currentAge: Math.round(
      parseClampedNumber(
        q.idade,
        defaults.currentAge,
        ASSUMPTIONS.currentAge.min,
        ASSUMPTIONS.currentAge.max
      )
    ),
    liquidWealth: parseClampedNumber(q.reserva, defaults.liquidWealth, 0, 50_000_000),
    monthlyContribution: parseClampedNumber(
      q.aporte,
      defaults.monthlyContribution,
      ASSUMPTIONS.monthlyContribution.min,
      ASSUMPTIONS.monthlyContribution.max
    ),
    monthlySpending: parseClampedNumber(
      q.gasto,
      defaults.monthlySpending,
      100,
      ASSUMPTIONS.desiredMonthlyIncome.max
    ),
    retirementAge: Math.round(
      parseClampedNumber(
        q.aposentadoria,
        defaults.retirementAge,
        ASSUMPTIONS.retirementAge.min,
        ASSUMPTIONS.retirementAge.max
      )
    ),
    lifeExpectancy: Math.round(
      parseClampedNumber(
        q.alvo,
        defaults.lifeExpectancy,
        ASSUMPTIONS.lifeExpectancy.min,
        ASSUMPTIONS.lifeExpectancy.max
      )
    ),
    realReturn: realPct / 100,
  };
}

export function parseFreedomInput(q: SearchBag): PublicIndependenceInput {
  return parseIndependence(q, FREEDOM_DEFAULTS);
}

export function parseIncomeInput(q: SearchBag): PublicIndependenceInput {
  return parseIndependence(q, INCOME_DEFAULTS);
}

export function parseInssInput(q: SearchBag): PublicInssInput {
  const sexRaw = (firstParam(q.sexo) ?? INSS_DEFAULTS.sex).toUpperCase();
  const sex = sexRaw === "M" ? "M" : "F";
  const before = firstParam(q.antes2019);
  return {
    sex,
    age: Math.round(
      parseClampedNumber(
        q.idade,
        INSS_DEFAULTS.age,
        ASSUMPTIONS.currentAge.min,
        ASSUMPTIONS.currentAge.max
      )
    ),
    contributionYears: parseClampedNumber(
      q.anos,
      INSS_DEFAULTS.contributionYears,
      0,
      50
    ),
    monthlyWage: parseClampedNumber(q.salario, INSS_DEFAULTS.monthlyWage, 0, 50_000),
    filiatedBeforeReform:
      before == null ? INSS_DEFAULTS.filiatedBeforeReform : before !== "nao",
    teacher: firstParam(q.professor) === "sim",
  };
}
