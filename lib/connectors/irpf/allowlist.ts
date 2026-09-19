import {
  DIRPF_DISCARDED_RECORDS,
  parseAlnum,
  parseMoneyCents,
  recordType,
} from "@/lib/connectors/irpf/layout";

export interface IrpfIncome {
  kind: "pj" | "pf" | "exempt" | "exclusive";
  payerName?: string;
  amountCents: number;
  officialPensionCents?: number;
}

export interface IrpfAsset {
  code: string;
  description: string;
  previousCents: number;
  currentCents: number;
}

export interface IrpfAllowlisted {
  exercicio: string | null;
  anoBase: string | null;
  nit: string | null;
  birthDate: string | null;
  displayName: string | null;
  incomes: IrpfIncome[];
  assets: IrpfAsset[];
  debts: Array<{ code: string; description: string; currentCents: number }>;
  privatePensionContributionCents: number;
  discardedRecord26: number;
  discardedOther: string[];
}

const BEM_ADDRESS_FIELDS = [
  "NM_LOGRA",
  "NR_NUMERO",
  "NM_COMPLEM",
  "NM_BAIRRO",
  "NR_CEP",
  "NM_MUNICIP",
];

function isoFromDdmmyyyy(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 8) return null;
  return `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
}

function parseHeader(line: string, out: IrpfAllowlisted): void {
  out.exercicio = parseAlnum(line, 9, 12) || null;
  out.anoBase = parseAlnum(line, 13, 16) || null;
  const name = parseAlnum(line, 40, 99);
  if (name) out.displayName = name;
  const birth = isoFromDdmmyyyy(parseAlnum(line, 113, 120));
  if (birth) out.birthDate = birth;
}

function parse16(line: string, out: IrpfAllowlisted): void {
  const name = parseAlnum(line, 14, 73);
  if (name) out.displayName = name;
  const nit = parseAlnum(line, 326, 336).replace(/\D/g, "");
  if (nit) out.nit = nit;
  const birth = isoFromDdmmyyyy(parseAlnum(line, 361, 368));
  if (birth) out.birthDate = birth;
}

function parse21(line: string, out: IrpfAllowlisted): void {
  out.incomes.push({
    kind: "pj",
    payerName: parseAlnum(line, 28, 87) || undefined,
    amountCents: parseMoneyCents(line, 88, 100),
    officialPensionCents: parseMoneyCents(line, 101, 113),
  });
}

function parse22(line: string, out: IrpfAllowlisted): void {
  out.incomes.push({
    kind: "pf",
    amountCents: parseMoneyCents(line, 28, 40),
  });
}

function parse23(line: string, out: IrpfAllowlisted): void {
  const fgts = parseMoneyCents(line, 40, 52);
  const lucros = parseMoneyCents(line, 66, 78);
  const rural = parseMoneyCents(line, 79, 91);
  const age65 = parseMoneyCents(line, 92, 104);
  const poupanca = parseMoneyCents(line, 118, 130);
  // VR_INVALIDEZ 105–117 is health-inferring — dropped.
  if (fgts) out.incomes.push({ kind: "exempt", payerName: "FGTS", amountCents: fgts });
  if (lucros) out.incomes.push({ kind: "exempt", payerName: "LUCROS", amountCents: lucros });
  if (rural) out.incomes.push({ kind: "exempt", payerName: "RURAL", amountCents: rural });
  if (age65) out.incomes.push({ kind: "exempt", payerName: "65ANOS", amountCents: age65 });
  if (poupanca) out.incomes.push({ kind: "exempt", payerName: "POUPANCA", amountCents: poupanca });
}

function parse24(line: string, out: IrpfAllowlisted): void {
  const thirteenth = parseMoneyCents(line, 14, 26);
  const finance = parseMoneyCents(line, 53, 65);
  if (thirteenth) {
    out.incomes.push({ kind: "exclusive", payerName: "13SAL", amountCents: thirteenth });
  }
  if (finance) {
    out.incomes.push({ kind: "exclusive", payerName: "APLICACOES", amountCents: finance });
  }
}

function parse19(line: string, out: IrpfAllowlisted): void {
  out.privatePensionContributionCents = parseMoneyCents(line, 145, 157);
}

function parse27(line: string, out: IrpfAllowlisted): void {
  out.assets.push({
    code: parseAlnum(line, 14, 15).padStart(2, "0"),
    description: parseAlnum(line, 20, 531),
    previousCents: parseMoneyCents(line, 532, 544),
    currentCents: parseMoneyCents(line, 545, 557),
  });
}

function parse28(line: string, out: IrpfAllowlisted): void {
  out.debts.push({
    code: parseAlnum(line, 14, 15).padStart(2, "0"),
    description: parseAlnum(line, 16, 527),
    currentCents: parseMoneyCents(line, 541, 553),
  });
}

export function allowlistDirpfLines(lines: string[]): IrpfAllowlisted {
  const out: IrpfAllowlisted = {
    exercicio: null,
    anoBase: null,
    nit: null,
    birthDate: null,
    displayName: null,
    incomes: [],
    assets: [],
    debts: [],
    privatePensionContributionCents: 0,
    discardedRecord26: 0,
    discardedOther: [],
  };
  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (!line.trim()) continue;
    const type = recordType(line);
    if (type === "26" || DIRPF_DISCARDED_RECORDS.has(type)) {
      if (type === "26") out.discardedRecord26 += 1;
      else out.discardedOther.push(type);
      continue;
    }
    if (type === "IR") parseHeader(line, out);
    else if (type === "16") parse16(line, out);
    else if (type === "19") parse19(line, out);
    else if (type === "21") parse21(line, out);
    else if (type === "22") parse22(line, out);
    else if (type === "23") parse23(line, out);
    else if (type === "24") parse24(line, out);
    else if (type === "27") parse27(line, out);
    else if (type === "28") parse28(line, out);
  }
  void BEM_ADDRESS_FIELDS;
  return out;
}

export function persistIrpf(allowlisted: IrpfAllowlisted): Record<string, unknown> {
  return {
    exercicio: allowlisted.exercicio,
    anoBase: allowlisted.anoBase,
    nit: allowlisted.nit,
    birthDate: allowlisted.birthDate,
    displayName: allowlisted.displayName,
    incomes: allowlisted.incomes,
    assets: allowlisted.assets.map((a) => ({
      code: a.code,
      description: a.description,
      previousCents: a.previousCents,
      currentCents: a.currentCents,
    })),
    debts: allowlisted.debts,
    privatePensionContributionCents: allowlisted.privatePensionContributionCents,
    droppedMedicalPaymentRows: allowlisted.discardedRecord26,
    source: "FILE_IRPF",
  };
}
