/**
 * Optional cloud account. Off unless DATABASE_URL and AUTH_SECRET exist.
 * Host the Postgres in the EU (Neon eu-central-1 / Frankfurt, Supabase EU, RDS
 * eu-central-1). No US-only vendor without an EU region.
 */
import {
  DEFAULT_DATA_REGION,
  HOST_DATA_REGION,
  LIVE_DATA_REGIONS,
  RESERVED_DATA_REGIONS,
  VERCEL_FUNCTION_REGION,
  type DataRegion,
} from "@/lib/region";

export type { DataRegion };

/** Preferred From when Resend is configured and EMAIL_FROM is empty. */
export const DEFAULT_RESEND_FROM = "Jubilation <noreply@jubilation.life>";

export interface CloudAuthConfig {
  enabled: boolean;
  magicLink: boolean;
  password: boolean;
  databaseUrl: string;
  authSecret: string;
  authUrl: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  emailFrom: string;
  resendApiKey: string;
  smtpSecure: boolean;
  databaseSsl: boolean;
  defaultDataRegion: DataRegion;
  hostDataRegion: DataRegion;
}

export interface PublicCloudStatus {
  enabled: boolean;
  magicLink: boolean;
  password: boolean;
  dataRegion: DataRegion;
  hostRegion: DataRegion;
  functionRegion: typeof VERCEL_FUNCTION_REGION;
  liveRegions: readonly DataRegion[];
  reservedRegions: readonly DataRegion[];
  brResidencyLive: false;
}

function flagOn(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

function flagOff(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "0" || v === "false" || v === "off" || v === "no";
}

export function cloudAuthConfig(
  env: Record<string, string | undefined> = process.env
): CloudAuthConfig {
  const databaseUrl = env.DATABASE_URL?.trim() ?? "";
  const authSecret = (env.AUTH_SECRET ?? env.NEXTAUTH_SECRET)?.trim() ?? "";
  const authUrl = (env.AUTH_URL ?? env.NEXTAUTH_URL ?? env.NEXT_PUBLIC_APP_URL)?.trim() ?? "";
  const smtpHost = env.SMTP_HOST?.trim() ?? "";
  const resendApiKey = env.RESEND_API_KEY?.trim() ?? "";
  const configuredFrom = env.EMAIL_FROM?.trim() ?? "";
  const emailFrom =
    configuredFrom ||
    (resendApiKey.length > 0 ? DEFAULT_RESEND_FROM : "");
  const smtpPort = Number(env.SMTP_PORT ?? "587") || 587;
  const disabled = flagOff(env.AUTH);
  const enabled =
    !disabled && databaseUrl.length > 0 && authSecret.length >= 16;
  const magicLink =
    enabled &&
    emailFrom.length > 0 &&
    (resendApiKey.length > 0 || smtpHost.length > 0);
  const password = enabled;
  const sslEnv = env.DATABASE_SSL?.trim().toLowerCase();
  const databaseSsl =
    sslEnv === "disable" || sslEnv === "false" || sslEnv === "0"
      ? false
      : !/localhost|127\.0\.0\.1/i.test(databaseUrl);
  return {
    enabled,
    magicLink,
    password,
    databaseUrl,
    authSecret,
    authUrl,
    smtpHost,
    smtpPort,
    smtpUser: env.SMTP_USER?.trim() ?? "",
    smtpPass: env.SMTP_PASS ?? "",
    emailFrom,
    resendApiKey,
    smtpSecure: flagOn(env.SMTP_SECURE) || smtpPort === 465,
    databaseSsl,
    defaultDataRegion: DEFAULT_DATA_REGION,
    hostDataRegion: HOST_DATA_REGION,
  };
}

export function publicCloudStatus(
  env: Record<string, string | undefined> = process.env
): PublicCloudStatus {
  const cfg = cloudAuthConfig(env);
  return {
    enabled: cfg.enabled,
    magicLink: cfg.magicLink,
    password: cfg.password,
    dataRegion: cfg.defaultDataRegion,
    hostRegion: cfg.hostDataRegion,
    functionRegion: VERCEL_FUNCTION_REGION,
    liveRegions: LIVE_DATA_REGIONS,
    reservedRegions: RESERVED_DATA_REGIONS,
    brResidencyLive: false,
  };
}
