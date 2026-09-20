import type { AssetClass, PortfolioAsset } from "@/types";
import type { CashFlow, FinancialAccount, Institution } from "@/lib/engine/canonical";
import { stableEntityId } from "@/lib/engine/ids";
import { defaultCagrForAssetClass } from "@/lib/portfolioCagr";
import type { AllowlistedB3Payload } from "@/lib/connectors/b3/allowlist";
import { B3_INSTITUTION_ID } from "@/lib/connectors/consent";
import { averagePriceFromApi } from "@/lib/holdings/costBasis";

function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cnpjDigits(value: unknown): string {
  return str(value).replace(/\D/g, "");
}

function assetClassOf(instrumentType: string, ticker: string): AssetClass {
  const kind = instrumentType.toUpperCase();
  if (
    kind === "OPTION" ||
    kind === "FUTURE" ||
    kind === "FUT" ||
    kind === "OPT" ||
    kind === "TERM" ||
    kind === "SWAP" ||
    kind === "DERIVATIVE"
  ) {
    return "derivatives";
  }
  if (kind === "ETF") return "etf";
  if (kind === "FII") return "reit";
  if (kind === "BDR") return "bdr";
  if (
    kind === "TREASURY" ||
    kind === "CDB" ||
    kind === "LCI" ||
    kind === "LCA" ||
    kind === "RDB" ||
    kind === "LF" ||
    kind === "DEB" ||
    kind === "CRI" ||
    kind === "CRA"
  ) {
    return "bonds";
  }
  if (/^[A-Z]{4}11$/i.test(ticker) && kind !== "EQUITY") return "etf";
  return "stocks";
}

function holdingName(row: Record<string, unknown>, ticker: string): string {
  return (
    str(row.corporationName) ||
    str(row.issuerName) ||
    ticker
  );
}

function gravameValueOf(
  row: Record<string, unknown>,
  quantity: number,
  price: number
): number {
  const locked = num(row.lockedQuantity) || num(row.gravameQuantity);
  if (locked > 0) return locked * price;
  const pledged = num(row.gravameValue);
  if (pledged > 0) return pledged;
  if (quantity <= 0) return 0;
  return 0;
}

function unitPrice(row: Record<string, unknown>, quantity: number): number {
  const close = num(row.closingPrice, NaN);
  if (Number.isFinite(close) && close > 0) return close;
  const unit = num(row.unitPrice, NaN);
  if (Number.isFinite(unit) && unit > 0) return unit;
  const mv = num(row.marketValue);
  if (quantity > 0 && mv > 0) return mv / quantity;
  return mv;
}

function externalRef(product: string, row: Record<string, unknown>): string {
  const ticker = str(row.tickerSymbol).toUpperCase();
  const isin = str(row.isin).toUpperCase();
  const participant = cnpjDigits(row.participantDocumentNumber);
  const account = str(row.accountNumber);
  return [product, isin || ticker, participant, account].join(":");
}

function productClassOf(product: string, instrumentType: string): string {
  if (product === "derivatives" || instrumentType.toUpperCase() === "DERIVATIVE") {
    return "derivativos";
  }
  if (product === "treasury") return "tesouro";
  if (product === "fixed_income") return "renda_fixa";
  return "rv";
}

function toHolding(
  product: string,
  row: Record<string, unknown>,
  asOf: string,
  accountId: string,
  institutionId: string,
  institutionName: string | null
): PortfolioAsset {
  const ticker = str(row.tickerSymbol).toUpperCase();
  const instrumentType = str(row.instrumentType) || str(row.product);
  const quantity = num(row.quantity);
  const price = unitPrice(row, quantity);
  const apiAvg = averagePriceFromApi(row.averagePrice);
  const assetClass = assetClassOf(instrumentType, ticker);
  const ref = externalRef(product, row);
  const marketValue = quantity * price;
  const isDerivative = assetClass === "derivatives";
  return {
    id: stableEntityId("b3", ref),
    ticker,
    name: holdingName(row, ticker),
    assetClass,
    quantity,
    currentPrice: price,
    costBasis: apiAvg ?? 0,
    costBasisKnown: apiAvg != null,
    currency: "BRL",
    nativeCurrency: "BRL",
    allocation: 0,
    expectedCAGR: defaultCagrForAssetClass(assetClass),
    priceSource: "manual",
    lastPriceAt: asOf,
    previousPrice: null,
    liquidity: "liquid",
    transactionCostRate: 0.005,
    allowSale: false,
    scheduledSaleOn: null,
    source: "B3_API",
    origin: "b3",
    valueType: "market",
    asOf,
    confidence: "high",
    externalRef: ref,
    institutionId,
    institutionName,
    accountId,
    ownership: "holder",
    cnpj: cnpjDigits(row.issuerDocumentNumber) || null,
    productClass: productClassOf(product, instrumentType),
    gravameValue: gravameValueOf(row, quantity, price),
    includeInEngine: isDerivative ? false : undefined,
    valueHistory: [
      {
        asOf,
        value: marketValue,
        source: "B3_API",
      },
    ],
  };
}

function institutionFromRow(row: Record<string, unknown>): Institution {
  const cnpj = cnpjDigits(row.participantDocumentNumber);
  const name = str(row.participantName, "Corretora B3");
  return {
    id: stableEntityId("inst", cnpj || name),
    name,
    cnpj: cnpj || null,
    organisationId: null,
  };
}

function b3CatalogInstitution(): Institution {
  return {
    id: B3_INSTITUTION_ID,
    name: "B3 S.A. - Brasil, Bolsa, Balcão",
    cnpj: "09346601000125",
    organisationId: null,
  };
}

function accountFor(
  institution: Institution,
  accountNumber: string,
  asOf: string
): FinancialAccount {
  const ref = `${institution.id}:${accountNumber || "default"}`;
  return {
    id: stableEntityId("acct", ref),
    institutionId: institution.id,
    kind: "BROKERAGE",
    name: accountNumber ? `${institution.name} · ${accountNumber}` : institution.name,
    currency: "BRL",
    ownership: "holder",
    source: "B3_API",
    asOf,
  };
}

function cashFlowFromMovement(
  row: Record<string, unknown>,
  accountId: string,
  asOf: string
): CashFlow {
  const amount = num(row.amount);
  const side = str(row.side, "buy").toLowerCase();
  const eventType = str(row.eventType, "trade").toLowerCase();
  const date = str(row.tradeDate) || str(row.exDate) || asOf;
  const ref = ["move", str(row.isin), date, str(row.tickerSymbol), amount].join(":");
  return {
    id: stableEntityId("cf", ref),
    accountId,
    date,
    amountCents: Math.round(Math.abs(amount) * 100),
    currency: "BRL",
    direction: side === "sell" || eventType === "dividend" ? "in" : "out",
    category:
      eventType === "dividend"
        ? "dividend"
        : eventType === "interest"
          ? "interest"
          : "trade",
    source: "B3_API",
    asOf,
    externalRef: ref,
    confidence: "high",
  };
}

export interface MappedB3 {
  institutions: Institution[];
  accounts: FinancialAccount[];
  holdings: PortfolioAsset[];
  cashFlows: CashFlow[];
}

export function mapAllowlistedB3(payload: AllowlistedB3Payload): MappedB3 {
  const asOf = payload.asOf;
  const institutions = new Map<string, Institution>();
  institutions.set(B3_INSTITUTION_ID, b3CatalogInstitution());
  const accounts = new Map<string, FinancialAccount>();
  const holdings: PortfolioAsset[] = [];
  const cashFlows: CashFlow[] = [];

  const ensureAccount = (row: Record<string, unknown>): FinancialAccount => {
    const inst = institutionFromRow(row);
    institutions.set(inst.id, inst);
    const acct = accountFor(inst, str(row.accountNumber), asOf);
    accounts.set(acct.id, acct);
    return acct;
  };

  for (const row of payload.equitiesPositions) {
    const acct = ensureAccount(row);
    const inst = institutions.get(acct.institutionId ?? "") ?? null;
    holdings.push(
      toHolding(
        "equities",
        row,
        asOf,
        acct.id,
        acct.institutionId ?? "",
        inst?.name ?? (str(row.participantName) || null)
      )
    );
  }
  for (const row of payload.treasuryPositions) {
    const acct = ensureAccount(row);
    const inst = institutions.get(acct.institutionId ?? "") ?? null;
    holdings.push(
      toHolding(
        "treasury",
        row,
        asOf,
        acct.id,
        acct.institutionId ?? "",
        inst?.name ?? (str(row.participantName) || null)
      )
    );
  }
  for (const row of payload.fixedIncomePositions) {
    const acct = ensureAccount(row);
    const inst = institutions.get(acct.institutionId ?? "") ?? null;
    holdings.push(
      toHolding(
        "fixed_income",
        row,
        asOf,
        acct.id,
        acct.institutionId ?? "",
        inst?.name ?? (str(row.participantName) || null)
      )
    );
  }
  for (const row of payload.derivativesPositions ?? []) {
    const acct = ensureAccount(row);
    const inst = institutions.get(acct.institutionId ?? "") ?? null;
    holdings.push(
      toHolding(
        "derivatives",
        { ...row, instrumentType: str(row.instrumentType) || "DERIVATIVE" },
        asOf,
        acct.id,
        acct.institutionId ?? "",
        inst?.name ?? (str(row.participantName) || null)
      )
    );
  }
  void payload.movements;
  for (const row of payload.events) {
    const acct = ensureAccount(row);
    cashFlows.push({
      ...cashFlowFromMovement(
        { ...row, side: "sell", eventType: str(row.eventType, "dividend") },
        acct.id,
        asOf
      ),
      date: str(row.exDate) || asOf,
      category: "dividend",
      direction: "in",
    });
  }

  return {
    institutions: [...institutions.values()],
    accounts: [...accounts.values()],
    holdings,
    cashFlows,
  };
}
