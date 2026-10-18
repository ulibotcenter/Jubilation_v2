/**
 * Text from the freedom-calculator number fields.
 * Empty and unfinished text are not numbers: callers keep the last commit
 * so the chart stays put, and they must not write 0 back into the field.
 * A comma is a decimal mark (pt-BR). Explicit 0 commits 0.
 */

function sameNumber(a: number, b: number): boolean {
  return a === b;
}

export function commitNumericInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const normalized = trimmed.replace(/,/g, ".");
  if (normalized.endsWith(".")) return null;
  if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return sameNumber(value, 0) ? 0 : value;
}

/** Text to put in the field when the number changed outside the input. */
export function numericTextForExternalValue(
  committed: number,
  incoming: number
): string | null {
  if (!Number.isFinite(incoming) || sameNumber(committed, incoming)) return null;
  return String(incoming);
}
