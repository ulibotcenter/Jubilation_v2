/** Allowlist of B3 Área Logada fields we persist. Everything else is dropped before mapping. */

export const EQUITIES_POSITION_FIELDS = [
  "tickerSymbol",
  "isin",
  "corporationName",
  "quantity",
  "closingPrice",
  "marketValue",
  "averagePrice",
  "instrumentType",
  "participantDocumentNumber",
  "participantName",
  "accountNumber",
] as const;

export const TREASURY_POSITION_FIELDS = [
  "tickerSymbol",
  "isin",
  "corporationName",
  "quantity",
  "unitPrice",
  "marketValue",
  "averagePrice",
  "maturityDate",
  "index",
  "instrumentType",
  "participantDocumentNumber",
  "participantName",
  "accountNumber",
] as const;

export const FIXED_INCOME_POSITION_FIELDS = [
  "tickerSymbol",
  "isin",
  "issuerName",
  "issuerDocumentNumber",
  "quantity",
  "marketValue",
  "averagePrice",
  "maturityDate",
  "index",
  "product",
  "instrumentType",
  "participantDocumentNumber",
  "participantName",
  "accountNumber",
] as const;

export const MOVEMENT_FIELDS = [
  "tickerSymbol",
  "isin",
  "tradeDate",
  "quantity",
  "price",
  "amount",
  "side",
  "eventType",
  "participantDocumentNumber",
  "accountNumber",
] as const;

export const EVENT_FIELDS = [
  "tickerSymbol",
  "isin",
  "eventType",
  "exDate",
  "amount",
  "participantDocumentNumber",
  "accountNumber",
] as const;

export type EquitiesPositionField = (typeof EQUITIES_POSITION_FIELDS)[number];
export type TreasuryPositionField = (typeof TREASURY_POSITION_FIELDS)[number];
export type FixedIncomePositionField = (typeof FIXED_INCOME_POSITION_FIELDS)[number];

function pick(
  row: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined) {
      out[key] = row[key];
    }
  }
  return out;
}

function asRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === "object" && !Array.isArray(row)
  );
}

export interface AllowlistedB3Payload {
  asOf: string;
  equitiesPositions: Record<string, unknown>[];
  treasuryPositions: Record<string, unknown>[];
  fixedIncomePositions: Record<string, unknown>[];
  movements: Record<string, unknown>[];
  events: Record<string, unknown>[];
}

export function allowlistB3Payload(raw: unknown, fallbackAsOf: string): AllowlistedB3Payload {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const asOf =
    typeof obj.referenceDate === "string"
      ? obj.referenceDate
      : typeof obj.asOf === "string"
        ? obj.asOf
        : fallbackAsOf;

  return {
    asOf,
    equitiesPositions: asRows(
      obj.equitiesPositions ?? obj.EquitiesPositions
    ).map((row) => pick(row, EQUITIES_POSITION_FIELDS)),
    treasuryPositions: asRows(
      obj.treasuryBondsPositions ?? obj.treasuryPositions
    ).map((row) => pick(row, TREASURY_POSITION_FIELDS)),
    fixedIncomePositions: asRows(
      obj.fixedIncomePositions ?? obj.FixedIncomePositions
    ).map((row) => pick(row, FIXED_INCOME_POSITION_FIELDS)),
    movements: asRows(obj.movements).map((row) => pick(row, MOVEMENT_FIELDS)),
    events: asRows(obj.events ?? obj.provisionedEvents).map((row) =>
      pick(row, EVENT_FIELDS)
    ),
  };
}

export function payloadHasStrippedKeys(
  raw: unknown,
  forbidden: string[]
): boolean {
  const json = JSON.stringify(raw);
  return forbidden.some((key) => json.includes(`"${key}"`));
}
