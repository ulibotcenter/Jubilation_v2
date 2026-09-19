import { describe, expect, it } from "vitest";
import {
  applyFloorCeiling,
  benefitSalaryCents,
  evaluateInss,
  fatorPrevidenciario,
  fatorPrevidenciarioLegal,
  fatorTcBonusYears,
  fillContributionRange,
  rgpsCoefficient,
} from "@/lib/engine/inss";
import { DEFAULT_PARAMETER_SET, paramsForYear } from "@/lib/engine/parameters";
import { inpcCorrectionFactor, inpcMonthlyPercent } from "@/lib/engine/inpc";
import { minimumWageAt, rgpsCeilingAt } from "@/lib/engine/rgpsLegalSeries";
import { complementToNormal, contributorCharge } from "@/lib/engine/contributor";
import {
  pgblDeduction,
  redeemLots,
  type PrevidenciaLot,
} from "@/lib/engine/previdencia";
import {
  comeCotasApplies,
  comeCotasLevyCents,
  comeCotasRate,
  isComeCotasCalendarMonth,
} from "@/lib/engine/comeCotas";
import { survivorPension } from "@/lib/engine/survivorPension";
import {
  defaultHousehold,
  lastSurvivorAgeInHolderYears,
  ownershipInScope,
} from "@/lib/engine/household";
import { createPerson } from "@/lib/engine/household";
import { fgtsBirthdayOneBracketCents, projectFgtsYear } from "@/lib/engine/fgts";
import {
  RENDA_MAIS_INSTALLMENTS,
  rendaMaisCustodyRate,
  rendaMaisMonthlyParcelCents,
} from "@/lib/engine/rendaMais";
import { DEFAULT_LEGAL_PREMISES } from "@/lib/engine/parameters";
import { buildEnginePlan } from "@/lib/engine/adapter";
import { defaultPlan } from "@/lib/engine/plan";
import { projectPlan } from "@/lib/engine/project";
import {
  IBGE_2024_E60_BOTH_SEXES,
  IBGE_2024_E60_WOMAN,
  expectedRemainingYearsBothSexes,
} from "@/lib/engine/mortality";
import { annualToMonthly } from "@/lib/engine/rates";
import { normalizeKpiValues } from "@/types";
import type { InssPerson } from "@/lib/engine/inssTypes";

const CEILING = 847_555;
const MIN_WAGE = 162_100;

/** Isolate eligibility/coefficient from INPC (wages already in DIB money). */
function frozenRange(
  from: string,
  to: string,
  wageCents: number,
  kind: InssPerson["history"][number]["kind"] = "clt",
  extra: Partial<InssPerson["history"][number]> = {}
) {
  return fillContributionRange(from, to, wageCents, kind, {
    inpcFactor: 1,
    ...extra,
  });
}

function person(partial: Partial<InssPerson> & Pick<InssPerson, "sex" | "birthDate" | "filiationDate" | "history">): InssPerson {
  return {
    id: "p1",
    asOf: "2026-01-01",
    ...partial,
  };
}

describe("INSS — salário de benefício and coefficient", () => {
  it("averages 100% of wages since 07/1994, capped per competence, no 20% discard", () => {
    const history = [
      { yearMonth: "1994-06", wageCents: 50_000, kind: "clt" as const, inpcFactor: 1 },
      { yearMonth: "2024-01", wageCents: 100_000, kind: "clt" as const, inpcFactor: 1 },
      { yearMonth: "2024-02", wageCents: 200_000, kind: "clt" as const, inpcFactor: 1 },
      { yearMonth: "2024-03", wageCents: 300_000, kind: "clt" as const, inpcFactor: 1 },
    ];
    const sb = benefitSalaryCents(
      person({
        sex: "F",
        birthDate: "1970-01-01",
        filiationDate: "1990-01-01",
        history,
      }),
      "2026-01-01",
      DEFAULT_PARAMETER_SET
    );
    // June 1994 is before 07/1994 and dropped. (100+200+300)/3 = 200_000
    expect(sb).toBe(200_000);
  });

  it("caps 2024 at Portaria MPS/MF 2/2024 teto R$ 7.786,02, not the 2026 teto", () => {
    const history = fillContributionRange("2024-01", "2024-01", 50_000_000, "clt", {
      inpcFactor: 1,
    });
    const sb = benefitSalaryCents(
      person({
        sex: "M",
        birthDate: "1960-01-01",
        filiationDate: "1990-01-01",
        history,
      }),
      "2024-02-01",
      DEFAULT_PARAMETER_SET
    );
    expect(rgpsCeilingAt("2024-01").cents).toBe(778_602);
    expect(sb).toBe(778_602);
    expect(sb).not.toBe(CEILING);
  });

  it("caps 1995-06 at Portaria 2.005/1995 teto R$ 832,66", () => {
    const history = fillContributionRange("1995-06", "1995-06", 50_000_000, "clt", {
      inpcFactor: 1,
    });
    const sb = benefitSalaryCents(
      person({
        sex: "M",
        birthDate: "1940-01-01",
        filiationDate: "1990-01-01",
        history,
      }),
      "1995-07-01",
      DEFAULT_PARAMETER_SET
    );
    expect(sb).toBe(83_266);
  });

  it("coefficient 60% + 2% per year over Tmin (15W / 20M)", () => {
    expect(rgpsCoefficient(15, 15)).toBeCloseTo(0.6, 10);
    expect(rgpsCoefficient(35, 15)).toBeCloseTo(1.0, 10);
    expect(rgpsCoefficient(20, 20)).toBeCloseTo(0.6, 10);
    expect(rgpsCoefficient(40, 20)).toBeCloseTo(1.0, 10);
    expect(rgpsCoefficient(25, 20)).toBeCloseTo(0.7, 10);
  });

  it("RMI is floored at the minimum wage and capped at the RGPS ceiling", () => {
    expect(applyFloorCeiling(1_000, 2026, DEFAULT_PARAMETER_SET)).toBe(MIN_WAGE);
    expect(applyFloorCeiling(50_000_000, 2026, DEFAULT_PARAMETER_SET)).toBe(CEILING);
  });

  it("INPC: Feb/2024 0,81% (BCB SGS 188) corrects Jan/2024 wage to DIB Mar/2024", () => {
    // Lei 8.213 art. 29-B: product of INPC from month after competence through DIB−1.
    // Competence 2024-01, DIB 2024-03 → only Feb/2024 = 0,81%.
    expect(inpcMonthlyPercent("2024-02")).toBe(0.81);
    expect(inpcCorrectionFactor("2024-01", "2024-03")).toBeCloseTo(1.0081, 10);
    const history = fillContributionRange("2024-01", "2024-01", 100_000, "clt");
    const sb = benefitSalaryCents(
      person({
        sex: "F",
        birthDate: "1970-01-01",
        filiationDate: "1990-01-01",
        history,
      }),
      "2024-03-01",
      DEFAULT_PARAMETER_SET
    );
    // 100_000 × 1,0081 = 100_810
    expect(sb).toBe(100_810);
  });
});

describe("INSS — permanent vs 2026 transition", () => {
  it("woman filiated after the reform, 62, 15y at the 2026 teto → RMI R$ 5.085,33", () => {
    // 180 months at the 2026 teto, already in DIB money. Age 62 on 2041-01-01 if born 1979-01-01.
    const history = frozenRange("2026-01", "2040-12", CEILING);
    const ev = evaluateInss(
      person({
        sex: "F",
        birthDate: "1979-01-01",
        filiationDate: "2026-01-01",
        asOf: "2041-01-01",
        history,
      }),
      { discountReal: 0, lifeExpectancyAge: 90 }
    );
    const perm = ev.ranked.find((r) => r.ruleId === "permanent");
    expect(perm?.eligible).toBe(true);
    expect(perm?.coefficient).toBeCloseTo(0.6, 10);
    // Portaria MPS/MF 13/2026 art. 2º: 8.475,55 × 0,60 = 5.085,33
    expect(perm?.rmiCents).toBe(508_533);
    expect(ev.best?.ruleId).toBe("permanent");
  });

  it("man aged 64 with 20y after the reform is not yet eligible", () => {
    const history = frozenRange("2015-01", "2034-12", CEILING);
    const ev = evaluateInss(
      person({
        sex: "M",
        birthDate: "1971-01-01",
        filiationDate: "2020-01-01",
        asOf: "2035-01-01",
        history,
      })
    );
    expect(ev.ranked.find((r) => r.ruleId === "permanent")?.eligibilityDate.startsWith("2036")).toBe(
      true
    );
  });

  it("2026 points: woman 55 + 38y TC = 93, coefficient 106%", () => {
    const history = frozenRange("1988-01", "2025-12", 50_000);
    const ev = evaluateInss(
      person({
        sex: "F",
        birthDate: "1971-01-01",
        filiationDate: "1988-01-01",
        asOf: "2026-01-01",
        history,
      }),
      { discountReal: 0 }
    );
    const points = ev.ranked.find((r) => r.ruleId === "points");
    expect(points?.eligible).toBe(true);
    // 38 complete years, Tmin 15 → 60% + 2%×23 = 106%
    expect(points?.coefficient).toBeCloseTo(1.06, 10);
  });

  it("progressive age 2026: woman needs 59y6m + 30y TC", () => {
    const history = frozenRange("1996-01", "2025-12", CEILING);
    const tooYoung = evaluateInss(
      person({
        sex: "F",
        birthDate: "1967-01-01",
        filiationDate: "1996-01-01",
        asOf: "2026-01-01",
        history,
      })
    );
    // age 59y0m on 2026-01-01 — below 59y6m today; first eligible mid-2026.
    const progressive = tooYoung.ranked.find((r) => r.ruleId === "progressive_age");
    expect(progressive?.eligible).toBe(true);
    expect(progressive!.eligibilityDate > "2026-01-01").toBe(true);

    const oldEnough = evaluateInss(
      person({
        sex: "F",
        birthDate: "1966-07-01",
        filiationDate: "1996-01-01",
        asOf: "2026-01-01",
        history,
      })
    );
    expect(
      oldEnough.ranked.find((r) => r.ruleId === "progressive_age")?.eligible
    ).toBe(true);
  });

  it("fator previdenciário: Lei 9.876 §8º Es both-sexes 22.6 and §9º I woman +5 Tc", () => {
    // Premise: compact IBGE 2024 uses the published e(60) both-sexes = 22.6
    // (not the woman's 24.2). Intermediate ages interpolate; this golden is at 60.
    expect(expectedRemainingYearsBothSexes(60)).toBe(IBGE_2024_E60_BOTH_SEXES);
    expect(fatorTcBonusYears({ sex: "F" })).toBe(5);
    expect(fatorTcBonusYears({ sex: "M" })).toBe(0);
    expect(fatorTcBonusYears({ sex: "F", teacher: true })).toBe(10);

    // Lei 9.876/1999 art. 29: f = (Tc×0.31/Es)×[1+(Id+Tc×0.31)/100]
    // §8º Es = both-sexes; §9º I woman +5 on Tc. Woman 60, Tc 30 → Tc' = 35.
    const tc = 30 + 5;
    const es = IBGE_2024_E60_BOTH_SEXES;
    const statute = ((tc * 0.31) / es) * (1 + (60 + tc * 0.31) / 100);
    const legal = fatorPrevidenciarioLegal({
      contributionYears: 30,
      ageYears: 60,
      sex: "F",
    });
    expect(legal).toBeCloseTo(statute, 10);
    expect(legal).toBeCloseTo(0.82023119469, 8);

    const man = fatorPrevidenciarioLegal({
      contributionYears: 30,
      ageYears: 60,
      sex: "M",
    });
    const manStatute =
      ((30 * 0.31) / es) * (1 + (60 + 30 * 0.31) / 100);
    expect(man).toBeCloseTo(manStatute, 10);

    // 0.6506 was Tc=30 and woman's e(60)=24.2 — wrong inputs, not the statute.
    const oldWrongInputs = fatorPrevidenciario({
      contributionYears: 30,
      ageYears: 60,
      expectedRemainingYears: IBGE_2024_E60_WOMAN,
    });
    expect(oldWrongInputs).toBeCloseTo(0.650615702479, 10);
    expect(legal - oldWrongInputs).toBeGreaterThan(0.15);
  });

  it("ADI 6309: special has no minimum age; points 86 kept by default", () => {
    const history = frozenRange("2001-01", "2025-12", CEILING, "clt", {
      specialExposureYears: 25,
    });
    const young = evaluateInss(
      person({
        sex: "F",
        birthDate: "1976-01-01",
        filiationDate: "2001-01-01",
        asOf: "2026-01-01",
        specialExposureYears: 25,
        history,
      })
    );
    // 50 + 25 = 75 points < 86 today; first eligible once age+exposure hits 86.
    const specialNow = young.ranked.find((r) => r.ruleId === "special");
    expect(specialNow?.eligible).toBe(true);
    expect(specialNow!.eligibilityDate > "2026-01-01").toBe(true);

    const waived = evaluateInss(
      person({
        sex: "F",
        birthDate: "1976-01-01",
        filiationDate: "2001-01-01",
        asOf: "2026-01-01",
        specialExposureYears: 25,
        history,
      }),
      { premises: { requireSpecialPoints: false } }
    );
    expect(waived.ranked.find((r) => r.ruleId === "special")?.eligible).toBe(true);
  });
});

describe("Autônomo / MEI / facultativo", () => {
  it("MEI 5% of R$ 1.621,00 is R$ 81,05 and only buys age retirement at the floor", () => {
    const c = contributorCharge({ kind: "mei_5", year: 2026 });
    expect(c.contributionCents).toBe(8_105);
    expect(c.floorOnlyAgeRetirement).toBe(true);
    expect(c.countsAsTempoContribuicao).toBe(false);
  });

  it("simplified 11% is R$ 178,31; normal 20% on the minimum is R$ 324,20", () => {
    expect(contributorCharge({ kind: "simplified_11", year: 2026 }).contributionCents).toBe(17_831);
    expect(
      contributorCharge({ kind: "normal_20", year: 2026, declaredBaseCents: MIN_WAGE })
        .contributionCents
    ).toBe(32_420);
    expect(
      contributorCharge({ kind: "normal_20", year: 2026, declaredBaseCents: CEILING })
        .contributionCents
    ).toBe(169_511);
  });

  it("complement 5%→20% is +R$ 243,15 and does not raise the RMI", () => {
    const extra = complementToNormal("mei_5", 2026);
    expect(extra.extraCents).toBe(24_315);
    expect(extra.gpsCode).toBe("1910");
    expect(extra.changesBenefitAmount).toBe(false);
  });

  it("MEI months do not count as tempo de contribuição until complemented", () => {
    const mei = fillContributionRange("2010-01", "2025-12", MIN_WAGE, "mei_5");
    const ev = evaluateInss(
      person({
        sex: "F",
        birthDate: "1964-01-01",
        filiationDate: "2010-01-01",
        history: mei,
      })
    );
    expect(ev.tcMonths).toBe(0);
    const complemented = mei.map((c) => ({ ...c, complemented: true }));
    const ev2 = evaluateInss(
      person({
        sex: "F",
        birthDate: "1964-01-01",
        filiationDate: "2010-01-01",
        history: complemented,
      })
    );
    expect(ev2.tcMonths).toBeGreaterThan(0);
  });
});

describe("PGBL / VGBL lots", () => {
  const lots: PrevidenciaLot[] = [
    {
      id: "old",
      contributedOn: "2015-01-01",
      principalCents: 100_000,
      gainCents: 50_000,
      vehicle: "pgbl",
    },
    {
      id: "new",
      contributedOn: "2025-01-01",
      principalCents: 100_000,
      gainCents: 0,
      vehicle: "pgbl",
    },
  ];

  it("regressive table is per lot, not plan age — 11y lot at 10%, 1y lot at 35%", () => {
    const { slices } = redeemLots(lots, 80_000, "2026-01-01", { order: "fifo" });
    expect(slices).toHaveLength(1);
    expect(slices[0]?.lotId).toBe("old");
    expect(slices[0]?.rate).toBe(0.1);
    expect(slices[0]?.taxCents).toBe(8_000);
  });

  it("FIFO then consumes the new lot at 35%", () => {
    const { slices } = redeemLots(lots, 180_000, "2026-01-01", { order: "fifo" });
    expect(slices[0]?.rate).toBe(0.1);
    expect(slices[1]?.lotId).toBe("new");
    expect(slices[1]?.rate).toBe(0.35);
    expect(slices[1]?.taxCents).toBe(Math.round(30_000 * 0.35));
  });

  it("VGBL taxes only the gain share of the lot", () => {
    const vgbl: PrevidenciaLot[] = [
      { ...lots[0]!, vehicle: "vgbl" },
    ];
    const { slices } = redeemLots(vgbl, 75_000, "2026-01-01");
    // 75_000 / 150_000 of a lot that is 1/3 gain → taxable 25_000 at 10% = 2_500
    expect(slices[0]?.taxableCents).toBe(25_000);
    expect(slices[0]?.taxCents).toBe(2_500);
  });

  it("PGBL 12% cap: R$ 100.000 income, R$ 15.000 contribution → R$ 3.000 excess", () => {
    const r = pgblDeduction({
      taxableIncomeCents: 10_000_000,
      contributionCents: 1_500_000,
      hasTaxableIncome: true,
      completeDeclaration: true,
      rgpsOrRppsContributor: true,
    });
    expect(r.deductibleCents).toBe(1_200_000);
    expect(r.excessCents).toBe(300_000);
    expect(r.doubleTaxWarning).toBe(true);
  });

  it("PGBL deduction fails if any of the three requirements is missing", () => {
    const r = pgblDeduction({
      taxableIncomeCents: 10_000_000,
      contributionCents: 1_200_000,
      hasTaxableIncome: true,
      completeDeclaration: false,
      rgpsOrRppsContributor: true,
    });
    expect(r.qualifies).toBe(false);
    expect(r.deductibleCents).toBe(0);
    expect(r.missing).toContain("complete_declaration");
  });
});

describe("Come-cotas — IN RFB 1.585/2015", () => {
  it("long-term 15%, short-term 20%, May and November", () => {
    expect(comeCotasRate("long")).toBe(0.15);
    expect(comeCotasRate("short")).toBe(0.2);
    expect(isComeCotasCalendarMonth(5)).toBe(true);
    expect(isComeCotasCalendarMonth(11)).toBe(true);
    expect(isComeCotasCalendarMonth(6)).toBe(false);
  });

  it("R$ 10.000 of gain at 15% is R$ 1.500", () => {
    expect(comeCotasLevyCents(1_000_000, 0.15)).toBe(150_000);
  });

  it("equity funds and (by default) closed/exclusive/offshore are out", () => {
    const p = DEFAULT_LEGAL_PREMISES;
    expect(comeCotasApplies("equity", p)).toBe(false);
    expect(comeCotasApplies("closed", p)).toBe(false);
    expect(comeCotasApplies("open_fixed_income", p)).toBe(true);
    expect(
      comeCotasApplies("closed", { ...p, comeCotasAppliesToClosedFunds: true })
    ).toBe(true);
  });
});

describe("Pensão por morte RGPS", () => {
  it("one dependent: 60% of R$ 5.000 = R$ 3.000", () => {
    const r = survivorPension({
      deceasedRetirementCents: 500_000,
      dependentCount: 1,
      deceasedContributionMonths: 120,
      marriageMonths: 60,
      survivorAgeAtDeath: 50,
    });
    expect(r.quota).toBeCloseTo(0.6, 10);
    expect(r.monthlyCents).toBe(300_000);
    expect(r.lifetime).toBe(true);
  });

  it("floors at the minimum wage", () => {
    const r = survivorPension({
      deceasedRetirementCents: 200_000,
      dependentCount: 1,
      deceasedContributionMonths: 120,
      marriageMonths: 60,
      survivorAgeAtDeath: 50,
    });
    expect(r.monthlyCents).toBe(MIN_WAGE);
    expect(r.floored).toBe(true);
  });

  it("Portaria ME 424/2020: 4 months if marriage < 2y; 3y if age 20; 20y at 44; lifetime from 45", () => {
    expect(
      survivorPension({
        deceasedRetirementCents: 500_000,
        dependentCount: 1,
        deceasedContributionMonths: 120,
        marriageMonths: 12,
        survivorAgeAtDeath: 50,
        year: 2026,
      }).durationMonths
    ).toBe(4);
    expect(
      survivorPension({
        deceasedRetirementCents: 500_000,
        dependentCount: 1,
        deceasedContributionMonths: 120,
        marriageMonths: 60,
        survivorAgeAtDeath: 20,
        year: 2026,
      }).durationMonths
    ).toBe(36);
    const at44 = survivorPension({
      deceasedRetirementCents: 500_000,
      dependentCount: 1,
      deceasedContributionMonths: 120,
      marriageMonths: 60,
      survivorAgeAtDeath: 44,
      year: 2026,
    });
    expect(at44.lifetime).toBe(false);
    expect(at44.durationMonths).toBe(20 * 12);
    const at45 = survivorPension({
      deceasedRetirementCents: 500_000,
      dependentCount: 1,
      deceasedContributionMonths: 120,
      marriageMonths: 60,
      survivorAgeAtDeath: 45,
      year: 2026,
    });
    expect(at45.lifetime).toBe(true);
    expect(at45.durationMonths).toBeNull();
    // First year of Portaria 424: death in 2021 at 44 is still 20 years.
    expect(
      survivorPension({
        deceasedRetirementCents: 500_000,
        dependentCount: 1,
        deceasedContributionMonths: 120,
        marriageMonths: 60,
        survivorAgeAtDeath: 44,
        year: 2021,
      }).durationMonths
    ).toBe(240);
    // Portaria 424 brackets: 21→3y, 22→6y, 42→20y (not lifetime).
    expect(
      survivorPension({
        deceasedRetirementCents: 500_000,
        dependentCount: 1,
        deceasedContributionMonths: 120,
        marriageMonths: 60,
        survivorAgeAtDeath: 21,
        year: 2026,
      }).durationMonths
    ).toBe(36);
    expect(
      survivorPension({
        deceasedRetirementCents: 500_000,
        dependentCount: 1,
        deceasedContributionMonths: 120,
        marriageMonths: 60,
        survivorAgeAtDeath: 22,
        year: 2026,
      }).durationMonths
    ).toBe(72);
    expect(
      survivorPension({
        deceasedRetirementCents: 500_000,
        dependentCount: 1,
        deceasedContributionMonths: 120,
        marriageMonths: 60,
        survivorAgeAtDeath: 42,
        year: 2026,
      }).durationMonths
    ).toBe(240);
  });

  it("Lei 13.135 original: deaths in 2020 are still lifetime from 44", () => {
    const at44 = survivorPension({
      deceasedRetirementCents: 500_000,
      dependentCount: 1,
      deceasedContributionMonths: 120,
      marriageMonths: 60,
      survivorAgeAtDeath: 44,
      year: 2020,
    });
    expect(at44.lifetime).toBe(true);
    expect(
      survivorPension({
        deceasedRetirementCents: 500_000,
        dependentCount: 1,
        deceasedContributionMonths: 120,
        marriageMonths: 60,
        survivorAgeAtDeath: 43,
        year: 2020,
      }).durationMonths
    ).toBe(240);
  });
});

describe("Household scope and last-survivor horizon", () => {
  it("both: holder 60→90 and spouse 55→90 is a 95 holder-age horizon", () => {
    const asOf = "2026-01-01";
    const h = defaultHousehold(asOf, "1966-01-01", "M");
    h.scope = "both";
    h.spouse = createPerson({
      role: "spouse",
      displayName: "Spouse",
      sex: "F",
      birthDate: "1971-01-01",
      asOf,
    });
    expect(lastSurvivorAgeInHolderYears(h, asOf)).toBe(95);
  });

  it("ownership filters: holder sees holder+joint, not spouse-only", () => {
    expect(ownershipInScope("holder", "holder")).toBe(true);
    expect(ownershipInScope("joint", "holder")).toBe(true);
    expect(ownershipInScope("spouse", "holder")).toBe(false);
    expect(ownershipInScope("spouse", "both")).toBe(true);
  });

  it("live adapter: holder scope drops spouse cash; both uses last-survivor LE and still taxes", () => {
    const asOf = "2026-01-01";
    const household = defaultHousehold(asOf, "1966-01-01", "M");
    household.holder.lifeExpectancy = 90;
    household.spouse = createPerson({
      role: "spouse",
      displayName: "Pat",
      sex: "F",
      birthDate: "1971-01-01",
      asOf,
      lifeExpectancy: 90,
    });
    const cash = (
      id: string,
      price: number,
      ownership: "holder" | "spouse"
    ) => ({
      id,
      ticker: id,
      name: id,
      assetClass: "cash" as const,
      quantity: 1,
      currentPrice: price,
      costBasis: price,
      currency: "BRL" as const,
      nativeCurrency: "BRL" as const,
      allocation: 50,
      ownership,
    });
    const portfolio = [cash("mine", 50_000, "holder"), cash("theirs", 100_000, "spouse")];
    const quote = {
      currency: "BRL" as const,
      rates: { USD: 1, BRL: 5.45, EUR: 0.92 },
    };
    const kpis = normalizeKpiValues({
      currentAge: 60,
      retirementAge: 65,
      lifeExpectancy: 90,
      currentNetWorth: 150_000,
      monthlyContribution: 0,
      monthlyExpenses: 0,
      desiredMonthlyIncome: 0,
      expectedCAGR: 0,
      annualInflation: 0,
    });
    household.scope = "holder";
    const holderPlan = buildEnginePlan({
      kpis,
      portfolio,
      includedAssetIds: ["mine", "theirs"],
      quote,
      household,
      asOf,
    });
    expect(holderPlan.liquidCents).toBe(5_000_000);
    expect(holderPlan.applyTaxes).toBe(true);
    expect(holderPlan.lifeExpectancy).toBe(90);

    household.scope = "both";
    const bothPlan = buildEnginePlan({
      kpis,
      portfolio,
      includedAssetIds: ["mine", "theirs"],
      quote,
      household,
      asOf,
    });
    expect(bothPlan.liquidCents).toBe(15_000_000);
    expect(bothPlan.lifeExpectancy).toBe(95);
    expect(bothPlan.applyTaxes).toBe(true);
  });

  it("funds-only live plan uses come-cotas 15% (IN RFB 1.585/2015)", () => {
    const plan = buildEnginePlan({
      kpis: normalizeKpiValues({ currentAge: 40 }),
      portfolio: [
        {
          id: "f",
          ticker: "FUND",
          name: "Open FI",
          assetClass: "funds",
          quantity: 1,
          currentPrice: 10_000,
          costBasis: 10_000,
          currency: "BRL",
          nativeCurrency: "BRL",
          allocation: 100,
        },
      ],
      includedAssetIds: ["f"],
      quote: {
        currency: "BRL",
        rates: { USD: 1, BRL: 5.45, EUR: 0.92 },
      },
      asOf: "2026-01-01",
    });
    expect(plan.taxRegime).toBe("come_cotas");
    expect(plan.comeCotasFraction).toBe(1);
    expect(plan.comeCotasRate).toBe(0.15);
  });

  it("PETR4 + fundo: come-cotas only on the fund holding (IN RFB 1.585/2015 art. 9 vs art. 16)", () => {
    const quote = {
      currency: "BRL" as const,
      rates: { USD: 1, BRL: 5.45, EUR: 0.92 },
    };
    const holding = (
      id: string,
      ticker: string,
      assetClass: "stocks" | "funds",
      price: number
    ) => ({
      id,
      ticker,
      name: ticker,
      assetClass,
      quantity: 1,
      currentPrice: price,
      costBasis: price,
      currency: "BRL" as const,
      nativeCurrency: "BRL" as const,
      allocation: 50,
    });
    const mixedPlan = buildEnginePlan({
      kpis: normalizeKpiValues({ currentAge: 40, expectedCAGR: 12, annualInflation: 0 }),
      portfolio: [
        holding("eq", "PETR4", "stocks", 10_000),
        holding("fi", "FUND", "funds", 10_000),
      ],
      includedAssetIds: ["eq", "fi"],
      quote,
      asOf: "2026-01-01",
    });
    expect(mixedPlan.comeCotasFraction).toBeCloseTo(0.5, 10);
    expect(mixedPlan.taxRegime).toBe("taxable");
    expect(mixedPlan.comeCotasRate).toBe(0.15);

    const stocksOnly = buildEnginePlan({
      kpis: normalizeKpiValues({ currentAge: 40 }),
      portfolio: [holding("eq", "PETR4", "stocks", 20_000)],
      includedAssetIds: ["eq"],
      quote,
      asOf: "2026-01-01",
    });
    expect(stocksOnly.comeCotasFraction).toBe(0);
    expect(stocksOnly.taxRegime).toBe("taxable");
  });
});

/**
 * IN RFB 1.585/2015 art. 9: 15% of the open-fund gain on month-end May and Nov.
 * Equity (art. 16) is not come-cota'd. Compound monthly with cent rounding —
 * the statute algorithm, not a snapshot of a previous engine output.
 */
function statuteComeCotasYear(input: {
  fundCents: number;
  otherCents: number;
  monthlyRate: number;
}): { liquidCents: number; taxCents: number } {
  let fund = input.fundCents;
  let other = input.otherCents;
  let basis = fund;
  let taxes = 0;
  for (let month = 1; month <= 12; month++) {
    fund = Math.max(0, fund + Math.round(fund * input.monthlyRate));
    other = Math.max(0, other + Math.round(other * input.monthlyRate));
    if (month === 5 || month === 11) {
      const levy = comeCotasLevyCents(fund - basis, 0.15);
      fund = Math.max(0, fund - levy);
      basis = fund;
      taxes += levy;
    }
  }
  return { liquidCents: fund + other, taxCents: taxes };
}

describe("Come-cotas per holding in the monthly loop", () => {
  it("mixed 50/50 fund+stock: 15% only on the fund gain in May and November", () => {
    const monthly = annualToMonthly(0.12);
    const fund0 = 1_000_000;
    const other0 = 1_000_000;
    const statuteMixed = statuteComeCotasYear({
      fundCents: fund0,
      otherCents: other0,
      monthlyRate: monthly,
    });
    const statuteFunds = statuteComeCotasYear({
      fundCents: fund0 + other0,
      otherCents: 0,
      monthlyRate: monthly,
    });
    const statuteStocks = statuteComeCotasYear({
      fundCents: 0,
      otherCents: fund0 + other0,
      monthlyRate: monthly,
    });

    const mixed = projectPlan(
      defaultPlan({
        currentAge: 40,
        retirementAge: 65,
        lifeExpectancy: 41,
        asOf: "2026-01-01",
        liquidCents: fund0 + other0,
        monthlyContributionCents: 0,
        monthlySpendingCents: 0,
        liquidRealReturn: 0.12,
        inflation: 0,
        applyTaxes: false,
        comeCotasFraction: 0.5,
        comeCotasRate: 0.15,
      })
    );
    const funds = projectPlan(
      defaultPlan({
        currentAge: 40,
        retirementAge: 65,
        lifeExpectancy: 41,
        asOf: "2026-01-01",
        liquidCents: fund0 + other0,
        monthlyContributionCents: 0,
        monthlySpendingCents: 0,
        liquidRealReturn: 0.12,
        inflation: 0,
        applyTaxes: false,
        comeCotasFraction: 1,
        comeCotasRate: 0.15,
        taxRegime: "come_cotas",
      })
    );
    const stocks = projectPlan(
      defaultPlan({
        currentAge: 40,
        retirementAge: 65,
        lifeExpectancy: 41,
        asOf: "2026-01-01",
        liquidCents: fund0 + other0,
        monthlyContributionCents: 0,
        monthlySpendingCents: 0,
        liquidRealReturn: 0.12,
        inflation: 0,
        applyTaxes: false,
        comeCotasFraction: 0,
        comeCotasRate: 0.15,
      })
    );

    const mixedYear = mixed.years.find((y) => y.age === 41)!;
    const fundsYear = funds.years.find((y) => y.age === 41)!;
    const stocksYear = stocks.years.find((y) => y.age === 41)!;

    expect(mixed.liquidEndCents).toBe(statuteMixed.liquidCents);
    expect(mixedYear.taxes).toBe(Math.round(statuteMixed.taxCents / 100));
    expect(funds.liquidEndCents).toBe(statuteFunds.liquidCents);
    expect(stocks.liquidEndCents).toBe(statuteStocks.liquidCents);
    expect(stocksYear.taxes).toBe(0);

    // Fund pays; stock does not. Plan-wide "all liquid is fund" would over-tax.
    expect(statuteMixed.taxCents).toBeGreaterThan(0);
    expect(statuteMixed.taxCents).toBeLessThan(statuteFunds.taxCents);
    expect(mixedYear.taxes).toBeLessThan(fundsYear.taxes);
    expect(mixed.liquidEndCents).toBeGreaterThan(funds.liquidEndCents);
  });
});

describe("FGTS and RendA+ hooks", () => {
  it("saque-aniversário is one bracket on the whole balance (R$ 1.500,01 → 30%+150)", () => {
    expect(fgtsBirthdayOneBracketCents(150_001)).toBe(Math.round(150_001 * 0.3 + 15_000));
  });

  it("default FGTS real return is 0%, withdrawals are IR-exempt", () => {
    const year = projectFgtsYear(
      {
        id: "fgts-1",
        balanceCents: 100_000,
        birthdayWithdrawal: false,
        asOf: "2026-01-01",
        source: "MANUAL",
      },
      { depositCents: 0 }
    );
    expect(year.endBalanceCents).toBe(100_000);
    expect(year.taxExempt).toBe(true);
  });

  it("RendA+ pays principal/240 and 0% custody up to 6 minimum wages", () => {
    expect(RENDA_MAIS_INSTALLMENTS).toBe(240);
    expect(rendaMaisMonthlyParcelCents(2_400_000)).toBe(10_000);
    const sixMin = 6 * MIN_WAGE;
    expect(rendaMaisCustodyRate(sixMin, 2026, true)).toBe(0);
    expect(rendaMaisCustodyRate(sixMin + 1, 2026, true)).toBe(0.001);
  });
});

describe("2026 parameter pack", () => {
  it("points and progressive ages follow EC 103 art. 15–16, including 2025", () => {
    expect(paramsForYear(DEFAULT_PARAMETER_SET, 2025).inssPointsWoman).toBe(92);
    expect(paramsForYear(DEFAULT_PARAMETER_SET, 2025).inssPointsMan).toBe(102);
    expect(paramsForYear(DEFAULT_PARAMETER_SET, 2026).inssPointsWoman).toBe(93);
    expect(paramsForYear(DEFAULT_PARAMETER_SET, 2026).inssPointsMan).toBe(103);
    expect(paramsForYear(DEFAULT_PARAMETER_SET, 2027).inssPointsWoman).toBe(94);
    expect(paramsForYear(DEFAULT_PARAMETER_SET, 2028).inssPointsMan).toBe(105);
    expect(paramsForYear(DEFAULT_PARAMETER_SET, 2026).inssProgressiveAgeWomanMonths).toBe(59 * 12 + 6);
    expect(paramsForYear(DEFAULT_PARAMETER_SET, 2031).inssProgressiveAgeWomanMonths).toBe(62 * 12);
  });

  it("teacher 2026: 88/98 points and 54y6m/59y6m (EC 103 art. 15 §3º / 16 §2º)", () => {
    const p = paramsForYear(DEFAULT_PARAMETER_SET, 2026);
    expect(p.inssTeacherPointsWoman).toBe(88);
    expect(p.inssTeacherPointsMan).toBe(98);
    expect(p.inssTeacherProgressiveAgeWomanMonths).toBe(54 * 12 + 6);
    expect(p.inssTeacherProgressiveAgeManMonths).toBe(59 * 12 + 6);
    expect(paramsForYear(DEFAULT_PARAMETER_SET, 2030).inssTeacherPointsWoman).toBe(92);
    expect(paramsForYear(DEFAULT_PARAMETER_SET, 2028).inssTeacherPointsMan).toBe(100);
  });

  it("historical teto and piso are not cloned from 2026", () => {
    expect(paramsForYear(DEFAULT_PARAMETER_SET, 1995).rgpsCeilingCents).toBe(58_286);
    expect(paramsForYear(DEFAULT_PARAMETER_SET, 2025).rgpsCeilingCents).toBe(815_741);
    expect(paramsForYear(DEFAULT_PARAMETER_SET, 2025).minimumWageCents).toBe(151_800);
    expect(minimumWageAt("2026-01").cents).toBe(162_100);
    expect(rgpsCeilingAt("2026-01").cents).toBe(847_555);
  });
});

describe("INSS — Tmin homem art. 18 / art. 26", () => {
  it("access is 15 years; coefficient Tmin is 20 (EC 103 art. 26 §2 I; IN 128 art. 233 III b)", () => {
    // 19 complete years, age 65, filiated before the reform.
    const history = frozenRange("2007-01", "2025-12", 50_000);
    const base = person({
      sex: "M",
      birthDate: "1961-01-01",
      filiationDate: "1990-01-01",
      asOf: "2026-01-01",
      history,
    });
    const def = evaluateInss(base, { discountReal: 0 });
    const byAge = def.ranked.find((r) => r.ruleId === "by_age");
    expect(byAge?.eligible).toBe(true);
    expect(byAge?.contributionYears).toBe(19);
    // 60% + 2% × max(0, 19−20) = 60%
    expect(byAge?.coefficient).toBeCloseTo(0.6, 10);
    expect(byAge?.uncertain).toBeFalsy();

    const alt = evaluateInss(base, {
      discountReal: 0,
      premises: { maleByAgeTminYears: 15 },
    });
    // Alternate premise 15: 60% + 2% × 4 = 68%
    expect(alt.ranked.find((r) => r.ruleId === "by_age")?.coefficient).toBeCloseTo(0.68, 10);
  });
});

describe("INSS — professor 2026 (EC 103 art. 15 §3º / 16 §2º)", () => {
  it("teacher points 2026: woman 50 + 38y magistério = 88, not the general 93", () => {
    const history = frozenRange("1988-01", "2025-12", 50_000, "clt", { teacher: true });
    const ev = evaluateInss(
      person({
        sex: "F",
        birthDate: "1976-01-01",
        filiationDate: "1988-01-01",
        asOf: "2026-01-01",
        teacher: true,
        history,
      }),
      { discountReal: 0 }
    );
    const teacherPts = ev.ranked.find((r) => r.ruleId === "teacher_points");
    expect(teacherPts?.eligible).toBe(true);
    expect(teacherPts?.uncertain).toBeFalsy();
    expect(teacherPts!.eligibilityDate.startsWith("2026-01")).toBe(true);
    const general = ev.ranked.find((r) => r.ruleId === "points");
    expect(general?.eligible).toBe(true);
    expect(general!.eligibilityDate > teacherPts!.eligibilityDate).toBe(true);
  });

  it("teacher progressive age 2026 is 54y6m for women", () => {
    const history = frozenRange("2001-01", "2025-12", 50_000, "clt", { teacher: true });
    const tooYoung = evaluateInss(
      person({
        sex: "F",
        birthDate: "1972-01-01",
        filiationDate: "2001-01-01",
        asOf: "2026-01-01",
        teacher: true,
        history,
      })
    );
    const progressive = tooYoung.ranked.find((r) => r.ruleId === "teacher_progressive_age");
    expect(progressive?.eligible).toBe(true);
    expect(progressive!.eligibilityDate > "2026-01-01").toBe(true);

    const oldEnough = evaluateInss(
      person({
        sex: "F",
        birthDate: "1971-07-01",
        filiationDate: "2001-01-01",
        asOf: "2026-01-01",
        teacher: true,
        history,
      })
    );
    expect(
      oldEnough.ranked.find((r) => r.ruleId === "teacher_progressive_age")?.eligible
    ).toBe(true);
    expect(
      oldEnough.ranked.find((r) => r.ruleId === "teacher_progressive_age")?.uncertain
    ).toBeFalsy();
  });
});
