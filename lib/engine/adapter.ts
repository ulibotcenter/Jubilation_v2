import type { Currency, KPIValues, PortfolioAsset } from "@/types";
import type { FxRates } from "@/lib/fx/types";
import {
  convertMoney,
  fromMajor,
  toMajor,
  IdentityFxRatesError,
  MissingFxRateError,
} from "@/lib/engine/money";
import { fisherReal } from "@/lib/engine/rates";
import { defaultPlan, type BenefitSlice, type EnginePlan } from "@/lib/engine/plan";
import { defaultTaxRegime, resolveLiquidity } from "@/lib/engine/liquidity";
import {
  holdingProjectableMajor,
  isProjectable,
  withProjectableValue,
} from "@/lib/holdings/origin";
import { resolveAssetExpectedCagr } from "@/lib/portfolioCagr";
import { DEFAULT_PARAMETER_SET, paramsForYear } from "@/lib/engine/parameters";
import { todayIsoDate } from "@/lib/engine/provenance";
import {
  lastSurvivorAgeInHolderYears,
  ownershipInScope,
  personAgeYears,
  type Household,
} from "@/lib/engine/household";
import { evaluateInss } from "@/lib/engine/inss";
import { survivorPension } from "@/lib/engine/survivorPension";
import { deathAgeInHolderYears } from "@/lib/engine/household";

export interface FxQuote {
  currency: Currency;
  rates: FxRates;
}

export interface EngineBuildInput {
  kpis: KPIValues;
  portfolio: PortfolioAsset[];
  includedAssetIds: string[];
  outsidePortfolio?: number;
  quote: FxQuote;
  asOf?: string;
  applyTaxes?: boolean;
  /** Flat 0–1. Ignored when applyTaxes (BR IRPF). */
  manualEffectiveTaxRate?: number;
  inssMonthly?: number;
  seed?: number;
  /** When set (sensitivity slider), replaces portfolio-implied liquid return. */
  nominalReturnOverride?: number;
  household?: Household | null;
}

function assetCurrencies(assets: PortfolioAsset[]): Currency[] {
  return [
    ...new Set(assets.map((a) => a.nativeCurrency ?? a.currency)),
  ];
}

/** Mixed holdings require a real FX quote — never USD=BRL=EUR=1. */
export function assertQuoteForPortfolio(
  assets: PortfolioAsset[],
  quote: FxQuote
): void {
  const currencies = assetCurrencies(assets);
  if (currencies.length === 0) return;
  const foreign = currencies.filter((c) => c !== quote.currency);
  if (foreign.length === 0) return;
  for (const from of foreign) {
    if (!quote.rates[from] || !quote.rates[quote.currency]) {
      throw new MissingFxRateError(from, quote.currency);
    }
  }
  const involved = [...new Set([quote.currency, ...currencies])];
  const first = quote.rates[involved[0]!];
  if (
    involved.length > 1 &&
    involved.every((c) => quote.rates[c] === first)
  ) {
    throw new IdentityFxRatesError();
  }
}

function assetValueInQuote(asset: PortfolioAsset, quote: FxQuote): number {
  const major = isProjectable(asset)
    ? holdingProjectableMajor(asset)
    : asset.quantity * asset.currentPrice;
  const native = fromMajor(
    major,
    asset.nativeCurrency ?? asset.currency,
    "real",
    asset.asOf ?? todayIsoDate()
  );
  return toMajor(convertMoney(native, quote.currency, quote.rates));
}

function weightedNominalCagr(
  assets: PortfolioAsset[],
  quote: FxQuote
): number | null {
  let total = 0;
  let weighted = 0;
  for (const asset of assets) {
    const mv = assetValueInQuote(asset, quote);
    if (mv <= 0) continue;
    total += mv;
    weighted += mv * resolveAssetExpectedCagr(asset);
  }
  if (total <= 0) return null;
  return weighted / total;
}

export function aggregatePortfolioMajor(
  assets: PortfolioAsset[],
  quote: FxQuote
): number {
  assertQuoteForPortfolio(assets, quote);
  let cents = 0;
  for (const asset of assets) {
    const haircut = withProjectableValue(asset);
    if (!haircut) continue;
    const native = fromMajor(
      haircut.quantity * haircut.currentPrice,
      haircut.nativeCurrency ?? haircut.currency,
      "real",
      haircut.asOf ?? todayIsoDate()
    );
    cents += convertMoney(native, quote.currency, quote.rates).cents;
  }
  return Math.round(cents) / 100;
}

export function buildEnginePlan(input: EngineBuildInput): EnginePlan {
  assertQuoteForPortfolio(input.portfolio, input.quote);
  const household = input.household ?? null;
  const scope = household?.scope ?? "holder";
  const scoped = input.portfolio.filter((a) =>
    ownershipInScope(a.ownership, scope)
  );
  const included = new Set(input.includedAssetIds);
  const liquidAssets = scoped.filter(
    (a) =>
      included.has(a.id) &&
      resolveLiquidity(a) === "liquid" &&
      isProjectable(a)
  );
  // Illiquid holdings stay in the static bucket even when the scope
  // filter is "investments only". They are never sold (M8).
  // IRPF 31/12 cost and opted-out derivatives stay out of both buckets.
  const illiquidAssets = scoped.filter(
    (a) => resolveLiquidity(a) === "illiquid" && isProjectable(a)
  );

  const liquidMajor =
    aggregatePortfolioMajor(liquidAssets, input.quote) +
    (input.outsidePortfolio ?? 0);
  const illiquidMajor = aggregatePortfolioMajor(illiquidAssets, input.quote);

  const inflation = input.kpis.annualInflation / 100;
  const portfolioCagr = weightedNominalCagr(liquidAssets, input.quote);
  const illiquidCagr = weightedNominalCagr(illiquidAssets, input.quote);
  const nominal =
    input.nominalReturnOverride ?? portfolioCagr ?? input.kpis.expectedCAGR;

  const asOf = input.asOf ?? todayIsoDate();
  const lifeExpectancy =
    household && household.scope === "both"
      ? lastSurvivorAgeInHolderYears(household, asOf)
      : household && household.scope === "spouse" && household.spouse
        ? household.spouse.lifeExpectancy
        : input.kpis.lifeExpectancy;

  const { inssMonthlyCents, benefits } = householdBenefits(
    household,
    asOf,
    input.inssMonthly,
    input.kpis.retirementAge
  );

  const comeCotasMajor = aggregatePortfolioMajor(
    liquidAssets.filter((a) => defaultTaxRegime(a.assetClass) === "come_cotas"),
    input.quote
  );
  const comeCotasFraction =
    liquidMajor > 0 ? Math.min(1, Math.max(0, comeCotasMajor / liquidMajor)) : 0;

  return defaultPlan({
    currentAge:
      household && household.scope === "spouse" && household.spouse
        ? personAgeYears(household.spouse, asOf)
        : input.kpis.currentAge,
    retirementAge: input.kpis.retirementAge,
    lifeExpectancy,
    asOf,
    currency: input.quote.currency,
    liquidCents: Math.round(liquidMajor * 100),
    illiquidCents: Math.round(illiquidMajor * 100),
    monthlyContributionCents: Math.round(input.kpis.monthlyContribution * 100),
    monthlySpendingCents: Math.round(input.kpis.desiredMonthlyIncome * 100),
    monthlyLifestyleCents: Math.round(input.kpis.monthlyExpenses * 100),
    liquidRealReturn: fisherReal(nominal / 100, inflation),
    illiquidRealReturn: fisherReal((illiquidCagr ?? 0) / 100, inflation),
    inflation,
    allowIlliquidSale: illiquidAssets.some((a) => a.allowSale === true),
    applyTaxes: input.applyTaxes ?? true,
    manualEffectiveTaxRate: input.applyTaxes
      ? 0
      : Math.min(1, Math.max(0, input.manualEffectiveTaxRate ?? 0)),
    taxRegime: comeCotasFraction >= 1 ? "come_cotas" : "taxable",
    comeCotasRate: paramsForYear(
      DEFAULT_PARAMETER_SET,
      Number(asOf.slice(0, 4)) || 2026
    ).comeCotasLongTermRate,
    comeCotasFraction,
    inssMonthlyCents,
    benefits,
    seed: input.seed ?? 1,
    parameterSet: DEFAULT_PARAMETER_SET,
  });
}

function rmiForPerson(person: Household["holder"]): number {
  if (!person.inss) return 0;
  const ev = evaluateInss(person.inss, {
    lifeExpectancyAge: person.lifeExpectancy,
  });
  return ev.best?.rmiCents ?? 0;
}

function householdBenefits(
  household: Household | null,
  asOf: string,
  fallbackInssMajor: number | undefined,
  retirementAge: number
): { inssMonthlyCents: number; benefits: BenefitSlice[] } {
  const fallback = Math.round((fallbackInssMajor ?? 0) * 100);
  if (!household) {
    return { inssMonthlyCents: fallback, benefits: [] };
  }
  const holderRmi = rmiForPerson(household.holder);
  const spouseRmi = household.spouse
    ? rmiForPerson(household.spouse)
    : 0;

  if (household.scope === "holder" || !household.spouse) {
    const cents = holderRmi || fallback;
    return {
      inssMonthlyCents: cents,
      benefits: cents
        ? [{ startAge: retirementAge, endAge: household.holder.lifeExpectancy, monthlyCents: cents }]
        : [],
    };
  }
  if (household.scope === "spouse") {
    return {
      inssMonthlyCents: spouseRmi,
      benefits: spouseRmi
        ? [
            {
              startAge: retirementAge,
              endAge: household.spouse.lifeExpectancy,
              monthlyCents: spouseRmi,
            },
          ]
        : [],
    };
  }

  const holderDeath = deathAgeInHolderYears(household.holder, household.holder, asOf);
  const spouseDeath = deathAgeInHolderYears(household.spouse, household.holder, asOf);
  const marriageMonths = household.marriageDate
    ? Math.max(
        0,
        (Date.parse(asOf) - Date.parse(household.marriageDate)) /
          (30.4375 * 24 * 3600 * 1000)
      )
    : 60;
  const benefits: BenefitSlice[] = [];
  if (holderRmi) {
    benefits.push({
      startAge: retirementAge,
      endAge: holderDeath,
      monthlyCents: holderRmi,
    });
  }
  if (spouseRmi) {
    benefits.push({
      startAge: retirementAge,
      endAge: spouseDeath,
      monthlyCents: spouseRmi,
    });
  }
  if (holderRmi && spouseDeath !== holderDeath) {
    const firstDeath = Math.min(holderDeath, spouseDeath);
    const survivorAge =
      firstDeath === holderDeath
        ? personAgeYears(household.spouse, asOf) +
          (firstDeath - personAgeYears(household.holder, asOf))
        : firstDeath;
    const deceasedRmi = firstDeath === holderDeath ? holderRmi : spouseRmi;
    const pension = survivorPension({
      deceasedRetirementCents: deceasedRmi,
      dependentCount: 1,
      deceasedContributionMonths: 180,
      marriageMonths: Math.round(marriageMonths),
      survivorAgeAtDeath: survivorAge,
    });
    const end = pension.lifetime
      ? Math.max(holderDeath, spouseDeath)
      : firstDeath + (pension.durationMonths ?? 0) / 12;
    benefits.push({
      startAge: firstDeath,
      endAge: end,
      monthlyCents: pension.monthlyCents,
    });
  }
  return {
    inssMonthlyCents: holderRmi + spouseRmi || fallback,
    benefits,
  };
}
