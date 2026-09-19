import { padNum, padText } from "@/lib/connectors/irpf/layout";

export const IRPF_FIXTURE_EXERCICIO = "2025";
export const IRPF_FIXTURE_ANO_BASE = "2024";
export const IRPF_FIXTURE_CPF = "39053344705";
export const IRPF_FIXTURE_NIT = "12345678901";
export const IRPF_FIXTURE_NAME = "MARIA SILVA";
export const IRPF_FIXTURE_CLINIC = "CLINICA VIDA PLENA LTDA";
export const IRPF_FIXTURE_DOCTOR = "DR JOAO DA SAUDE";
/** R$ 120.000,00 salary from PJ */
export const IRPF_FIXTURE_PJ_CENTS = 12_000_000;
/** Official INSS withheld R$ 8.475,55 */
export const IRPF_FIXTURE_INSS_CENTS = 847_555;
/** Home R$ 450.000,00 */
export const IRPF_FIXTURE_HOME_CENTS = 45_000_000;
/** Vehicle R$ 35.000,00 */
export const IRPF_FIXTURE_VEHICLE_CENTS = 3_500_000;
/** PGBL balance R$ 80.000,00 */
export const IRPF_FIXTURE_PGBL_CENTS = 8_000_000;
/** Annual PGBL contribution R$ 12.000,00 */
export const IRPF_FIXTURE_PREVPRIV_CENTS = 1_200_000;
/** PETR4 lot in bens (must NOT overwrite B3) */
export const IRPF_FIXTURE_PETR_CENTS = 7_624_00;

function irHeader(): string {
  return (
    padText("IRPF", 8) +
    IRPF_FIXTURE_EXERCICIO +
    IRPF_FIXTURE_ANO_BASE +
    "2700" +
    "0" +
    IRPF_FIXTURE_CPF +
    padText("", 3) +
    "1" +
    "100" +
    padText(IRPF_FIXTURE_NAME, 60) +
    "SP" +
    padNum(0, 10) +
    "1" +
    "01031974" +
    "S"
  );
}

function rec16(): string {
  return (
    "16" +
    IRPF_FIXTURE_CPF +
    padText(IRPF_FIXTURE_NAME, 60) +
    padText("RUA", 15) +
    padText("NAO PERSISTIR ENDERECO", 40) +
    padText("100", 6) +
    padText("AP 1", 21) +
    padText("CENTRO", 19) +
    padText("01310100", 9) +
    padNum(3550308, 4) +
    padText("SAO PAULO", 40) +
    "SP" +
    padText("", 3) +
    padText("105", 3) +
    padText("strip-me@example.com", 90) +
    padText(IRPF_FIXTURE_NIT, 11) +
    padText("11144477735", 11) +
    padText("11", 4) +
    padText("999990000", 9) +
    "01031974"
  );
}

function rec19(): string {
  return (
    "19" +
    IRPF_FIXTURE_CPF +
    padText("02332886000104", 14) +
    padNum(0, 13) +
    padNum(0, 13) +
    padNum(0, 13) +
    padNum(0, 13) +
    padNum(0, 13) +
    padNum(0, 13) +
    padNum(0, 13) +
    padNum(0, 13) +
    padNum(0, 13) +
    padNum(IRPF_FIXTURE_PREVPRIV_CENTS, 13)
  );
}

function rec21(): string {
  return (
    "21" +
    IRPF_FIXTURE_CPF +
    padText("12345678000190", 14) +
    padText("ACME INDUSTRIA LTDA", 60) +
    padNum(IRPF_FIXTURE_PJ_CENTS, 13) +
    padNum(IRPF_FIXTURE_INSS_CENTS, 13) +
    padNum(1_000_000, 13) +
    padNum(2_000_000, 13)
  );
}

function rec23(): string {
  return (
    "23" +
    IRPF_FIXTURE_CPF +
    padNum(0, 13) +
    padNum(0, 13) +
    padNum(450_000, 13) +
    padNum(0, 13) +
    padNum(0, 13) +
    padNum(0, 13) +
    padNum(0, 13) +
    padNum(80_000, 13) +
    padNum(0, 13)
  );
}

function rec26(): string {
  return (
    "26" +
    IRPF_FIXTURE_CPF +
    "10" +
    padNum(0, 5) +
    padText("11222333000181", 14) +
    padText(IRPF_FIXTURE_DOCTOR, 60) +
    padText("", 11) +
    padNum(350_000, 13) +
    padNum(0, 13) +
    padNum(0, 13) +
    "2" +
    "T" +
    padNum(1, 10) +
    padText(IRPF_FIXTURE_CLINIC, 20)
  );
}

function rec27(code: string, desc: string, current: number, previous = current): string {
  return (
    "27" +
    IRPF_FIXTURE_CPF +
    code +
    "0" +
    "105" +
    padText(desc, 512) +
    padNum(previous, 13) +
    padNum(current, 13)
  );
}

export const IRPF_FIXTURE_DBK = [
  irHeader(),
  rec16(),
  rec19(),
  rec21(),
  rec23(),
  rec26(),
  rec27("12", "CASA RESIDENCIAL RUA NAO USAR 10", IRPF_FIXTURE_HOME_CENTS),
  rec27("21", "VEICULO FIAT ARGO 2020", IRPF_FIXTURE_VEHICLE_CENTS),
  rec27("72", "PGBL ITAU PREVIDENCIA", IRPF_FIXTURE_PGBL_CENTS),
  rec27("31", "ACOES PETR4 QUANTIDADE 200", IRPF_FIXTURE_PETR_CENTS),
  rec27("41", "POUPANCA BANCO EXEMPLO", 2_500_000),
  "T9" + padNum(12, 10),
].join("\r\n");
