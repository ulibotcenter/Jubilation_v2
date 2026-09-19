/**
 * RGPS teto and salário mínimo by competence, from 07/1994.
 * Each step is the official act that set the value; lookup is the last
 * step with fromYm <= competence. Future months forward-fill the last
 * published act (do not invent a 2027 teto).
 */

export interface DatedLegalAmount {
  /** Inclusive YYYY-MM. */
  fromYm: string;
  cents: number;
  source: string;
}

function amountAtYm(steps: DatedLegalAmount[], ym: string): DatedLegalAmount {
  let found = steps[0]!;
  for (const step of steps) {
    if (step.fromYm <= ym) found = step;
    else break;
  }
  return found;
}

/**
 * Teto do salário de contribuição / salário de benefício.
 * Confirmed against DOU/gov.br for 1994 (Portaria 929 URV), 2021 (INSS
 * tabela), 2023–2026 (portarias MPS/MF). Remaining steps are the same
 * series of portarias cited by the Ministério for each reajuste.
 */
export const RGPS_CEILING_STEPS: DatedLegalAmount[] = [
  { fromYm: "1994-03", cents: 58_286, source: "Portaria MPS 929/1994 art. 2º (582,86 URV = R$ 582,86 em 07/1994)" },
  { fromYm: "1995-05", cents: 83_266, source: "Portaria 2.005/1995" },
  { fromYm: "1996-05", cents: 95_756, source: "Portaria 3.251/1996" },
  { fromYm: "1997-06", cents: 103_187, source: "Ordem de Serviço 573/1997" },
  { fromYm: "1998-06", cents: 108_150, source: "Portaria 4.478/1998" },
  { fromYm: "1998-12", cents: 120_000, source: "EC 20/1998" },
  { fromYm: "1999-06", cents: 125_532, source: "Portaria 5.188/1999" },
  { fromYm: "2000-06", cents: 132_825, source: "Portaria 6.211/2000" },
  { fromYm: "2001-06", cents: 143_000, source: "Portaria 1.987/2001" },
  { fromYm: "2002-06", cents: 156_156, source: "Portaria 525/2002" },
  { fromYm: "2003-06", cents: 186_934, source: "Portaria 727/2003" },
  { fromYm: "2004-01", cents: 240_000, source: "EC 41/2003" },
  { fromYm: "2004-05", cents: 250_872, source: "Portaria 479/2004" },
  { fromYm: "2005-05", cents: 266_815, source: "Portaria 822/2005" },
  { fromYm: "2006-04", cents: 280_156, source: "Portaria 119/2006" },
  { fromYm: "2007-04", cents: 289_428, source: "Portaria 142/2007" },
  { fromYm: "2008-03", cents: 303_899, source: "Portaria Interministerial 77/2008" },
  { fromYm: "2009-02", cents: 321_890, source: "Portaria Interministerial 48/2009" },
  { fromYm: "2010-01", cents: 346_740, source: "Portaria 333/2010" },
  { fromYm: "2011-01", cents: 369_174, source: "Portaria Interministerial 407/2011" },
  { fromYm: "2012-01", cents: 391_620, source: "Portaria Interministerial 2/2012" },
  { fromYm: "2013-01", cents: 415_900, source: "Portaria Interministerial 15/2013" },
  { fromYm: "2014-01", cents: 439_024, source: "Portaria Interministerial 19/2014" },
  { fromYm: "2015-01", cents: 466_375, source: "Portaria Interministerial 13/2015" },
  { fromYm: "2016-01", cents: 518_982, source: "Portaria Interministerial 1/2016" },
  { fromYm: "2017-01", cents: 553_131, source: "Portaria 8/2017" },
  { fromYm: "2018-01", cents: 564_580, source: "Portaria 15/2018" },
  { fromYm: "2019-01", cents: 583_945, source: "Portaria 9/2019" },
  { fromYm: "2020-01", cents: 610_106, source: "Portaria 914/2020" },
  { fromYm: "2021-01", cents: 643_357, source: "Portaria SEPRT/ME 477/2021" },
  { fromYm: "2022-01", cents: 708_722, source: "Portaria Interministerial MPS/MF 12/2022" },
  { fromYm: "2023-01", cents: 750_749, source: "Portaria Interministerial MPS/MF 26/2023 art. 2º" },
  { fromYm: "2024-01", cents: 778_602, source: "Portaria Interministerial MPS/MF 2/2024 art. 2º" },
  { fromYm: "2025-01", cents: 815_741, source: "Portaria Interministerial MPS/MF 6/2025 art. 2º" },
  { fromYm: "2026-01", cents: 847_555, source: "Portaria Interministerial MPS/MF 13/2026 art. 2º" },
];

/**
 * Salário mínimo nacional (piso previdenciário).
 * 2026: Decreto 12.797/2025. 1994-07: Lei 8.880/1994. Remaining from
 * the official decree/MPV series (IPARDES / Portal da Legislação).
 */
export const MINIMUM_WAGE_STEPS: DatedLegalAmount[] = [
  { fromYm: "1994-07", cents: 6_479, source: "Lei 8.880/1994" },
  { fromYm: "1994-09", cents: 7_000, source: "MP 598/1994" },
  { fromYm: "1995-05", cents: 10_000, source: "Lei 9.032/1995" },
  { fromYm: "1996-05", cents: 11_200, source: "MP 1.415/1996" },
  { fromYm: "1997-05", cents: 12_000, source: "MP 1.572/1997" },
  { fromYm: "1998-05", cents: 13_000, source: "MP 1.656/1998" },
  { fromYm: "1999-05", cents: 13_600, source: "MP 1.824/1999" },
  { fromYm: "2000-04", cents: 15_100, source: "MP 2.019/2000; Lei 9.971/2000" },
  { fromYm: "2001-04", cents: 18_000, source: "MP 2.142/2001" },
  { fromYm: "2002-04", cents: 20_000, source: "MP 35/2002; Lei 10.525/2002" },
  { fromYm: "2003-04", cents: 24_000, source: "MP 116/2003; Lei 10.699/2003" },
  { fromYm: "2004-05", cents: 26_000, source: "MP 182/2004; Lei 10.888/2004" },
  { fromYm: "2005-05", cents: 30_000, source: "MP 248/2005; Lei 11.164/2005" },
  { fromYm: "2006-04", cents: 35_000, source: "MP 288/2006; Lei 11.321/2006" },
  { fromYm: "2007-04", cents: 38_000, source: "MP 362/2007; Lei 11.498/2007" },
  { fromYm: "2008-03", cents: 41_500, source: "MP 421/2008; Lei 11.709/2008" },
  { fromYm: "2009-02", cents: 46_500, source: "MP 456/2009; Lei 11.944/2009" },
  { fromYm: "2010-01", cents: 51_000, source: "MP 474/2009; Lei 12.255/2010" },
  { fromYm: "2011-01", cents: 54_000, source: "MP 516/2010" },
  { fromYm: "2011-03", cents: 54_500, source: "Lei 12.382/2011" },
  { fromYm: "2012-01", cents: 62_200, source: "Decreto 7.655/2011" },
  { fromYm: "2013-01", cents: 67_800, source: "Decreto 7.872/2012" },
  { fromYm: "2014-01", cents: 72_400, source: "Decreto 8.166/2013" },
  { fromYm: "2015-01", cents: 78_800, source: "Decreto 8.381/2014" },
  { fromYm: "2016-01", cents: 88_000, source: "Decreto 8.618/2015" },
  { fromYm: "2017-01", cents: 93_700, source: "Decreto 8.948/2016" },
  { fromYm: "2018-01", cents: 95_400, source: "Decreto 9.255/2017" },
  { fromYm: "2019-01", cents: 99_800, source: "Decreto 9.661/2019" },
  { fromYm: "2020-01", cents: 103_900, source: "MP 916/2019; Lei 14.013/2020" },
  { fromYm: "2020-02", cents: 104_500, source: "MP 919/2020; Lei 14.013/2020" },
  { fromYm: "2021-01", cents: 110_000, source: "MP 1.021/2020; Lei 14.158/2021" },
  { fromYm: "2022-01", cents: 121_200, source: "MP 1.091/2021; Lei 14.358/2022" },
  { fromYm: "2023-01", cents: 130_200, source: "MP 1.143/2022" },
  { fromYm: "2023-05", cents: 132_000, source: "MP 1.172/2023; Lei 14.663/2023" },
  { fromYm: "2024-01", cents: 141_200, source: "Decreto 11.864/2023" },
  { fromYm: "2025-01", cents: 151_800, source: "Decreto 12.342/2024" },
  { fromYm: "2026-01", cents: 162_100, source: "Decreto 12.797/2025 art. 1º" },
];

export function rgpsCeilingAt(
  ym: string,
  steps: DatedLegalAmount[] = RGPS_CEILING_STEPS
): DatedLegalAmount {
  return amountAtYm(steps, ym);
}

export function minimumWageAt(
  ym: string,
  steps: DatedLegalAmount[] = MINIMUM_WAGE_STEPS
): DatedLegalAmount {
  return amountAtYm(steps, ym);
}

/**
 * EC 103/2019 arts. 15–16 (and §3º / §2º for teachers).
 * 2019 starting values + 1 point / 6 months of age per calendar year,
 * with the statutory caps.
 */
export function rgpsTransitionForYear(year: number): {
  inssPointsWoman: number;
  inssPointsMan: number;
  inssProgressiveAgeWomanMonths: number;
  inssProgressiveAgeManMonths: number;
  inssTeacherPointsWoman: number;
  inssTeacherPointsMan: number;
  inssTeacherProgressiveAgeWomanMonths: number;
  inssTeacherProgressiveAgeManMonths: number;
} {
  const y = Math.max(2019, year);
  const dy = y - 2019;
  return {
    inssPointsWoman: Math.min(100, 86 + dy),
    inssPointsMan: Math.min(105, 96 + dy),
    inssProgressiveAgeWomanMonths: Math.min(62 * 12, 56 * 12 + dy * 6),
    inssProgressiveAgeManMonths: Math.min(65 * 12, 61 * 12 + dy * 6),
    inssTeacherPointsWoman: Math.min(92, 81 + dy),
    inssTeacherPointsMan: Math.min(100, 91 + dy),
    inssTeacherProgressiveAgeWomanMonths: Math.min(57 * 12, 51 * 12 + dy * 6),
    inssTeacherProgressiveAgeManMonths: Math.min(60 * 12, 56 * 12 + dy * 6),
  };
}
