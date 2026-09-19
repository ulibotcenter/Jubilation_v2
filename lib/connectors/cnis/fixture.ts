import { yearMonthIso, monthsInclusive, parseYearMonth } from "@/lib/engine/dates";
import { buildUncompressedPdf } from "@/lib/connectors/files/bytes";

/** Hand-calculated reference for the synthetic extract (cents / months). */
export const CNIS_FIXTURE_AS_OF = "2026-09-19";
export const CNIS_FIXTURE_BIRTH = "1974-03-01";
export const CNIS_FIXTURE_FILIATION = "1994-02-01";
export const CNIS_FIXTURE_NAME = "MARIA SILVA";
export const CNIS_FIXTURE_NIT = "12345678901";

/**
 * Unique wage months since 07/1994 after collapsing concomitância.
 */
export const CNIS_FIXTURE_SB_MONTHS = 378;
/**
 * Independent of the engine: cap each competence at the official teto then
 * apply INPC (BCB SGS 188) to the month before DIB 2026-09
 * (Lei 8.213 art. 29-B). 132×R$1.500 + 6×R$3.500 + 156×R$2.000 + 84×R$4.000
 * → 101 months above the teto of the competence; corrected average
 * R$ 4.968,62.
 */
export const CNIS_FIXTURE_SB_CENTS = 496_862;
/** CLT months as common TC. Special months before 2019-11 still convert (EC 103). 294 + 10 (2019-01..2019-10) = 304. */
export const CNIS_FIXTURE_TC_MONTHS = 304;
export const CNIS_FIXTURE_ESPECIAL_MONTHS = 84;
export const CNIS_FIXTURE_RURAL_MONTHS = 49;
export const CNIS_FIXTURE_CONCURRENT_MONTHS = 6;

function rangeLines(
  fromYm: string,
  toYm: string,
  wage: string,
  extras: Record<string, string> = {}
): string {
  const n = monthsInclusive(fromYm, toYm);
  const lines: string[] = [];
  const { y, m } = parseYearMonth(fromYm);
  for (let i = 0; i < n; i++) {
    const idx = y * 12 + (m - 1) + i;
    const ym = yearMonthIso(Math.floor(idx / 12), (idx % 12) + 1);
    const [yy, mm] = ym.split("-");
    const marker = extras[ym] ? `          ${extras[ym]}` : "";
    lines.push(`      ${mm}/${yy}        ${wage}${marker}`);
  }
  return lines.join("\n");
}

export const CNIS_FIXTURE_TEXT = `Extrato de Relações Previdenciárias e Remunerações - CNIS
Data de emissão: 19/09/2026
Nome: ${CNIS_FIXTURE_NAME}
NIT: 123.45678.90-1
CPF: ***.***.***-**
Data de nascimento: 01/03/1974
Data de filiação: 01/02/1994

1. Vínculo
Tipo: EMPREGADO
Empregador: ACME INDUSTRIA LTDA
Início: 01/02/1994
Fim: 31/12/2005
Indicadores: PEXT
Competência    Remuneração     Indicadores
${rangeLines("1994-07", "2005-12", "1.500,00", { "2001-06": "PREC-MENOR" })}

2. Vínculo
Tipo: EMPREGADO
Empregador: BETA SERVICOS SA
Início: 01/07/2005
Fim: 31/12/2018
Indicadores: PVINC
Concomitante: sim
Competência    Remuneração
${rangeLines("2005-07", "2018-12", "2.000,00")}

3. Vínculo
Tipo: SEGURADO ESPECIAL
Categoria: RURAL
Empregador: SITIO SANTA LUZ
Início: 01/01/1990
Fim: 31/01/1994
Tempo rural: 4 anos 1 mês
Indicadores: RURAL

4. Vínculo
Tipo: EMPREGADO
Atividade: ESPECIAL
Exposição: 25
Empregador: GAMA QUIMICA LTDA
Início: 01/01/2019
Fim: 31/12/2025
Competência    Remuneração
${rangeLines("2019-01", "2025-12", "4.000,00")}

5. Vínculo
Tipo: BENEFICIO
Espécie: B31 AUXILIO-DOENCA
Empregador: INSS
Início: 01/03/2016
Fim: 30/06/2016
Médico perito: DR. NAO PERSISTIR
`;

export const CNIS_FIXTURE_CSV = `seq,tipo,empregador,inicio,fim,competencia,remuneracao,indicadores,rural,especial_anos,concomitante
1,EMPREGADO,ACME INDUSTRIA LTDA,01/02/1994,31/12/2005,1994-07,1500.00,PEXT,false,,false
1,EMPREGADO,ACME INDUSTRIA LTDA,01/02/1994,31/12/2005,2001-06,400.00,PREC-MENOR,false,,false
2,EMPREGADO,BETA SERVICOS SA,01/07/2005,31/12/2018,2005-07,2000.00,PVINC,false,,true
3,SEGURADO ESPECIAL,SITIO SANTA LUZ,01/01/1990,31/01/1994,1990-01,0,RURAL,true,,false
4,EMPREGADO,GAMA QUIMICA LTDA,01/01/2019,31/12/2025,2019-01,4000.00,ESPECIAL,false,25,false
5,BENEFICIO,INSS,01/03/2016,30/06/2016,2016-03,0,B31 AUXILIO-DOENCA,false,,false
`;

export function cnisFixturePdf(): Uint8Array {
  return buildUncompressedPdf(CNIS_FIXTURE_TEXT.split("\n"));
}
