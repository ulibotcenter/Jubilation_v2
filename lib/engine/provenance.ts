export type DataSource =
  | "MANUAL"
  | "ESTIMATED"
  | "DERIVED"
  | "B3_API"
  | "OPEN_FINANCE"
  | "FILE_OFX"
  | "FILE_CNIS"
  | "FILE_IRPF"
  | "YAHOO"
  | "COINGECKO";

export type Confidence = "high" | "medium" | "low";

export interface Provenance {
  source: DataSource;
  asOf: string;
  confidence: Confidence;
}

export function manualProvenance(asOf: string): Provenance {
  return { source: "MANUAL", asOf, confidence: "high" };
}

export function derivedProvenance(asOf: string): Provenance {
  return { source: "DERIVED", asOf, confidence: "medium" };
}

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
