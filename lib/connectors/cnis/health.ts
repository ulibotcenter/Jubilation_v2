/** Benefit/health tokens discarded on ingest — never persisted. */

const HEALTH_EXACT = new Set([
  "B31",
  "B32",
  "B91",
  "B92",
  "B94",
  "AUXILIO-DOENCA",
  "AUXÍLIO-DOENÇA",
  "AUXDOENCA",
  "INVALIDEZ",
  "INCAPACIDADE",
  "APOSENTADORIA-INVALIDEZ",
  "MOLESTIA",
  "MOLÉSTIA",
  "AUXILIO-ACIDENTE",
  "AUXÍLIO-ACIDENTE",
]);

const HEALTH_SUBSTR = [
  "INVALIDEZ",
  "INCAPACIDADE",
  "AUXILIO-DOENCA",
  "AUXÍLIO-DOENÇA",
  "MOLESTIA GRAVE",
  "MOLÉSTIA GRAVE",
  "AUXILIO DOENCA",
  "AUXÍLIO-DOENÇA",
];

export function normalizeIndicatorToken(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

export function isHealthIndicator(raw: string): boolean {
  const token = normalizeIndicatorToken(raw);
  if (!token) return false;
  if (HEALTH_EXACT.has(token) || HEALTH_EXACT.has(raw.trim().toUpperCase())) {
    return true;
  }
  return HEALTH_SUBSTR.some((s) => token.includes(normalizeIndicatorToken(s)));
}

export function isHealthVinculoType(type: string): boolean {
  const t = normalizeIndicatorToken(type);
  return (
    t.includes("BENEFICIO") ||
    t.includes("BENEFIT") ||
    isHealthIndicator(type)
  );
}
