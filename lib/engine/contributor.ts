import {
  DEFAULT_PARAMETER_SET,
  paramsForYear,
  type ParameterSet,
} from "@/lib/engine/parameters";
import type { ContributorKind } from "@/lib/engine/inssTypes";
import { countsAsTempoContribuicao, type ContributionCompetence } from "@/lib/engine/inssTypes";

export type LowRatePlan = "mei_5" | "mei_12" | "facultative_5" | "simplified_11";

export interface ContributorQuote {
  kind: ContributorKind;
  year: number;
  /** Chosen contribution base; clamped to [minimum wage, ceiling] for 20%. */
  declaredBaseCents?: number;
  parameterSet?: ParameterSet;
}

export interface ContributorCharge {
  kind: ContributorKind;
  rate: number;
  baseCents: number;
  contributionCents: number;
  gpsCode: string | null;
  /** Age retirement at the floor only; no TC / transition credit. */
  floorOnlyAgeRetirement: boolean;
  countsAsTempoContribuicao: boolean;
  entitlements: string[];
  source: string;
}

const AGE_FLOOR_ENTITLEMENTS = [
  "aposentadoria_idade_piso",
  "auxilio_doenca",
  "salario_maternidade",
  "pensao_por_morte",
] as const;

const ALL_ENTITLEMENTS = [
  "aposentadoria_idade",
  "aposentadoria_tempo",
  "regras_transicao",
  "auxilio_doenca",
  "salario_maternidade",
  "pensao_por_morte",
  "ctc",
] as const;

export function contributorCharge(input: ContributorQuote): ContributorCharge {
  const set = input.parameterSet ?? DEFAULT_PARAMETER_SET;
  const p = paramsForYear(set, input.year);
  const min = p.minimumWageCents;
  const ceiling = p.rgpsCeilingCents;

  if (input.kind === "mei_5" || input.kind === "facultative_5") {
    const rate = p.contributorMeiRate;
    return {
      kind: input.kind,
      rate,
      baseCents: min,
      contributionCents: Math.round(min * rate),
      gpsCode: input.kind === "mei_5" ? "DAS" : "GPS-1288",
      floorOnlyAgeRetirement: true,
      countsAsTempoContribuicao: false,
      entitlements: [...AGE_FLOOR_ENTITLEMENTS],
      source:
        "LC 123/2006 (MEI 5%); Lei 8.212/1991 art. 21 §2º (facultativo baixa renda)",
    };
  }
  if (input.kind === "mei_12") {
    const rate = p.contributorMeiTruckerRate;
    return {
      kind: input.kind,
      rate,
      baseCents: min,
      contributionCents: Math.round(min * rate),
      gpsCode: "DAS",
      floorOnlyAgeRetirement: true,
      countsAsTempoContribuicao: false,
      entitlements: [...AGE_FLOOR_ENTITLEMENTS],
      source: "LC 188/2021 (MEI caminhoneiro 12%)",
    };
  }
  if (input.kind === "simplified_11") {
    const rate = p.contributorSimplifiedRate;
    return {
      kind: input.kind,
      rate,
      baseCents: min,
      contributionCents: Math.round(min * rate),
      gpsCode: "GPS-1163",
      floorOnlyAgeRetirement: true,
      countsAsTempoContribuicao: false,
      entitlements: ["aposentadoria_idade_piso", "pensao_por_morte"],
      source: "Lei 8.212/1991 art. 21 §2º (plano simplificado 11%)",
    };
  }
  const rate = p.contributorNormalRate;
  const base = Math.min(
    ceiling,
    Math.max(min, input.declaredBaseCents ?? min)
  );
  return {
    kind: input.kind,
    rate,
    baseCents: base,
    contributionCents: Math.round(base * rate),
    gpsCode: "1007",
    floorOnlyAgeRetirement: false,
    countsAsTempoContribuicao: true,
    entitlements: [...ALL_ENTITLEMENTS],
    source: "Lei 8.212/1991 art. 21 (contribuinte individual 20%)",
  };
}

export interface Complementacao {
  from: LowRatePlan;
  extraRate: number;
  extraCents: number;
  gpsCode: string;
  /** Quality of time only — RMI stays at the floor unless 20% on a larger base. */
  changesBenefitAmount: boolean;
  source: string;
}

/** 5%→20% is +15% (GPS 1910); 11%→20% is +9%. Both on the minimum wage. */
export function complementToNormal(
  from: LowRatePlan,
  year = 2026,
  parameterSet: ParameterSet = DEFAULT_PARAMETER_SET
): Complementacao {
  const p = paramsForYear(parameterSet, year);
  if (from === "simplified_11") {
    return {
      from,
      extraRate: 0.09,
      extraCents: Math.round(p.minimumWageCents * 0.09),
      gpsCode: "GPS-complemento-11",
      changesBenefitAmount: false,
      source: "GPS complemento 11%→20% sobre o salário mínimo",
    };
  }
  const extraRate = from === "mei_12" ? 0.08 : 0.15;
  return {
    from,
    extraRate,
    extraCents: Math.round(p.minimumWageCents * extraRate),
    gpsCode: "1910",
    changesBenefitAmount: false,
    source:
      "GPS código 1910 — complementação MEI/facultativo 5% até 20% sobre o mínimo (qualidade do tempo, não valor)",
  };
}

export function competenceCountsAsTc(
  c: ContributionCompetence
): boolean {
  return countsAsTempoContribuicao(c);
}
