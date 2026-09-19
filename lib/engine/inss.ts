import {
  DEFAULT_PARAMETER_SET,
  paramsForYear,
  type LegalPremises,
  type ParameterSet,
  type YearLegalParams,
} from "@/lib/engine/parameters";
import { DEFAULT_PORTFOLIO_REAL_RETURN } from "@/lib/engine/assumptions";
import { annualToMonthly } from "@/lib/engine/rates";
import { expectedRemainingYearsBothSexes } from "@/lib/engine/mortality";
import {
  addMonthsIso,
  ageInMonths,
  completeYears,
  isoFromAgeMonths,
  monthsInclusive,
  parseYearMonth,
  yearMonthIso,
} from "@/lib/engine/dates";
import {
  BENEFIT_SALARY_START_YM,
  RGPS_REFORM_ISO,
  countsAsCarencia,
  countsAsCommonTc,
  type ContributionCompetence,
  type InssEvaluation,
  type InssPerson,
  type InssRuleId,
  type InssRuleResult,
  type SpecialExposure,
} from "@/lib/engine/inssTypes";

export type {
  ContributionCompetence,
  ContributorKind,
  InssEvaluation,
  InssPerson,
  InssRuleId,
  InssRuleResult,
  Sex,
  SpecialExposure,
} from "@/lib/engine/inssTypes";
export {
  BENEFIT_SALARY_START_YM,
  CONTRIBUTOR_RATES,
  RGPS_REFORM_ISO,
  countsAsCarencia,
  countsAsCommonTc,
  countsAsTempoContribuicao,
} from "@/lib/engine/inssTypes";

const PERMANENT_SOURCE =
  "EC 103/2019 art. 19 (regra permanente) — filiação a partir de 13/11/2019";
const TRANSITION_SOURCE =
  "EC 103/2019 arts. 15–18 e 20 (regras de transição) — já filiado em 13/11/2019";
const SPECIAL_SOURCE =
  "EC 103/2019 art. 19 §1º; ADI 6309 (STF, 03/06/2026) derrubou idade mínima 55/58/60";
const TEACHER_SOURCE =
  "EC 103/2019 — professor da educação básica, redução de 5 anos em idade e tempo";

export interface EvaluateInssOptions {
  parameterSet?: ParameterSet;
  lifeExpectancyAge?: number;
  discountReal?: number;
  premises?: Partial<LegalPremises>;
}

export function fillContributionRange(
  fromYm: string,
  toYmInclusive: string,
  wageCents: number,
  kind: ContributionCompetence["kind"],
  extra: Partial<ContributionCompetence> = {}
): ContributionCompetence[] {
  const n = monthsInclusive(fromYm, toYmInclusive);
  const out: ContributionCompetence[] = [];
  for (let i = 0; i < n; i++) {
    const { y, m } = parseYearMonth(fromYm);
    const idx = y * 12 + (m - 1) + i;
    out.push({
      yearMonth: yearMonthIso(Math.floor(idx / 12), (idx % 12) + 1),
      wageCents,
      kind,
      ...extra,
    });
  }
  return out;
}

function ymOf(iso: string): string {
  return iso.slice(0, 7);
}

function historyUpTo(
  history: ContributionCompetence[],
  asOfIso: string
): ContributionCompetence[] {
  const cutoff = ymOf(asOfIso);
  return history.filter((c) => c.yearMonth <= cutoff);
}

/** Repeat the last competence into the future (continued contribution). */
export function projectHistory(
  person: InssPerson,
  untilIso: string
): ContributionCompetence[] {
  const existing = [...person.history];
  const last = existing[existing.length - 1];
  if (!last) return historyUpTo(existing, untilIso);
  const { y, m } = parseYearMonth(last.yearMonth);
  const next = yearMonthIso(Math.floor((y * 12 + m) / 12), ((y * 12 + m) % 12) + 1);
  const until = ymOf(untilIso);
  if (next > until) return historyUpTo(existing, untilIso);
  return historyUpTo(
    existing.concat(
      fillContributionRange(next, until, last.wageCents, last.kind, {
        complemented: last.complemented,
        specialExposureYears: last.specialExposureYears,
        teacher: last.teacher,
        inpcFactor: last.inpcFactor,
      })
    ),
    untilIso
  );
}

export function carenciaMonths(
  history: ContributionCompetence[],
  asOf: string
): number {
  return historyUpTo(history, asOf).filter((c) => countsAsCarencia(c.kind))
    .length;
}

export function tempoContribuicaoMonths(
  history: ContributionCompetence[],
  asOf: string
): number {
  return historyUpTo(history, asOf).filter(countsAsCommonTc).length;
}

export function specialMonths(
  history: ContributionCompetence[],
  asOf: string,
  exposure: SpecialExposure
): number {
  return historyUpTo(history, asOf).filter(
    (c) => c.specialExposureYears === exposure
  ).length;
}

export function teacherMonths(
  history: ContributionCompetence[],
  asOf: string
): number {
  return historyUpTo(history, asOf).filter((c) => c.teacher).length;
}

/**
 * SB = simple average of 100% of contribution wages since 07/1994,
 * each competence capped at that year's ceiling, INPC-corrected.
 * EC 103 ended the discard of the lowest 20%.
 */
export function benefitSalaryCents(
  person: InssPerson,
  asOf: string,
  set: ParameterSet
): number {
  const rows = historyUpTo(person.history, asOf).filter(
    (c) => c.yearMonth >= BENEFIT_SALARY_START_YM
  );
  if (rows.length === 0) return 0;
  let sum = 0;
  for (const row of rows) {
    const year = Number(row.yearMonth.slice(0, 4));
    const ceiling = paramsForYear(set, year).rgpsCeilingCents;
    const capped = Math.min(Math.max(0, row.wageCents), ceiling);
    const factor = row.inpcFactor ?? 1;
    sum += capped * factor;
  }
  return Math.round(sum / rows.length);
}

export function rgpsCoefficient(
  contributionYearsComplete: number,
  tMinYears: number
): number {
  return 0.6 + 0.02 * Math.max(0, contributionYearsComplete - tMinYears);
}

export function applyFloorCeiling(
  rmiCents: number,
  year: number,
  set: ParameterSet
): number {
  const p = paramsForYear(set, year);
  return Math.min(
    p.rgpsCeilingCents,
    Math.max(p.minimumWageCents, Math.round(rmiCents))
  );
}

/**
 * f = (Tc × 0.31 / Es) × [1 + (Id + Tc × 0.31) / 100]
 * Lei 9.876/1999 art. 29 §7º formula only — callers must pass Es and Tc
 * already adjusted under §8º / §9º.
 */
export function fatorPrevidenciario(input: {
  contributionYears: number;
  ageYears: number;
  expectedRemainingYears: number;
  alfa?: number;
}): number {
  const a = input.alfa ?? 0.31;
  const es = Math.max(0.01, input.expectedRemainingYears);
  const tcA = input.contributionYears * a;
  return (tcA / es) * (1 + (input.ageYears + tcA) / 100);
}

export const FATOR_PREVIDENCIARIO_SOURCE =
  "Lei 9.876/1999 art. 29 §7º–§9º; IBGE Tábua Completa de Mortalidade 2024 e(60) ambos os sexos = 22,6";

/**
 * Lei 9.876/1999 §9º — years added to Tc before the factor:
 * I woman +5; II teacher +5 (infantil/fundamental) or +10 (médio).
 * Default teacher bonus is +5 when the person is flagged teacher without a level.
 */
export function fatorTcBonusYears(input: {
  sex: "F" | "M";
  teacher?: boolean;
}): number {
  return (input.sex === "F" ? 5 : 0) + (input.teacher ? 5 : 0);
}

/**
 * Fator as the statute applies it (not a named uncertain premise):
 * Es = both-sexes IBGE average (§8º), Tc includes §9º bonuses.
 */
export function fatorPrevidenciarioLegal(input: {
  contributionYears: number;
  ageYears: number;
  sex: "F" | "M";
  teacher?: boolean;
  alfa?: number;
  /** Override Es (tests). Default: IBGE 2024 both-sexes curve. */
  expectedRemainingYears?: number;
}): number {
  const tc =
    input.contributionYears +
    fatorTcBonusYears({ sex: input.sex, teacher: input.teacher });
  const es =
    input.expectedRemainingYears ??
    expectedRemainingYearsBothSexes(input.ageYears);
  return fatorPrevidenciario({
    contributionYears: tc,
    ageYears: input.ageYears,
    expectedRemainingYears: es,
    alfa: input.alfa,
  });
}

function presentValueCents(
  monthlyCents: number,
  startAgeMonths: number,
  currentAgeMonths: number,
  endAgeMonths: number,
  realAnnual: number
): number {
  const rm = annualToMonthly(realAnnual);
  let pv = 0;
  const last = Math.max(startAgeMonths, endAgeMonths);
  for (let ageM = currentAgeMonths + 1; ageM <= last; ageM++) {
    const monthsAhead = ageM - currentAgeMonths;
    const df = 1 / (1 + rm) ** monthsAhead;
    if (ageM >= startAgeMonths && ageM <= endAgeMonths) {
      pv += monthlyCents * df;
    }
  }
  return Math.round(pv);
}

function filiatedBeforeReform(person: InssPerson): boolean {
  return person.filiationDate.slice(0, 10) < RGPS_REFORM_ISO;
}

function tcMonthsAtReform(person: InssPerson): number {
  return tempoContribuicaoMonths(person.history, RGPS_REFORM_ISO);
}

function tMinYears(sex: InssPerson["sex"]): number {
  return sex === "F" ? 15 : 20;
}

function requiredTcMonths(
  sex: InssPerson["sex"],
  kind: "permanent" | "transition_tc"
): number {
  if (kind === "permanent") return (sex === "F" ? 15 : 20) * 12;
  return (sex === "F" ? 30 : 35) * 12;
}

function pointsRequired(p: YearLegalParams, sex: InssPerson["sex"]): number {
  return sex === "F" ? p.inssPointsWoman : p.inssPointsMan;
}

function progressiveAgeMonths(
  p: YearLegalParams,
  sex: InssPerson["sex"]
): number {
  return sex === "F"
    ? p.inssProgressiveAgeWomanMonths
    : p.inssProgressiveAgeManMonths;
}

function makeResult(
  partial: Omit<InssRuleResult, "presentValueCents"> & {
    presentValueCents?: number;
  }
): InssRuleResult {
  return {
    presentValueCents: partial.presentValueCents ?? 0,
    ...partial,
  };
}

function rmiFrom(
  sb: number,
  coef: number,
  factor: number,
  eligibilityDate: string,
  set: ParameterSet
): number {
  const year = Number(eligibilityDate.slice(0, 4));
  return applyFloorCeiling(sb * coef * factor, year, set);
}

interface ScanCtx {
  person: InssPerson;
  set: ParameterSet;
  premises: LegalPremises;
  currentAgeMonths: number;
  deathAgeMonths: number;
  discount: number;
  sb: number;
}

function scanFirstEligible(
  ctx: ScanCtx,
  ruleId: InssRuleId,
  source: string,
  test: (
    atIso: string,
    ageMonths: number,
    tc: number,
    yearP: YearLegalParams,
    personAt: InssPerson
  ) => {
    ok: boolean;
    reasons: string[];
    coefficient: number;
    factor?: number;
    usesFactor?: boolean;
    uncertain?: boolean;
    contributionYears?: number;
  }
): InssRuleResult {
  const maxAge = Math.max(ctx.deathAgeMonths, ctx.currentAgeMonths + 12);
  for (let ageM = ctx.currentAgeMonths; ageM <= maxAge; ageM += 1) {
    const atIso = isoFromAgeMonths(ctx.person.birthDate, ageM);
    if (
      atIso.slice(0, 10) < ctx.person.asOf.slice(0, 10) &&
      ageM !== ctx.currentAgeMonths
    ) {
      continue;
    }
    const yearP = paramsForYear(ctx.set, Number(atIso.slice(0, 4)));
    const projected = projectHistory(ctx.person, atIso);
    const personAt = { ...ctx.person, history: projected, asOf: atIso };
    const tc = tempoContribuicaoMonths(projected, atIso);
    const probed = test(atIso, ageM, tc, yearP, personAt);
    if (probed.ok) {
      const years = probed.contributionYears ?? completeYears(tc);
      const factor = probed.factor ?? 1;
      const sb = benefitSalaryCents(personAt, atIso, ctx.set);
      const rmi = rmiFrom(sb, probed.coefficient, factor, atIso, ctx.set);
      const pv = presentValueCents(
        rmi,
        ageM,
        ctx.currentAgeMonths,
        ctx.deathAgeMonths,
        ctx.discount
      );
      return makeResult({
        ruleId,
        eligible: true,
        eligibilityAgeMonths: ageM,
        eligibilityDate: atIso,
        contributionYears: years,
        coefficient: probed.coefficient,
        benefitSalaryCents: sb,
        rmiCents: rmi,
        usesFactor: probed.usesFactor === true,
        factor: probed.usesFactor ? factor : undefined,
        presentValueCents: pv,
        reasons: probed.reasons,
        uncertain: probed.uncertain,
        source,
      });
    }
    if (ageM !== ctx.currentAgeMonths) ageM += 5;
  }
  return makeResult({
    ruleId,
    eligible: false,
    eligibilityAgeMonths: ctx.deathAgeMonths,
    eligibilityDate: isoFromAgeMonths(ctx.person.birthDate, ctx.deathAgeMonths),
    contributionYears: completeYears(
      tempoContribuicaoMonths(ctx.person.history, ctx.person.asOf)
    ),
    coefficient: 0,
    benefitSalaryCents: ctx.sb,
    rmiCents: 0,
    usesFactor: false,
    reasons: ["not eligible before planning horizon"],
    source,
  });
}

export function evaluateInss(
  person: InssPerson,
  options: EvaluateInssOptions = {}
): InssEvaluation {
  const set = options.parameterSet ?? DEFAULT_PARAMETER_SET;
  const premises: LegalPremises = {
    ...set.premises,
    ...options.premises,
  };
  const asOf = person.asOf;
  const sb = benefitSalaryCents(person, asOf, set);
  const currentAgeMonths = ageInMonths(person.birthDate, asOf);
  const life = options.lifeExpectancyAge ?? 90;
  const deathAgeMonths = life * 12;
  const discount = options.discountReal ?? DEFAULT_PORTFOLIO_REAL_RETURN;
  const ctx: ScanCtx = {
    person,
    set,
    premises,
    currentAgeMonths,
    deathAgeMonths,
    discount,
    sb,
  };
  const carencia = carenciaMonths(person.history, asOf);
  const tcNow = tempoContribuicaoMonths(person.history, asOf);
  const transition = filiatedBeforeReform(person);
  const sex = person.sex;
  const alfa = paramsForYear(set, Number(asOf.slice(0, 4)))
    .factorPrevidenciarioAlfa;

  const results: InssRuleResult[] = [];

  results.push(
    scanFirstEligible(ctx, "permanent", PERMANENT_SOURCE, (atIso, ageM, tc, _p, personAt) => {
      const reasons: string[] = [];
      if (transition) reasons.push("filiated before reform — permanent is residual");
      const needAge = sex === "F" ? 62 * 12 : 65 * 12;
      const needTc = requiredTcMonths(sex, "permanent");
      const ok =
        !transition &&
        ageM >= needAge &&
        tc >= needTc &&
        carenciaMonths(personAt.history, atIso) >= 180;
      if (ageM < needAge) reasons.push("below minimum age");
      if (tc < needTc) reasons.push("below minimum contribution time");
      const years = completeYears(tc);
      return {
        ok,
        reasons,
        coefficient: rgpsCoefficient(years, tMinYears(sex)),
        contributionYears: years,
      };
    })
  );

  results.push(
    scanFirstEligible(ctx, "points", TRANSITION_SOURCE, (atIso, ageM, tc, p, personAt) => {
      const needTc = requiredTcMonths(sex, "transition_tc");
      const pts = ageM / 12 + tc / 12;
      const needPts = pointsRequired(p, sex);
      const ok =
        transition &&
        tc >= needTc &&
        pts + 1e-9 >= needPts &&
        carenciaMonths(personAt.history, atIso) >= 180;
      const years = completeYears(tc);
      return {
        ok,
        reasons: ok
          ? [`${pts.toFixed(1)} points ≥ ${needPts} in ${p.year}`]
          : [`need ${needPts} points and ${needTc / 12}y TC`],
        coefficient: rgpsCoefficient(years, tMinYears(sex)),
        contributionYears: years,
      };
    })
  );

  results.push(
    scanFirstEligible(
      ctx,
      "progressive_age",
      TRANSITION_SOURCE,
      (atIso, ageM, tc, p, personAt) => {
        const needAge = progressiveAgeMonths(p, sex);
        const needTc = requiredTcMonths(sex, "transition_tc");
        const ok =
          transition &&
          ageM >= needAge &&
          tc >= needTc &&
          carenciaMonths(personAt.history, atIso) >= 180;
        const years = completeYears(tc);
        return {
          ok,
          reasons: ok
            ? [`progressive age ${needAge} months in ${p.year}`]
            : ["progressive age or TC not met"],
          coefficient: rgpsCoefficient(years, tMinYears(sex)),
          contributionYears: years,
        };
      }
    )
  );

  const remainingAtReform = Math.max(
    0,
    requiredTcMonths(sex, "transition_tc") - tcMonthsAtReform(person)
  );

  results.push(
    scanFirstEligible(ctx, "pedagio_50", TRANSITION_SOURCE, (atIso, ageM, tc, _p, personAt) => {
      const near = remainingAtReform <= 24;
      const needTc = requiredTcMonths(sex, "transition_tc") + Math.ceil(remainingAtReform * 0.5);
      const ok =
        transition &&
        near &&
        tc >= needTc &&
        carenciaMonths(personAt.history, atIso) >= 180;
      const years = completeYears(tc);
      const ageYears = ageM / 12;
      const factor = fatorPrevidenciarioLegal({
        contributionYears: years + (tc % 12) / 12,
        ageYears,
        sex,
        teacher: person.teacher === true,
        alfa,
        expectedRemainingYears: person.survivalExpectancyYears,
      });
      return {
        ok,
        reasons: near
          ? ok
            ? ["pedágio 50% (≤2 years remaining on 13/11/2019)"]
            : ["pedágio 50% time not yet complete"]
          : ["not within 2 years of 30/35 on 13/11/2019"],
        coefficient: 1,
        factor,
        usesFactor: true,
        contributionYears: years,
      };
    })
  );

  results.push(
    scanFirstEligible(ctx, "pedagio_100", TRANSITION_SOURCE, (atIso, ageM, tc, _p, personAt) => {
      const needAge = sex === "F" ? 57 * 12 : 60 * 12;
      const needTc =
        requiredTcMonths(sex, "transition_tc") + remainingAtReform;
      const ok =
        transition &&
        ageM >= needAge &&
        tc >= needTc &&
        carenciaMonths(personAt.history, atIso) >= 180;
      const years = completeYears(tc);
      return {
        ok,
        reasons: ok
          ? ["pedágio 100% + minimum age"]
          : ["pedágio 100% age or extra time not met"],
        coefficient: 1,
        contributionYears: years,
      };
    })
  );

  results.push(
    scanFirstEligible(ctx, "by_age", TRANSITION_SOURCE, (atIso, ageM, tc, _p, personAt) => {
      const needAge = sex === "F" ? 62 * 12 : 65 * 12;
      const needTc = 15 * 12;
      const coefTmin =
        sex === "F" ? 15 : premises.maleByAgeTminYears;
      const ok =
        transition &&
        ageM >= needAge &&
        tc >= needTc &&
        carenciaMonths(personAt.history, atIso) >= 180;
      const years = completeYears(tc);
      return {
        ok,
        reasons: ok
          ? [
              `art. 18 by-age; coefficient T_min=${coefTmin}${
                sex === "M" && premises.maleByAgeTminUncertain
                  ? " (uncertain)"
                  : ""
              }`,
            ]
          : ["by-age age or 15y TC not met"],
        coefficient: rgpsCoefficient(years, coefTmin),
        contributionYears: years,
        uncertain: sex === "M" && premises.maleByAgeTminUncertain,
      };
    })
  );

  const aRed = premises.teacherAgeReductionYears * 12;
  const isTeacher =
    person.teacher === true || teacherMonths(person.history, asOf) > 0;

  results.push(
    scanFirstEligible(
      ctx,
      "teacher_permanent",
      TEACHER_SOURCE,
      (atIso, ageM, tc, _p, personAt) => {
        const mag = teacherMonths(personAt.history, atIso);
        const needAge = (sex === "F" ? 62 : 65) * 12 - aRed;
        const needMag = 25 * 12;
        const ok =
          isTeacher &&
          !transition &&
          ageM >= needAge &&
          mag >= needMag &&
          carenciaMonths(personAt.history, atIso) >= 180;
        const years = completeYears(tc);
        return {
          ok,
          reasons: ok
            ? ["teacher permanent −5 years"]
            : ["teacher permanent not met"],
          coefficient: rgpsCoefficient(years, tMinYears(sex)),
          contributionYears: years,
          uncertain: premises.teacherTransitionUnconfirmed,
        };
      }
    )
  );

  results.push(
    scanFirstEligible(
      ctx,
      "teacher_pedagio_100",
      TEACHER_SOURCE,
      (atIso, ageM, tc, _p, personAt) => {
        const mag = teacherMonths(personAt.history, atIso);
        const needAge = (sex === "F" ? 57 : 60) * 12 - aRed;
        const magRequired = (sex === "F" ? 25 : 30) * 12;
        const magAtReform = teacherMonths(person.history, RGPS_REFORM_ISO);
        const magRemaining = Math.max(0, magRequired - magAtReform);
        const needMag = magRequired + magRemaining;
        const ok =
          isTeacher &&
          transition &&
          ageM >= needAge &&
          mag >= needMag &&
          carenciaMonths(personAt.history, atIso) >= 180;
        const years = completeYears(tc);
        return {
          ok,
          reasons: ok
            ? ["teacher pedágio 100% (−5 years, 2026 values unconfirmed)"]
            : ["teacher pedágio 100% not met"],
          coefficient: 1,
          contributionYears: years,
          uncertain: premises.teacherTransitionUnconfirmed,
        };
      }
    )
  );

  const exposure = person.specialExposureYears;
  if (exposure) {
    results.push(
      scanFirstEligible(ctx, "special", SPECIAL_SOURCE, (atIso, ageM, _tc, _p, personAt) => {
        const spec = specialMonths(personAt.history, atIso, exposure);
        const needSpec = exposure * 12;
        const needPts =
          exposure === 15
            ? paramsForYear(set, Number(atIso.slice(0, 4))).specialPoints15
            : exposure === 20
              ? paramsForYear(set, Number(atIso.slice(0, 4))).specialPoints20
              : paramsForYear(set, Number(atIso.slice(0, 4))).specialPoints26;
        const pts = ageM / 12 + spec / 12;
        const pointsOk = premises.requireSpecialPoints
          ? pts + 1e-9 >= needPts
          : true;
        const ok =
          spec >= needSpec &&
          pointsOk &&
          carenciaMonths(personAt.history, atIso) >= 180;
        const tMinSpecial = exposure === 15 ? 15 : tMinYears(sex);
        const years = completeYears(spec);
        return {
          ok,
          reasons: ok
            ? [
                `ADI 6309: no minimum age; exposure ${exposure}y${
                  premises.requireSpecialPoints
                    ? `; points ${needPts} required (conservative default)`
                    : "; points waived"
                }`,
              ]
            : [
                premises.requireSpecialPoints
                  ? `need ${exposure}y exposure and ${needPts} points`
                  : `need ${exposure}y exposure`,
              ],
          coefficient: rgpsCoefficient(years, tMinSpecial),
          contributionYears: years,
          uncertain: premises.requireSpecialPoints,
        };
      })
    );
  }

  const ranked = [...results]
    .filter((r) => r.eligible)
    .sort((a, b) => b.presentValueCents - a.presentValueCents);

  return {
    personId: person.id,
    asOf,
    benefitSalaryCents: sb,
    carenciaMonths: carencia,
    tcMonths: tcNow,
    ranked,
    best: ranked[0] ?? null,
    parameterSetVersion: set.version,
  };
}

export function addMonthsToIso(iso: string, months: number): string {
  return addMonthsIso(iso, months);
}
