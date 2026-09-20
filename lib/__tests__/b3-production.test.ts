import { afterEach, describe, expect, it, vi } from "vitest";
import { allowlistB3Payload } from "@/lib/connectors/b3/allowlist";
import { fetchB3Canonical, fixtureCanonical } from "@/lib/connectors/b3/client";
import { B3_FIXTURE_AS_OF, B3_FIXTURE_RAW } from "@/lib/connectors/b3/fixture";
import { mapAllowlistedB3 } from "@/lib/connectors/b3/map";
import { B3Connector } from "@/lib/connectors/b3";
import {
  hasB3ProductionCredentials,
  hasB3SandboxCredentials,
  isLiveB3Mode,
  isOpenFinanceEnabled,
  publicB3Status,
  resolveB3Mode,
} from "@/lib/connectors/flags";

const LIVE_ENV = {
  B3_PRODUCTION_BASE_URL: "https://b3.example.test",
  B3_PRODUCTION_ACCESS_TOKEN: "tok_live_test",
  B3_PRODUCTION_INVESTOR_DOCUMENT: "39053344705",
};

const SANDBOX_ENV = {
  B3_SANDBOX_BASE_URL: "https://b3-sandbox.example.test",
  B3_SANDBOX_ACCESS_TOKEN: "tok_sandbox_test",
  B3_SANDBOX_INVESTOR_DOCUMENT: "39053344705",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function petrEquity() {
  return {
    tickerSymbol: "PETR4",
    isin: "BRPETRACNPR6",
    corporationName: "PETROLEO BRASILEIRO S.A. PETROBRAS",
    quantity: 10,
    closingPrice: 40,
    marketValue: 400,
    averagePrice: 32,
    instrumentType: "EQUITY",
    participantDocumentNumber: "02332886000104",
    participantName: "XP INVESTIMENTOS CCTVM S.A.",
    accountNumber: "1",
  };
}

function stubPositionFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/equities") && url.includes("posicao")) {
      return jsonResponse({ equitiesPositions: [petrEquity()] });
    }
    return jsonResponse([]);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("B3 production path", () => {
  it("maps allowlisted custody fields the same way for fixture and live-shaped payloads", () => {
    const allowlisted = allowlistB3Payload(B3_FIXTURE_RAW, B3_FIXTURE_AS_OF);
    const mapped = mapAllowlistedB3(allowlisted);
    expect(mapped.holdings.map((h) => h.ticker).sort()).toEqual(
      ["BOVA11", "CDB-INT", "HGLG11", "LCI-ITA", "NTNB-2029", "NTNS-2027", "PETR4", "VALE3"].sort()
    );
    expect(mapped.holdings.every((h) => h.source === "B3_API")).toBe(true);
    expect(mapped.holdings.every((h) => h.asOf === B3_FIXTURE_AS_OF)).toBe(true);

    const liveShaped = allowlistB3Payload(
      {
        referenceDate: "2026-09-19",
        equitiesPositions: [petrEquity()],
        treasuryBondsPositions: [],
        fixedIncomePositions: [],
        movements: [],
      },
      "2026-09-19"
    );
    const liveMapped = mapAllowlistedB3(liveShaped);
    expect(liveMapped.holdings).toHaveLength(1);
    expect(liveMapped.holdings[0]?.ticker).toBe("PETR4");
    expect(liveMapped.holdings[0]?.source).toBe("B3_API");
    expect(liveMapped.holdings[0]?.currentPrice).toBe(40);
  });

  it("auth-off default is fixture: empty or incomplete env never goes live", () => {
    expect(resolveB3Mode({})).toBe("fixture");
    expect(hasB3ProductionCredentials({})).toBe(false);
    expect(hasB3SandboxCredentials({})).toBe(false);
    expect(publicB3Status({})).toEqual({
      enabled: true,
      live: false,
      mode: "fixture",
      reason: "missing_env",
      openFinance: false,
    });
    expect(
      hasB3ProductionCredentials({
        B3_PRODUCTION_BASE_URL: "https://b3.example.test",
        B3_PRODUCTION_ACCESS_TOKEN: "tok",
      })
    ).toBe(false);
    expect(
      resolveB3Mode({
        B3_PRODUCTION_BASE_URL: "https://b3.example.test",
        B3_PRODUCTION_ACCESS_TOKEN: "tok",
      })
    ).toBe("fixture");
    expect(new B3Connector({}).capabilities().live).toBe(false);
    expect(new B3Connector({}).health().mode).toBe("fixture");
  });

  it("falls back to fixture when production is killed even if keys exist", () => {
    expect(
      resolveB3Mode({
        ...LIVE_ENV,
        B3_LIVE: "off",
      })
    ).toBe("fixture");
    expect(publicB3Status({ ...LIVE_ENV, B3_PRODUCTION: "false" }).live).toBe(
      false
    );
  });

  it("refuses to treat fixture holdings as live even though source is B3_API", async () => {
    const snapshot = await fetchB3Canonical({
      env: {},
      now: new Date("2026-09-19T12:00:00Z"),
    });
    expect(snapshot.health.mode).toBe("fixture");
    expect(snapshot.health.asOf).toBe(B3_FIXTURE_AS_OF);
    expect(snapshot.holdings.length).toBeGreaterThan(0);
    expect(snapshot.holdings.every((h) => h.source === "B3_API")).toBe(true);
    expect(isLiveB3Mode(snapshot.health.mode)).toBe(false);
    expect(isLiveB3Mode(fixtureCanonical().health.mode)).toBe(false);
    expect(publicB3Status({}).live).toBe(false);
  });

  it("production credentials call the configured host and return mode=live", async () => {
    const fetchMock = stubPositionFetch();
    vi.stubGlobal("fetch", fetchMock);
    const snapshot = await fetchB3Canonical({
      env: LIVE_ENV,
      now: new Date("2026-09-20T12:00:00Z"),
    });
    expect(snapshot.health.mode).toBe("live");
    expect(isLiveB3Mode(snapshot.health.mode)).toBe(true);
    expect(snapshot.holdings.some((h) => h.ticker === "PETR4")).toBe(true);
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).startsWith("https://b3.example.test/")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.every(
        (call) =>
          !String(call[0]).includes("investidor.b3.com.br") &&
          !String(call[0]).includes("developers.b3.com.br")
      )
    ).toBe(true);
    expect(new B3Connector(LIVE_ENV).capabilities().live).toBe(true);
    expect(publicB3Status(LIVE_ENV)).toMatchObject({
      enabled: true,
      live: true,
      mode: "live",
      reason: null,
      openFinance: false,
    });
  });

  it("sandbox credentials are not live holdings", async () => {
    const fetchMock = stubPositionFetch();
    vi.stubGlobal("fetch", fetchMock);
    const snapshot = await fetchB3Canonical({
      env: SANDBOX_ENV,
      now: new Date("2026-09-20T12:00:00Z"),
    });
    expect(snapshot.health.mode).toBe("sandbox");
    expect(isLiveB3Mode(snapshot.health.mode)).toBe(false);
    expect(new B3Connector(SANDBOX_ENV).capabilities().live).toBe(false);
    expect(publicB3Status(SANDBOX_ENV).reason).toBe("sandbox_only");
    expect(publicB3Status(SANDBOX_ENV).live).toBe(false);
  });

  it("failed live call stays live and empty — never falls back to the fixture", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );
    const snapshot = await fetchB3Canonical({
      env: LIVE_ENV,
      now: new Date("2026-09-20T12:00:00Z"),
    });
    expect(snapshot.health.mode).toBe("live");
    expect(isLiveB3Mode(snapshot.health.mode)).toBe(true);
    expect(snapshot.holdings).toEqual([]);
    expect(snapshot.cashFlows).toEqual([]);
    expect(snapshot.health.status).toBe("unavailable");
    expect(snapshot.holdings.some((h) => h.ticker === "PETR4")).toBe(false);
    expect(snapshot.health.asOf).not.toBe(B3_FIXTURE_AS_OF);
    expect(snapshot.raw.mode).toBe("live");
  });

  it("token failure on live stays live with no holdings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "unauthorized" }, 401))
    );
    const snapshot = await fetchB3Canonical({
      env: {
        B3_PRODUCTION_BASE_URL: "https://b3.example.test",
        B3_PRODUCTION_CLIENT_ID: "id",
        B3_PRODUCTION_CLIENT_SECRET: "secret",
        B3_PRODUCTION_INVESTOR_DOCUMENT: "39053344705",
      },
      now: new Date("2026-09-20T12:00:00Z"),
    });
    expect(snapshot.health.mode).toBe("live");
    expect(snapshot.holdings).toEqual([]);
    expect(snapshot.health.lastError).toMatch(/token 401/);
    expect(isLiveB3Mode(snapshot.health.mode)).toBe(true);
  });

  it("production wins over sandbox when both envs are set", () => {
    expect(resolveB3Mode({ ...LIVE_ENV, ...SANDBOX_ENV })).toBe("live");
  });

  it("does not enable Open Finance", () => {
    expect(isOpenFinanceEnabled()).toBe(false);
    expect(publicB3Status(LIVE_ENV).openFinance).toBe(false);
  });
});
