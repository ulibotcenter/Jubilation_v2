import type { DataSource, Confidence } from "@/lib/engine/provenance";
export {
  DEFAULT_TENANT,
  normalizeTenant,
  type DataRegion,
  type Tenant,
} from "@/lib/region";

type Currency = "BRL" | "USD" | "EUR";

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

export interface CashFlow {
  id: string;
  accountId: string;
  date: string;
  amountCents: number;
  currency: Currency;
  direction: "in" | "out";
  category: "trade" | "dividend" | "interest" | "transfer" | "other";
  source: DataSource;
  asOf: string;
  externalRef: string;
  confidence: Confidence;
}
