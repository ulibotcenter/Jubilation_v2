import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { publicCloudStatus } from "@/lib/cloud/config";
import {
  DEFAULT_DATA_REGION,
  DEFAULT_TENANT,
  DataRegionError,
  HOST_DATA_REGION,
  LIVE_DATA_REGIONS,
  RESERVED_DATA_REGIONS,
  VERCEL_FUNCTION_REGION,
  VERCEL_FUNCTION_REGIONS,
  assertTenantMayPersistOnHost,
  isDataRegion,
  isLiveDataRegion,
  normalizeTenant,
  parseDataRegion,
  preferredRegion,
  tenantMayPersistOnHost,
} from "@/lib/region";

describe("tenant.data_region", () => {
  it("defaults the B2C tenant to eu", () => {
    expect(DEFAULT_DATA_REGION).toBe("eu");
    expect(DEFAULT_TENANT).toEqual({ id: "b2c-default", dataRegion: "eu" });
    expect(HOST_DATA_REGION).toBe("eu");
    expect(parseDataRegion(undefined)).toBe("eu");
    expect(parseDataRegion(null)).toBe("eu");
    expect(parseDataRegion("")).toBe("eu");
    expect(parseDataRegion("us")).toBe("eu");
    expect(normalizeTenant(undefined)).toEqual(DEFAULT_TENANT);
    expect(normalizeTenant({})).toEqual(DEFAULT_TENANT);
    expect(normalizeTenant({ data_region: "eu" })).toEqual(DEFAULT_TENANT);
  });

  it("accepts br as a reserved field without treating it as live", () => {
    expect(isDataRegion("br")).toBe(true);
    expect(parseDataRegion("br")).toBe("br");
    expect(isLiveDataRegion("eu")).toBe(true);
    expect(isLiveDataRegion("br")).toBe(false);
    expect(LIVE_DATA_REGIONS).toEqual(["eu"]);
    expect(RESERVED_DATA_REGIONS).toEqual(["br"]);
    expect(
      normalizeTenant({ id: "future-bank", dataRegion: "br" })
    ).toEqual({ id: "future-bank", dataRegion: "br" });
  });

  it("refuses to persist a br tenant on this EU host — CMN 4.893 is not solved", () => {
    expect(tenantMayPersistOnHost(DEFAULT_TENANT)).toEqual({ ok: true });
    expect(tenantMayPersistOnHost({ dataRegion: "br" })).toEqual({
      ok: false,
      error: "region_not_live",
    });
    expect(() =>
      assertTenantMayPersistOnHost({ dataRegion: "br" })
    ).toThrow(DataRegionError);
    try {
      assertTenantMayPersistOnHost({ dataRegion: "br" });
      throw new Error("expected refuse");
    } catch (err) {
      expect(err).toBeInstanceOf(DataRegionError);
      const blocked = err as DataRegionError;
      expect(blocked.code).toBe("region_not_live");
      expect(blocked.dataRegion).toBe("br");
      expect(blocked.hostRegion).toBe("eu");
    }
  });

  it("does not invent a Brazilian-bank tenant or a live BR contract", () => {
    expect(DEFAULT_TENANT.id).toBe("b2c-default");
    expect(DEFAULT_TENANT.dataRegion).not.toBe("br");
    const status = publicCloudStatus({});
    expect(status.brResidencyLive).toBe(false);
    expect(status.reservedRegions).toContain("br");
    expect(status.liveRegions).toEqual(["eu"]);
    expect(status.dataRegion).toBe("eu");
  });
});

describe("Vercel / Next EU pin", () => {
  it("pins functions to Frankfurt (fra1) in vercel.json and the shared constant", () => {
    const vercel = JSON.parse(
      readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")
    ) as { regions: string[] };
    expect(VERCEL_FUNCTION_REGION).toBe("fra1");
    expect(VERCEL_FUNCTION_REGIONS).toEqual(["fra1"]);
    expect(preferredRegion).toBe("fra1");
    expect(vercel.regions).toEqual(["fra1"]);
    expect(vercel.regions).not.toContain("iad1");
    expect(vercel.regions).not.toContain("lhr1");
  });

  it("exports preferredRegion from the root layout", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "app/layout.tsx"),
      "utf8"
    );
    expect(layout).toMatch(/export \{ preferredRegion \} from "@\/lib\/region"/);
  });
});
