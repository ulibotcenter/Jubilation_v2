import {
  paramsForYear,
  type ParameterSet,
  type YearLegalParams,
} from "@/lib/engine/parameters";
import { DEFAULT_PARAMETER_SET } from "@/lib/engine/parameters";

function bracketTax(cents: number, brackets: YearLegalParams["irpfMonthlyBrackets"]): number {
  const base = Math.max(0, cents);
  let chosen = brackets[brackets.length - 1]!;
  for (const b of brackets) {
    chosen = b;
    if (base <= b.upToCents) break;
  }
  return Math.max(0, Math.round(base * chosen.rate - chosen.deductCents));
}

export interface IrpfInput {
  /** Monthly taxable income in cents, before simplified discount and 65+ relief */
  monthlyIncomeCents: number;
  age: number;
  /** When true, apply the extra R$ 1.903,98 exemption on retirement income */
  retirementIncome: boolean;
  year?: number;
  parameterSet?: ParameterSet;
  useSimplifiedDiscount?: boolean;
  applyLowIncomeRelief?: boolean;
}

export interface IrpfResult {
  taxCents: number;
  baseCents: number;
  effectiveRate: number;
  exemptionCents: number;
}

/**
 * 2026 monthly IRPF (RFB tabela + desconto simplificado + redução até R$ 5.000
 * e fade até R$ 7.350). Progressive — never a single cliff rate.
 */
export function calculateMonthlyIrpf(input: IrpfInput): IrpfResult {
  const set = input.parameterSet ?? DEFAULT_PARAMETER_SET;
  const year = input.year ?? 2026;
  const p = paramsForYear(set, year);

  let remaining = Math.max(0, Math.round(input.monthlyIncomeCents));
  let exemption = 0;
  if (input.retirementIncome && input.age >= 65) {
    exemption = Math.min(remaining, p.irpfAge65ExemptionCents);
    remaining -= exemption;
  }

  const grossForRelief = remaining;
  const simplified =
    input.useSimplifiedDiscount === false ? 0 : p.irpfSimplifiedDiscountCents;
  const base = Math.max(0, remaining - simplified);
  let tax = bracketTax(base, p.irpfMonthlyBrackets);

  if (input.applyLowIncomeRelief !== false) {
    if (grossForRelief <= p.irpfFullReliefUpToCents) {
      tax = 0;
    } else if (grossForRelief < p.irpfPartialReliefUpToCents) {
      const reliefReais =
        p.irpfPartialReliefIntercept -
        p.irpfPartialReliefSlope * (grossForRelief / 100);
      tax = Math.max(0, tax - Math.round(reliefReais * 100));
    }
  }

  const effectiveRate = input.monthlyIncomeCents > 0 ? tax / input.monthlyIncomeCents : 0;
  return {
    taxCents: tax,
    baseCents: base,
    effectiveRate,
    exemptionCents: exemption,
  };
}

export function calculateAnnualIrpf(
  annualIncomeCents: number,
  options: Omit<IrpfInput, "monthlyIncomeCents">
): IrpfResult {
  const monthly = Math.round(annualIncomeCents / 12);
  const month = calculateMonthlyIrpf({ ...options, monthlyIncomeCents: monthly });
  return {
    taxCents: month.taxCents * 12,
    baseCents: month.baseCents * 12,
    effectiveRate:
      annualIncomeCents > 0 ? (month.taxCents * 12) / annualIncomeCents : 0,
    exemptionCents: month.exemptionCents * 12,
  };
}

/** Employee INSS (progressive brackets, not a flat rate). */
export function calculateMonthlyInssEmployee(
  wageCents: number,
  year = 2026,
  parameterSet: ParameterSet = DEFAULT_PARAMETER_SET
): number {
  const p = paramsForYear(parameterSet, year);
  const base = Math.min(Math.max(0, wageCents), p.rgpsCeilingCents);
  let chosen = p.inssEmployeeBrackets[p.inssEmployeeBrackets.length - 1]!;
  for (const b of p.inssEmployeeBrackets) {
    chosen = b;
    if (base <= b.upToCents) break;
  }
  return Math.min(
    p.inssEmployeeCeilingContributionCents,
    Math.max(0, Math.round(base * chosen.rate - chosen.deductCents))
  );
}

/** FGTS saque-aniversário: one bracket on the whole balance, not progressive slices. */
export function fgtsBirthdayWithdrawalCents(
  balanceCents: number,
  year = 2026,
  parameterSet: ParameterSet = DEFAULT_PARAMETER_SET
): number {
  const p = paramsForYear(parameterSet, year);
  const bal = Math.max(0, balanceCents);
  let chosen = p.fgtsBirthdayBrackets[p.fgtsBirthdayBrackets.length - 1]!;
  for (const b of p.fgtsBirthdayBrackets) {
    chosen = b;
    if (bal <= b.upToCents) break;
  }
  return Math.round(bal * chosen.rate + chosen.additionalCents);
}

export const FIXED_INCOME_IR_BRACKETS = [
  { upToDays: 180, rate: 0.225 },
  { upToDays: 360, rate: 0.2 },
  { upToDays: 720, rate: 0.175 },
  { upToDays: Number.POSITIVE_INFINITY, rate: 0.15 },
] as const;

export function regressiveFixedIncomeRate(holdingDays: number): number {
  for (const b of FIXED_INCOME_IR_BRACKETS) {
    if (holdingDays <= b.upToDays) return b.rate;
  }
  return 0.15;
}

export const PREVIDENCIA_REGRESSIVE = [
  { upToYears: 2, rate: 0.35 },
  { upToYears: 4, rate: 0.3 },
  { upToYears: 6, rate: 0.25 },
  { upToYears: 8, rate: 0.2 },
  { upToYears: 10, rate: 0.15 },
  { upToYears: Number.POSITIVE_INFINITY, rate: 0.1 },
] as const;

/** Rate for a single contribution lot, counted from that lot's date — not plan start. */
export function previdenciaRegressiveRate(yearsHeld: number): number {
  for (const b of PREVIDENCIA_REGRESSIVE) {
    if (yearsHeld <= b.upToYears) return b.rate;
  }
  return 0.1;
}
