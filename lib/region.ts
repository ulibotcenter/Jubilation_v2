/**
 * Data residency for this deploy.
 *
 * Host-from-day-1 is the EU (Vercel fra1 / Frankfurt). `tenant.data_region`
 * defaults to `eu`. `br` is a reserved future residency for a regulated
 * Brazilian-bank tenant (CMN 4.893) — it is not live, and this EU host must
 * not persist that tenant's data as if the conflict were solved.
 */
export const DATA_REGIONS = ["eu", "br"] as const;
export type DataRegion = (typeof DATA_REGIONS)[number];

export const DEFAULT_DATA_REGION: DataRegion = "eu";
export const LIVE_DATA_REGIONS: readonly DataRegion[] = ["eu"];
export const RESERVED_DATA_REGIONS: readonly DataRegion[] = ["br"];

/** This deploy. A future BR cluster would be a different host, not a flag flip. */
export const HOST_DATA_REGION: DataRegion = "eu";

/**
 * Vercel Function region pin. `fra1` is Frankfurt (Germany), inside the EU.
 * London (`lhr1`) is not an EU pin. Washington (`iad1`) is the Vercel default
 * for new projects — that is exactly what this lot overrides.
 */
export const VERCEL_FUNCTION_REGION = "fra1" as const;
export const VERCEL_FUNCTION_REGIONS = [VERCEL_FUNCTION_REGION] as const;
export const preferredRegion = VERCEL_FUNCTION_REGION;

export interface Tenant {
  id: string;
  /** Where this tenant's data must live. B2C default is eu. */
  dataRegion: DataRegion;
}

export const DEFAULT_TENANT: Tenant = {
  id: "b2c-default",
  dataRegion: DEFAULT_DATA_REGION,
};

export const DEFAULT_TENANT_ID = DEFAULT_TENANT.id;

export type RegionPersistError = "region_not_live" | "region_host_mismatch";

export class DataRegionError extends Error {
  readonly code: RegionPersistError;
  readonly dataRegion: DataRegion;
  readonly hostRegion: DataRegion;

  constructor(code: RegionPersistError, dataRegion: DataRegion) {
    super(code);
    this.name = "DataRegionError";
    this.code = code;
    this.dataRegion = dataRegion;
    this.hostRegion = HOST_DATA_REGION;
  }
}

export function isDataRegion(value: unknown): value is DataRegion {
  return value === "eu" || value === "br";
}

export function parseDataRegion(value: unknown): DataRegion {
  return isDataRegion(value) ? value : DEFAULT_DATA_REGION;
}

export function isLiveDataRegion(region: DataRegion): boolean {
  return (LIVE_DATA_REGIONS as readonly string[]).includes(region);
}

export function normalizeTenant(raw: unknown): Tenant {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const id =
    typeof obj.id === "string" && obj.id.trim()
      ? obj.id.trim()
      : DEFAULT_TENANT.id;
  const dataRegion = parseDataRegion(obj.dataRegion ?? obj.data_region);
  return { id, dataRegion };
}

export function tenantMayPersistOnHost(
  tenant: Pick<Tenant, "dataRegion">,
  hostRegion: DataRegion = HOST_DATA_REGION
): { ok: true } | { ok: false; error: RegionPersistError } {
  if (!isLiveDataRegion(tenant.dataRegion)) {
    return { ok: false, error: "region_not_live" };
  }
  if (tenant.dataRegion !== hostRegion) {
    return { ok: false, error: "region_host_mismatch" };
  }
  return { ok: true };
}

/**
 * Refuse to write or serve a reserved-region tenant on this EU host.
 * Do not coerce `br` → `eu`. That would pretend CMN 4.893 is solved.
 */
export function assertTenantMayPersistOnHost(
  tenant: Pick<Tenant, "dataRegion">,
  hostRegion: DataRegion = HOST_DATA_REGION
): void {
  const decision = tenantMayPersistOnHost(tenant, hostRegion);
  if (!decision.ok) {
    throw new DataRegionError(decision.error, tenant.dataRegion);
  }
}

export function regionPersistResponse(err: DataRegionError) {
  return {
    error: err.code,
    dataRegion: err.dataRegion,
    hostRegion: err.hostRegion,
    live: false,
  };
}
