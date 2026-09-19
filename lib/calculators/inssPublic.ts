import {
  evaluateInss,
  fillContributionRange,
  type InssEvaluation,
  type InssPerson,
  type InssRuleId,
  type InssRuleResult,
  type Sex,
} from "@/lib/engine/inss";
import { birthDateFromAge } from "@/lib/engine/household";
import { addMonthsYm, monthsInclusive } from "@/lib/engine/dates";
import { RGPS_REFORM_ISO } from "@/lib/engine/inssTypes";
import {
  DEFAULT_PARAMETER_SET,
  paramsForYear,
  type YearLegalParams,
} from "@/lib/engine/parameters";
import { PUBLIC_CALCULATOR_AS_OF } from "@/lib/calculators/seo";

export interface PublicInssInput {
  sex: Sex;
  age: number;
  contributionYears: number;
  monthlyWage: number;
  filiatedBeforeReform: boolean;
  teacher: boolean;
}

export const INSS_DEFAULTS: PublicInssInput = {
  sex: "F",
  age: 52,
  contributionYears: 22,
  monthlyWage: 4_000,
  filiatedBeforeReform: true,
  teacher: false,
};

const TEACHER_RULES: ReadonlySet<InssRuleId> = new Set([
  "teacher_permanent",
  "teacher_points",
  "teacher_progressive_age",
  "teacher_pedagio_100",
]);

export const RULE_LABELS: Record<
  InssRuleId,
  { title: string; explainer: string }
> = {
  permanent: {
    title: "Regra permanente",
    explainer:
      "Vale para quem se filiou ao RGPS a partir de 13 de novembro de 2019. Mulher: 62 anos e 15 de contribuição. Homem: 65 anos e 20 de contribuição. Nos dois casos, também precisa de 180 meses de carência.",
  },
  points: {
    title: "Regra de pontos",
    explainer:
      "Soma a idade com o tempo de contribuição. Em 2026 essa soma precisa chegar a 93 (mulher) ou 103 (homem), além do tempo mínimo de 30 ou 35 anos. A tabela sobe um ponto por ano até o teto da reforma.",
  },
  progressive_age: {
    title: "Idade mínima progressiva",
    explainer:
      "A idade mínima sobe seis meses por ano. Em 2026 está em 59 anos e 6 meses (mulher) e 64 anos e 6 meses (homem), com o mesmo tempo mínimo da regra de pontos.",
  },
  pedagio_50: {
    title: "Pedágio de 50%",
    explainer:
      "Só para quem, em 13 de novembro de 2019, estava a dois anos ou menos de completar 30 anos de contribuição (mulher) ou 35 (homem). Você trabalha o tempo que faltava mais metade disso. Entra o fator previdenciário.",
  },
  pedagio_100: {
    title: "Pedágio de 100%",
    explainer:
      "Você trabalha o dobro do tempo que faltava em 2019. A idade mínima é menor: 57 (mulher) ou 60 (homem). O coeficiente da reforma não corta o valor inicial — mas o tempo extra é grande.",
  },
  by_age: {
    title: "Aposentadoria por idade",
    explainer:
      "62 anos (mulher) ou 65 (homem), com 15 anos de contribuição e 180 meses de carência. O valor inicial usa o coeficiente da reforma, que começa em 60% e sobe 2% a cada ano acima do mínimo.",
  },
  teacher_permanent: {
    title: "Magistério — regra permanente",
    explainer:
      "Para professoras e professores da educação básica que se filiaram depois da reforma: idade reduzida em cinco anos e 25 anos de magistério.",
  },
  teacher_points: {
    title: "Magistério — pontos",
    explainer:
      "Soma idade e tempo de magistério, com tabela própria de pontos em 2026 e tempo mínimo de 25 anos (mulher) ou 30 (homem).",
  },
  teacher_progressive_age: {
    title: "Magistério — idade progressiva",
    explainer:
      "Idade mínima do magistério, que também sobe seis meses por ano, com o tempo de sala de aula exigido na transição.",
  },
  teacher_pedagio_100: {
    title: "Magistério — pedágio de 100%",
    explainer:
      "O dobro do tempo de magistério que faltava em 2019, com idade mínima reduzida em cinco anos.",
  },
  special: {
    title: "Tempo especial",
    explainer:
      "Exposição a agentes nocivos. Esta página pública não pede esse histórico — o app trata o caso quando o CNIS traz o dado.",
  },
};

export interface PublicInssRuleView {
  ruleId: InssRuleId;
  title: string;
  explainer: string;
  eligible: boolean;
  eligibilityDate: string;
  eligibilityAgeYears: number;
  rmiReais: number;
  coefficient: number;
  usesFactor: boolean;
  factor?: number;
  uncertain?: boolean;
  source: string;
}

export interface PublicInssView {
  input: PublicInssInput;
  person: InssPerson;
  evaluation: InssEvaluation;
  yearParams: YearLegalParams;
  rules: PublicInssRuleView[];
  best: PublicInssRuleView | null;
  carenciaMonths: number;
  tcMonths: number;
  historyMonths: number;
}

function toCents(reais: number): number {
  return Math.round(reais * 100);
}

/**
 * Builds a synthetic CLT history and calls evaluateInss.
 * Wages are treated as already in today's money (inpcFactor = 1).
 */
export function buildPublicInssPerson(
  input: PublicInssInput,
  asOf = PUBLIC_CALCULATOR_AS_OF
): InssPerson {
  const birthDate = birthDateFromAge(input.age, asOf);
  const wantedMonths = Math.round(Math.max(0, input.contributionYears) * 12);
  const toYm = asOf.slice(0, 7);
  const naturalFromYm =
    wantedMonths <= 0 ? toYm : addMonthsYm(toYm, -(wantedMonths - 1));
  const naturalStart = `${naturalFromYm}-01`;

  let filiationDate: string;
  if (input.filiatedBeforeReform) {
    filiationDate =
      naturalStart.slice(0, 10) < RGPS_REFORM_ISO
        ? naturalStart
        : "2019-11-12";
  } else {
    filiationDate =
      naturalStart.slice(0, 10) > RGPS_REFORM_ISO
        ? naturalStart
        : RGPS_REFORM_ISO;
  }

  const fromYm = filiationDate.slice(0, 7);
  const span = wantedMonths <= 0 ? 0 : monthsInclusive(fromYm, toYm);
  const history =
    span > 0
      ? fillContributionRange(fromYm, toYm, toCents(input.monthlyWage), "clt", {
          inpcFactor: 1,
          teacher: input.teacher || undefined,
        })
      : [];

  return {
    id: "public-inss",
    sex: input.sex,
    birthDate,
    filiationDate: filiationDate.slice(0, 10),
    history,
    asOf,
    teacher: input.teacher || undefined,
  };
}

export function toPublicRuleView(rule: InssRuleResult): PublicInssRuleView {
  const copy = RULE_LABELS[rule.ruleId];
  return {
    ruleId: rule.ruleId,
    title: copy.title,
    explainer: copy.explainer,
    eligible: rule.eligible,
    eligibilityDate: rule.eligibilityDate,
    eligibilityAgeYears: rule.eligibilityAgeMonths / 12,
    rmiReais: rule.rmiCents / 100,
    coefficient: rule.coefficient,
    usesFactor: rule.usesFactor,
    factor: rule.factor,
    uncertain: rule.uncertain,
    source: rule.source,
  };
}

export function simulatePublicInss(
  input: PublicInssInput,
  asOf = PUBLIC_CALCULATOR_AS_OF
): PublicInssView {
  const person = buildPublicInssPerson(input, asOf);
  const evaluation = evaluateInss(person);
  const yearParams = paramsForYear(
    DEFAULT_PARAMETER_SET,
    Number(asOf.slice(0, 4))
  );
  const visible = evaluation.ranked.filter((rule) => {
    if (TEACHER_RULES.has(rule.ruleId)) return input.teacher;
    if (rule.ruleId === "special") return false;
    return true;
  });
  const rules = visible.map(toPublicRuleView);
  const bestRule = visible[0] ?? null;
  return {
    input,
    person,
    evaluation,
    yearParams,
    rules,
    best: bestRule ? toPublicRuleView(bestRule) : null,
    carenciaMonths: evaluation.carenciaMonths,
    tcMonths: evaluation.tcMonths,
    historyMonths: person.history.length,
  };
}
