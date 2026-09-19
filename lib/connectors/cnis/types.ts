import type {
  ContributorKind,
  SpecialExposure,
} from "@/lib/engine/inssTypes";
import type { DataSource } from "@/lib/engine/provenance";

export type CnisNamedIndicator = "PREC-MENOR" | "PEXT" | "PVINC";

export interface CnisCompetence {
  yearMonth: string;
  wageCents: number;
  indicators: CnisNamedIndicator[];
  discardedHealthIndicators: string[];
  concurrent: boolean;
  rural: boolean;
  especialYears: SpecialExposure | null;
  vinculoSeq: number;
}

export interface CnisVinculo {
  seq: number;
  type: string;
  kind: ContributorKind;
  employerName: string | null;
  start: string | null;
  end: string | null;
  indicators: CnisNamedIndicator[];
  discardedHealthIndicators: string[];
  concurrent: boolean;
  rural: boolean;
  especialYears: SpecialExposure | null;
  competences: CnisCompetence[];
}

export interface CnisExtract {
  asOf: string;
  nit: string | null;
  filiationDate: string | null;
  birthDate: string | null;
  displayName: string | null;
  vinculos: CnisVinculo[];
  competences: CnisCompetence[];
  discardedHealthCount: number;
  source: DataSource;
  format: "text" | "csv" | "pdf";
  warnings: string[];
}

export interface CnisParseResult {
  extract: CnisExtract;
  /** JSON of what we persist — tests assert health tokens never appear. */
  persisted: Record<string, unknown>;
}
