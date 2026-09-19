import type { ContributorKind, SpecialExposure } from "@/lib/engine/inssTypes";
import type {
  CnisNamedIndicator,
  CnisExtract,
  CnisParseResult,
  CnisVinculo,
} from "@/lib/connectors/cnis/types";
import { isHealthIndicator, isHealthVinculoType, normalizeIndicatorToken } from "@/lib/connectors/cnis/health";
import { decodeTextFile, isPdfBytes, looksEncryptedOrBinary } from "@/lib/connectors/files/bytes";

const NAMED: Record<string, CnisNamedIndicator> = {
  "PREC-MENOR": "PREC-MENOR",
  PRECMENOR: "PREC-MENOR",
  PEXT: "PEXT",
  PVINC: "PVINC",
};

const DATE_RE = /(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/;
const YM_BR = /(\d{2})\/(\d{4})/;
const YM_ISO = /(\d{4})-(\d{2})/;

function toIsoDate(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(DATE_RE);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return null;
}

function toYearMonth(raw: string): string | null {
  const iso = raw.match(YM_ISO);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const br = raw.match(YM_BR);
  if (br) return `${br[2]}-${br[1]}`;
  return null;
}

function parseBrlToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed.replace(/,/g, "");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function parseIndicators(raw: string | undefined): {
  named: CnisNamedIndicator[];
  health: string[];
  rural: boolean;
  especialYears: SpecialExposure | null;
} {
  const named: CnisNamedIndicator[] = [];
  const health: string[] = [];
  let rural = false;
  let especialYears: SpecialExposure | null = null;
  if (!raw) return { named, health, rural, especialYears };
  const tokens = raw.split(/[;,|/]/).flatMap((part) => part.trim().split(/\s+/));
  for (const token of tokens) {
    if (!token) continue;
    const norm = normalizeIndicatorToken(token);
    if (isHealthIndicator(token) || isHealthIndicator(norm)) {
      health.push(token);
      continue;
    }
    if (norm === "RURAL" || norm === "SEGURADO-ESPECIAL" || norm === "SEG-ESPECIAL") {
      rural = true;
      continue;
    }
    if (norm === "ESPECIAL" || norm === "ATE-ESPECIAL" || norm.startsWith("ESPECIAL-")) {
      especialYears = especialYears ?? 25;
      continue;
    }
    const years = Number(norm.replace(/[^\d]/g, ""));
    if ((norm.includes("ESPECIAL") || token.toUpperCase().includes("EXPOS")) && (years === 15 || years === 20 || years === 25)) {
      especialYears = years;
      continue;
    }
    const mapped = NAMED[norm] ?? NAMED[token.toUpperCase()];
    if (mapped && !named.includes(mapped)) named.push(mapped);
  }
  return { named, health, rural, especialYears };
}

function kindFromType(type: string, rural: boolean): ContributorKind {
  const t = normalizeIndicatorToken(type);
  if (t.includes("MEI")) return "mei_5";
  if (t.includes("FACULTAT")) return "facultative_5";
  if (t.includes("INDIVIDUAL") || t.includes("AUTONOM") || t.includes("CONTRIBUINTE-INDIVIDUAL")) {
    return "normal_20";
  }
  if (rural || t.includes("RURAL") || t.includes("SEGURADO-ESPECIAL")) return "clt";
  return "clt";
}

function headerField(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[:\\-]?\\s*(.+)`, "i");
    const m = text.match(re);
    if (m) return m[1].split(/\n/)[0]?.trim() ?? null;
  }
  return null;
}

function parseCsv(text: string, asOf: string): CnisExtract {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0]?.split(",").map((h) => h.trim().toLowerCase()) ?? [];
  const idx = (name: string) => header.indexOf(name);
  const vinculos = new Map<number, CnisVinculo>();
  let discardedHealthCount = 0;

  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((c) => c.trim());
    const seq = Number(cols[idx("seq")] ?? cols[idx("vinculo")] ?? 1) || 1;
    const type = cols[idx("tipo")] ?? "EMPREGADO";
    if (isHealthVinculoType(type)) {
      discardedHealthCount += 1;
      continue;
    }
    const flags = parseIndicators(cols[idx("indicadores")]);
    discardedHealthCount += flags.health.length;
    const rural =
      flags.rural ||
      cols[idx("rural")]?.toLowerCase() === "true" ||
      cols[idx("rural")] === "1";
    const especialFromCol = Number(cols[idx("especial_anos")]);
    const especialYears: SpecialExposure | null =
      flags.especialYears ??
      (especialFromCol === 15 || especialFromCol === 20 || especialFromCol === 25
        ? especialFromCol
        : null);
    const concurrent =
      cols[idx("concomitante")]?.toLowerCase() === "true" ||
      cols[idx("concomitante")] === "1";
    const ym = toYearMonth(cols[idx("competencia")] ?? "");
    const wage = parseBrlToCents(cols[idx("remuneracao")] ?? "0") ?? 0;
    let vinculo = vinculos.get(seq);
    if (!vinculo) {
      vinculo = {
        seq,
        type,
        kind: kindFromType(type, rural),
        employerName: cols[idx("empregador")] || null,
        start: toIsoDate(cols[idx("inicio")]) ?? (ym ? `${ym}-01` : null),
        end: toIsoDate(cols[idx("fim")]),
        indicators: [...flags.named],
        discardedHealthIndicators: [],
        concurrent,
        rural,
        especialYears,
        competences: [],
      };
      vinculos.set(seq, vinculo);
    } else {
      for (const ind of flags.named) {
        if (!vinculo.indicators.includes(ind)) vinculo.indicators.push(ind);
      }
      vinculo.rural = vinculo.rural || rural;
      vinculo.concurrent = vinculo.concurrent || concurrent;
      vinculo.especialYears = vinculo.especialYears ?? especialYears;
    }
    if (ym) {
      vinculo.competences.push({
        yearMonth: ym,
        wageCents: wage,
        indicators: flags.named,
        discardedHealthIndicators: [],
        concurrent,
        rural,
        especialYears,
        vinculoSeq: seq,
      });
    }
  }

  const list = [...vinculos.values()];
  return {
    asOf,
    nit: null,
    filiationDate: null,
    birthDate: null,
    displayName: null,
    vinculos: list,
    competences: list.flatMap((v) => v.competences),
    discardedHealthCount,
    source: "FILE_CNIS",
    format: "csv",
    warnings: [],
  };
}

function parseText(text: string, asOfFallback: string, format: "text" | "pdf"): CnisExtract {
  const asOf =
    toIsoDate(headerField(text, ["Data de emiss[aã]o", "Emitido em", "asOf"])) ??
    asOfFallback;
  const displayName = headerField(text, ["Nome"]);
  const nit = (headerField(text, ["NIT"]) ?? "").replace(/[^\d]/g, "") || null;
  const birthDate = toIsoDate(headerField(text, ["Data de nascimento", "Nascimento"]));
  const filiationDate = toIsoDate(
    headerField(text, ["Data de filia[cç][aã]o", "Filia[cç][aã]o"])
  );

  const vinculos: CnisVinculo[] = [];
  let discardedHealthCount = 0;
  const blocks = text.split(/\n(?=\s*\d+[\.\)]\s*(?:V[íi]nculo|Vinculo|Benef[íi]cio))/i);
  const body = blocks.length > 1 ? blocks.slice(1) : [text];

  for (const block of body) {
    const seqMatch = block.match(/^\s*(\d+)/);
    const seq = seqMatch ? Number(seqMatch[1]) : vinculos.length + 1;
    const type =
      headerField(block, ["Tipo", "Esp[eé]cie", "Categoria"]) ?? "EMPREGADO";
    if (isHealthVinculoType(type) || isHealthVinculoType(block.slice(0, 180))) {
      discardedHealthCount += 1;
      continue;
    }
    const flagLine =
      headerField(block, ["Indicadores"]) ??
      headerField(block, ["Indicador"]) ??
      "";
    const flags = parseIndicators(flagLine);
    discardedHealthCount += flags.health.length;
    const rural =
      flags.rural ||
      /rural/i.test(headerField(block, ["Categoria", "Atividade"]) ?? "") ||
      /Tipo:\s*SEGURADO ESPECIAL/i.test(block);
    const expos = Number(
      (headerField(block, ["Exposi[cç][aã]o", "Exposicao"]) ?? "").replace(/\D/g, "")
    );
    const especialYears: SpecialExposure | null =
      flags.especialYears ??
      (/especial/i.test(headerField(block, ["Atividade"]) ?? "")
        ? 25
        : null) ??
      (expos === 15 || expos === 20 || expos === 25 ? expos : null);
    const concurrent =
      /concomitante:\s*sim/i.test(block) || /concomit[aâ]ncia/i.test(flagLine);
    const vinculo: CnisVinculo = {
      seq,
      type,
      kind: kindFromType(type, rural),
      employerName: headerField(block, ["Empregador", "Nome da empresa", "Empresa"]),
      start: toIsoDate(headerField(block, ["In[ií]cio", "Data de in[ií]cio"])),
      end: toIsoDate(headerField(block, ["Fim", "Data de fim", "Data fim"])),
      indicators: flags.named,
      discardedHealthIndicators: [],
      concurrent,
      rural,
      especialYears,
      competences: [],
    };

    for (const line of block.split(/\n/)) {
      const row = line.trim();
      const ymMatch = row.match(/^(\d{2}\/\d{4}|\d{4}-\d{2})(?:\s|$)/);
      if (!ymMatch) continue;
      const ym = toYearMonth(ymMatch[1]);
      if (!ym) continue;
      const afterYm = row.slice(ymMatch[1].length).trim();
      const wageMatch = afterYm.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})/);
      if (!wageMatch) continue;
      const wage = parseBrlToCents(wageMatch[1]) ?? 0;
      const rest = afterYm.replace(wageMatch[1], "");
      const rowFlags = parseIndicators(rest);
      discardedHealthCount += rowFlags.health.length;
      vinculo.competences.push({
        yearMonth: ym,
        wageCents: wage,
        indicators: [...new Set([...vinculo.indicators, ...rowFlags.named])],
        discardedHealthIndicators: [],
        concurrent: vinculo.concurrent,
        rural: vinculo.rural || rowFlags.rural,
        especialYears: vinculo.especialYears ?? rowFlags.especialYears,
        vinculoSeq: seq,
      });
    }
    vinculos.push(vinculo);
  }

  return {
    asOf,
    nit,
    filiationDate,
    birthDate,
    displayName,
    vinculos,
    competences: vinculos.flatMap((v) => v.competences),
    discardedHealthCount,
    source: "FILE_CNIS",
    format,
    warnings: vinculos.length === 0 ? ["no-vinculos"] : [],
  };
}

function persistShape(extract: CnisExtract): Record<string, unknown> {
  return {
    asOf: extract.asOf,
    nit: extract.nit,
    filiationDate: extract.filiationDate,
    birthDate: extract.birthDate,
    displayName: extract.displayName,
    format: extract.format,
    source: extract.source,
    discardedHealthCount: extract.discardedHealthCount,
    vinculos: extract.vinculos.map((v) => ({
      seq: v.seq,
      type: v.type,
      kind: v.kind,
      employerName: v.employerName,
      start: v.start,
      end: v.end,
      indicators: v.indicators,
      concurrent: v.concurrent,
      rural: v.rural,
      especialYears: v.especialYears,
      competences: v.competences.map((c) => ({
        yearMonth: c.yearMonth,
        wageCents: c.wageCents,
        indicators: c.indicators,
        concurrent: c.concurrent,
        rural: c.rural,
        especialYears: c.especialYears,
        vinculoSeq: c.vinculoSeq,
      })),
    })),
  };
}

export function parseCnisFile(
  input: Uint8Array | string,
  options: { asOf?: string; fileName?: string } = {}
): CnisParseResult {
  const asOf = options.asOf ?? "2026-09-19";
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  if (looksEncryptedOrBinary(bytes) && !isPdfBytes(bytes)) {
    throw new Error("CNIS file looks binary or encrypted");
  }
  const text = typeof input === "string" ? input : decodeTextFile(bytes);
  const lower = text.toLowerCase();
  const headerLine = text.trim().split(/\r?\n/, 1)[0]?.toLowerCase() ?? "";
  const extract =
    headerLine.includes("competencia") && headerLine.includes("remuneracao")
      ? parseCsv(text, asOf)
      : parseText(
          text,
          asOf,
          isPdfBytes(bytes) || options.fileName?.toLowerCase().endsWith(".pdf")
            ? "pdf"
            : "text"
        );
  if (lower.includes("gov.br") && /senha|password/.test(lower)) {
    extract.warnings.push("file-mentions-password-ignored");
  }
  return { extract, persisted: persistShape(extract) };
}
