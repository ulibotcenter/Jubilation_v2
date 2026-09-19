import type { ContributionCompetence, InssPerson, SpecialExposure } from "@/lib/engine/inssTypes";
import type { Person } from "@/lib/engine/household";
import type { CnisCompetence, CnisExtract } from "@/lib/connectors/cnis/types";

function mergeFlags(
  a: ContributionCompetence["cnis"],
  b: CnisCompetence
): ContributionCompetence["cnis"] {
  const indicators = new Set([
    ...(a?.precMenor ? ["PREC-MENOR"] : []),
    ...(a?.pext ? ["PEXT"] : []),
    ...(a?.pvinc ? ["PVINC"] : []),
    ...b.indicators,
  ]);
  return {
    precMenor: indicators.has("PREC-MENOR") || a?.precMenor,
    pext: indicators.has("PEXT") || a?.pext,
    pvinc: indicators.has("PVINC") || a?.pvinc,
    concurrent: Boolean(a?.concurrent || b.concurrent),
    rural: Boolean(a?.rural || b.rural),
    especialYears: (b.especialYears ?? a?.especialYears ?? null) as SpecialExposure | null,
    vinculoSeq: b.vinculoSeq,
    employerName: a?.employerName,
  };
}

/**
 * Collapse overlapping vínculos in the same competence: one month of TC,
 * summed wages (ceiling applied later by the engine).
 */
export function competencesForEngine(extract: CnisExtract): ContributionCompetence[] {
  const byYm = new Map<string, ContributionCompetence>();
  for (const row of extract.competences) {
    if (!row.yearMonth) continue;
    const existing = byYm.get(row.yearMonth);
    const next: ContributionCompetence = {
      yearMonth: row.yearMonth,
      wageCents: (existing?.wageCents ?? 0) + row.wageCents,
      kind: extract.vinculos.find((v) => v.seq === row.vinculoSeq)?.kind ?? "clt",
      specialExposureYears: row.especialYears ?? existing?.specialExposureYears,
      cnis: mergeFlags(existing?.cnis, {
        ...row,
        concurrent: Boolean(existing) || row.concurrent,
      }),
    };
    if (existing) {
      next.cnis = { ...next.cnis, concurrent: true };
    }
    byYm.set(row.yearMonth, next);
  }
  return [...byYm.values()].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}

export function mapCnisToInssPerson(
  extract: CnisExtract,
  person: Pick<Person, "id" | "sex" | "birthDate" | "filiationDate" | "lifeExpectancy">
): InssPerson {
  const history = competencesForEngine(extract);
  const especial = history.find((c) => c.specialExposureYears)?.specialExposureYears ?? null;
  const filiation =
    extract.filiationDate ??
    person.filiationDate ??
    extract.vinculos
      .map((v) => v.start)
      .filter((d): d is string => Boolean(d))
      .sort()[0] ??
    person.birthDate;
  return {
    id: person.id,
    sex: person.sex,
    birthDate: extract.birthDate ?? person.birthDate,
    filiationDate: filiation,
    history,
    asOf: extract.asOf,
    specialExposureYears: especial,
    source: "FILE_CNIS",
  };
}
