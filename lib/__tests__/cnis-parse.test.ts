import { describe, expect, it } from "vitest";
import { parseCnisFile } from "@/lib/connectors/cnis/parse";
import { competencesForEngine, mapCnisToInssPerson } from "@/lib/connectors/cnis/map";
import {
  CNIS_FIXTURE_AS_OF,
  CNIS_FIXTURE_BIRTH,
  CNIS_FIXTURE_CSV,
  CNIS_FIXTURE_CONCURRENT_MONTHS,
  CNIS_FIXTURE_ESPECIAL_MONTHS,
  CNIS_FIXTURE_FILIATION,
  CNIS_FIXTURE_RURAL_MONTHS,
  CNIS_FIXTURE_SB_CENTS,
  CNIS_FIXTURE_SB_MONTHS,
  CNIS_FIXTURE_TC_MONTHS,
  CNIS_FIXTURE_TEXT,
  cnisFixturePdf,
} from "@/lib/connectors/cnis/fixture";
import { benefitSalaryCents, evaluateInss, tempoContribuicaoMonths } from "@/lib/engine/inss";
import { DEFAULT_PARAMETER_SET } from "@/lib/engine/parameters";
import { monthsInclusive } from "@/lib/engine/dates";
import { isOpenFinanceEnabled } from "@/lib/connectors/flags";

const HEALTH_LEAKS = [
  "B31",
  "AUXILIO-DOENCA",
  "AUXÍLIO-DOENÇA",
  "INVALIDEZ",
  "MEDICO",
  "MÉDICO",
  "DR. NAO PERSISTIR",
  "NAO PERSISTIR",
];

describe("CNIS parser", () => {
  const parsed = parseCnisFile(CNIS_FIXTURE_TEXT, { asOf: CNIS_FIXTURE_AS_OF });
  const extract = parsed.extract;
  const person = mapCnisToInssPerson(extract, {
    id: "person-maria",
    sex: "F",
    birthDate: CNIS_FIXTURE_BIRTH,
    filiationDate: CNIS_FIXTURE_FILIATION,
    lifeExpectancy: 90,
  });

  it("maps competências, vínculos and named non-health indicators", () => {
    expect(extract.displayName).toBe("MARIA SILVA");
    expect(extract.nit).toBe("12345678901");
    expect(extract.filiationDate).toBe(CNIS_FIXTURE_FILIATION);
    expect(extract.vinculos.some((v) => v.indicators.includes("PEXT"))).toBe(true);
    expect(extract.vinculos.some((v) => v.indicators.includes("PVINC"))).toBe(true);
    expect(extract.competences.some((c) => c.indicators.includes("PREC-MENOR"))).toBe(
      true
    );
    expect(extract.vinculos.some((v) => v.concurrent)).toBe(true);
    expect(extract.vinculos.some((v) => v.rural)).toBe(true);
    expect(extract.vinculos.some((v) => v.especialYears === 25)).toBe(true);
    const rural = extract.vinculos.find((v) => v.rural)!;
    expect(monthsInclusive(rural.start!, rural.end!)).toBe(CNIS_FIXTURE_RURAL_MONTHS);
  });

  it("drops health indicators and the B31 benefit vínculo before persist", () => {
    const json = JSON.stringify(parsed.persisted);
    for (const leak of HEALTH_LEAKS) {
      expect(json).not.toContain(leak);
    }
    expect(extract.vinculos.every((v) => v.type !== "BENEFICIO")).toBe(true);
    expect(extract.discardedHealthCount).toBeGreaterThan(0);
  });

  it("collapses concomitância: one month, summed wages", () => {
    const collapsed = competencesForEngine(extract);
    const overlap = collapsed.filter(
      (c) => c.yearMonth >= "2005-07" && c.yearMonth <= "2005-12"
    );
    expect(overlap).toHaveLength(CNIS_FIXTURE_CONCURRENT_MONTHS);
    expect(overlap.every((c) => c.wageCents === 350_000)).toBe(true);
    expect(overlap.every((c) => c.cnis?.concurrent)).toBe(true);
    expect(collapsed.filter((c) => c.yearMonth >= "1994-07")).toHaveLength(
      CNIS_FIXTURE_SB_MONTHS
    );
  });

  it("feeds the Phase 1 INSS engine: SB since 07/1994 matches the hand total", () => {
    const sb = benefitSalaryCents(person, CNIS_FIXTURE_AS_OF, DEFAULT_PARAMETER_SET);
    expect(sb).toBe(CNIS_FIXTURE_SB_CENTS);
    expect(tempoContribuicaoMonths(person.history, CNIS_FIXTURE_AS_OF)).toBe(
      CNIS_FIXTURE_TC_MONTHS
    );
    const especial = person.history.filter((c) => c.specialExposureYears === 25);
    expect(especial).toHaveLength(CNIS_FIXTURE_ESPECIAL_MONTHS);
    const ev = evaluateInss(person, { lifeExpectancyAge: 90 });
    expect(ev.benefitSalaryCents).toBe(CNIS_FIXTURE_SB_CENTS);
    expect(ev.asOf).toBe(CNIS_FIXTURE_AS_OF);
    expect(person.source).toBe("FILE_CNIS");
  });

  it("parses CSV and PDF text of the same extract family", () => {
    const csv = parseCnisFile(CNIS_FIXTURE_CSV, { asOf: CNIS_FIXTURE_AS_OF });
    expect(csv.extract.format).toBe("csv");
    expect(csv.extract.vinculos.some((v) => v.indicators.includes("PREC-MENOR"))).toBe(
      true
    );
    expect(JSON.stringify(csv.persisted)).not.toContain("B31");

    const pdf = parseCnisFile(cnisFixturePdf(), {
      asOf: CNIS_FIXTURE_AS_OF,
      fileName: "cnis.pdf",
    });
    expect(pdf.extract.format).toBe("pdf");
    expect(pdf.extract.vinculos.some((v) => v.rural)).toBe(true);
    expect(JSON.stringify(pdf.persisted)).not.toContain("AUXILIO-DOENCA");
  });

  it("does not enable Open Finance or ask for gov.br", () => {
    expect(isOpenFinanceEnabled()).toBe(false);
    expect(CNIS_FIXTURE_TEXT.toLowerCase()).not.toContain("senha gov");
  });
});
