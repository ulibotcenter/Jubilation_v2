/** Official DIRPF fixed-width layout (Receita Federal, leiaute 2017 — same family as .DBK/.DEC). */

export const DIRPF_LAYOUT_SOURCE =
  "Receita Federal, Leiaute DIRPF (gov.br/receitafederal …/documentos-tecnicos/dirpf). Header IR + records 16/21–28. Layout is versioned by exercício; this lot implements the published 2017 field positions, which remain the public spec for .DBK/.DEC of the same family. Exercícios without a published PDF are not reverse-engineered.";

export const DIRPF_DISCARDED_RECORDS = new Set([
  "26", // Pagamentos efetuados — médicos, clínicas, planos (LGPD art. 5º, II)
  "25", // Dependentes — menores
  "31", // Moléstia grave / acidente em serviço
  "34", // Doações a partidos
]);

export const DIRPF_ALLOWED_RECORDS = new Set([
  "IR",
  "16",
  "19",
  "21",
  "22",
  "23",
  "24",
  "27",
  "28",
  "T9",
]);

export function slice(line: string, start: number, end: number): string {
  return line.slice(start - 1, end);
}

export function parseMoneyCents(line: string, start: number, end: number): number {
  const raw = slice(line, start, end).trim();
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function parseAlnum(line: string, start: number, end: number): string {
  return slice(line, start, end).trim();
}

export function padNum(value: number, width: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = String(Math.abs(Math.round(value))).padStart(width - sign.length, "0");
  return sign ? sign + digits.slice(1) : digits.slice(-width);
}

export function padText(value: string, width: number): string {
  return value.padEnd(width, " ").slice(0, width);
}

export function recordType(line: string): string {
  const head = line.slice(0, 8);
  if (head.startsWith("IRPF")) return "IR";
  return line.slice(0, 2);
}
