import { calculateMonthlyIrpf } from "@/lib/engine/tax";
import { annualToMonthly, inflationFactor } from "@/lib/engine/rates";
import {
  asOfYear,
  planMeta,
  type EnginePlan,
  type EngineRunMeta,
} from "@/lib/engine/plan";
import { retirementTarget } from "@/lib/engine/target";
import type { ProjectionYear } from "@/types";
import {
  calendarMonthAfter,
  comeCotasLevyCents,
  isComeCotasCalendarMonth,
} from "@/lib/engine/comeCotas";

export interface ProjectionResult {
  years: ProjectionYear[];
  ruinAge: number | null;
  meta: EngineRunMeta;
  liquidEndCents: number;
  illiquidEndCents: number;
}

export interface ProjectOptions {
  liquidMonthlyReturnAt?: (month: number) => number;
  illiquidMonthlyReturnAt?: (month: number) => number;
}

interface AgeAcc {
  contributions: number;
  returns: number;
  expenses: number;
  invested: number;
  taxes: number;
  liquid: number;
  illiquid: number;
  ruined: boolean;
}

function calendarYear(plan: EnginePlan, age: number): number {
  return asOfYear(plan.asOf) + (age - plan.currentAge);
}

function taxOnRetirementIncome(
  plan: EnginePlan,
  age: number,
  grossIncomeCents: number
): number {
  if (!plan.applyTaxes || grossIncomeCents <= 0) return 0;
  return calculateMonthlyIrpf({
    monthlyIncomeCents: grossIncomeCents,
    age,
    retirementIncome: true,
    year: calendarYear(plan, age),
    parameterSet: plan.parameterSet,
  }).taxCents;
}

/**
 * Monthly real-terms projection.
 * - Age `currentAge` is today's snapshot (no return, no cash-flow).
 * - Contributions and retirement spending are constant in real terms.
 * - Illiquid assets are never sold unless `allowIlliquidSale` is set.
 */
export function projectPlan(
  plan: EnginePlan,
  options?: ProjectOptions
): ProjectionResult {
  const defaultLiq = annualToMonthly(plan.liquidRealReturn);
  const defaultIll = annualToMonthly(plan.illiquidRealReturn);
  const liquidRate = options?.liquidMonthlyReturnAt ?? (() => defaultLiq);
  const illiquidRate = options?.illiquidMonthlyReturnAt ?? (() => defaultIll);

  const yearsHorizon = plan.lifeExpectancy - plan.currentAge;
  const totalMonths = Math.max(0, yearsHorizon * 12);

  let liquid = Math.max(0, Math.round(plan.liquidCents));
  let illiquid = Math.max(0, Math.round(plan.illiquidCents));
  let ruinAge: number | null = null;
  let monthlyNeed = 0;
  let comeCotasBase = liquid;

  const acc = new Map<number, AgeAcc>();
  const ensure = (age: number): AgeAcc => {
    const existing = acc.get(age);
    if (existing) return existing;
    const created: AgeAcc = {
      contributions: 0,
      returns: 0,
      expenses: 0,
      invested: 0,
      taxes: 0,
      liquid,
      illiquid,
      ruined: false,
    };
    acc.set(age, created);
    return created;
  };

  ensure(plan.currentAge);

  for (let month = 1; month <= totalMonths; month++) {
    const ageAtEnd = plan.currentAge + Math.ceil(month / 12);
    const row = ensure(ageAtEnd);
    const retired = ageAtEnd >= plan.retirementAge;
    const fromBenefits = (plan.benefits ?? [])
      .filter((b) => ageAtEnd >= b.startAge && ageAtEnd <= b.endAge)
      .reduce((s, b) => s + b.monthlyCents, 0);
    const inssLike = fromBenefits > 0 ? fromBenefits : plan.inssMonthlyCents;

    const liqRet = Math.round(liquid * liquidRate(month));
    const illRet = Math.round(illiquid * illiquidRate(month));
    liquid = Math.max(0, liquid + liqRet);
    illiquid = Math.max(0, illiquid + illRet);
    row.returns += liqRet + illRet;

    if (plan.taxRegime === "come_cotas") {
      const cal = calendarMonthAfter(plan.asOf, month - 1);
      if (isComeCotasCalendarMonth(cal.month, cal.year, plan.parameterSet)) {
        const gain = Math.max(0, liquid - comeCotasBase);
        const levy = comeCotasLevyCents(gain, plan.comeCotasRate);
        liquid = Math.max(0, liquid - levy);
        row.taxes += levy;
        comeCotasBase = liquid;
      }
    }

    if (
      plan.allowIlliquidSale &&
      plan.illiquidSaleMonth === month &&
      illiquid > 0
    ) {
      liquid += Math.round(illiquid * (1 - plan.illiquidTransactionCostRate));
      illiquid = 0;
    }

    if (!retired) {
      liquid += plan.monthlyContributionCents;
      row.contributions += plan.monthlyContributionCents;
      row.invested += plan.monthlyContributionCents;
      row.expenses += plan.monthlyLifestyleCents;
      if (fromBenefits > 0) {
        liquid += fromBenefits;
        row.contributions += fromBenefits;
      }
    } else {
      if (monthlyNeed === 0) {
        const target = retirementTarget({
          desiredMonthlyIncome: plan.monthlySpendingCents / 100,
          monthlyExpenses: plan.monthlyLifestyleCents / 100,
        });
        if (target.annualSpending != null) {
          monthlyNeed = Math.round((target.annualSpending * 100) / 12);
        } else if (plan.lifeExpectancy > plan.retirementAge) {
          monthlyNeed = Math.round((liquid * 0.04) / 12);
        }
      }

      const fromInss = Math.min(monthlyNeed, inssLike);
      const netFromPortfolio = Math.max(0, monthlyNeed - fromInss);
      const tax = taxOnRetirementIncome(plan, ageAtEnd, monthlyNeed);
      const grossFromPortfolio = netFromPortfolio + tax;
      row.expenses += monthlyNeed;
      row.taxes += tax;

      if (grossFromPortfolio > 0) {
        if (liquid >= grossFromPortfolio) {
          liquid -= grossFromPortfolio;
        } else {
          liquid = 0;
          if (ruinAge == null) ruinAge = ageAtEnd;
          row.ruined = true;
        }
      }
    }

    row.liquid = liquid;
    row.illiquid = illiquid;
  }

  const years: ProjectionYear[] = [];
  for (let age = plan.currentAge; age <= plan.lifeExpectancy; age++) {
    const i = age - plan.currentAge;
    const row = acc.get(age) ?? ensure(age);
    const liquidMajor = Math.round(row.liquid / 100);
    const illiquidMajor = Math.round(row.illiquid / 100);
    const portfolioValue = liquidMajor + illiquidMajor;
    const factor = inflationFactor(plan.inflation, i);
    const contributions = Math.round(row.contributions / 100);
    const returns = Math.round(row.returns / 100);
    const expenses = Math.round(row.expenses / 100);
    const invested = Math.round(row.invested / 100);
    const taxes = Math.round(row.taxes / 100);
    const ruined = row.ruined || (ruinAge != null && age >= ruinAge);
    years.push({
      year: calendarYear(plan, age),
      age,
      portfolioValue,
      contributions,
      returns,
      inflationAdjusted: portfolioValue,
      nominalValue: Math.round(portfolioValue * factor),
      expenses,
      invested,
      requiredIncome: expenses + invested,
      taxes,
      liquidValue: liquidMajor,
      illiquidValue: illiquidMajor,
      ruined,
    });
  }

  return {
    years,
    ruinAge,
    meta: planMeta(plan),
    liquidEndCents: liquid,
    illiquidEndCents: illiquid,
  };
}

export function projectYears(plan: EnginePlan): ProjectionYear[] {
  return projectPlan(plan).years;
}
