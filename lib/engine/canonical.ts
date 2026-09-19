import type { DataSource, Confidence } from "@/lib/engine/provenance";

type Currency = "BRL" | "USD" | "EUR";

export type DataRegion = "eu" | "br";

export interface Tenant {
  id: string;
  /** Where this tenant's data must live. B2C default is eu. */
  dataRegion: DataRegion;
}

export const DEFAULT_TENANT: Tenant = {
  id: "b2c-default",
  dataRegion: "eu",
};

export type AccountKind =
  | "BROKERAGE"
  | "FUND"
  | "FIXED_INCOME"
  | "PENSION_PRIVATE_DC"
  | "PENSION_PRIVATE_DB"
  | "PENSION_STATE"
  | "SEVERANCE_FUND"
  | "REAL_ESTATE"
  | "VEHICLE"
  | "CRYPTO"
  | "CASH";

export type Ownership = "holder" | "spouse" | "joint";

export interface Institution {
  id: string;
  name: string;
  cnpj?: string | null;
  organisationId?: string | null;
}

export interface FinancialAccount {
  id: string;
  institutionId: string | null;
  kind: AccountKind;
  name: string;
  currency: Currency;
  ownership: Ownership;
  source: DataSource;
  asOf: string;
}

export interface Entitlement {
  id: string;
  kind: "INSS" | "RPPS" | "PENSION" | "ANNUITY" | "RENDA_MAIS";
  personId: string;
  estimatedMonthly: number;
  currency: Currency;
  estimatedBy: "user" | "engine" | "agency";
  asOf: string;
  source: DataSource;
  confidence: Confidence;
}
