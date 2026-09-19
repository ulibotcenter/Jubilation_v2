/**
 * Optional cloud account. Off unless DATABASE_URL and AUTH_SECRET exist.
 * Host the Postgres in the EU (Neon eu-central, Supabase EU, RDS eu-west, etc.).
 * No US-only vendor without an EU region.
 */
export type DataRegion = "eu" | "br";

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
  smtpSecure: boolean;
  databaseSsl: boolean;
  defaultDataRegion: DataRegion;
}

export interface PublicCloudStatus {
  enabled: boolean;
  magicLink: boolean;
  password: boolean;
  dataRegion: DataRegion;
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
  const emailFrom = env.EMAIL_FROM?.trim() ?? "";
  const smtpPort = Number(env.SMTP_PORT ?? "587") || 587;
  const disabled = flagOff(env.AUTH);
  const enabled =
    !disabled && databaseUrl.length > 0 && authSecret.length >= 16;
  const magicLink = enabled && smtpHost.length > 0 && emailFrom.length > 0;
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
    smtpSecure: flagOn(env.SMTP_SECURE) || smtpPort === 465,
    databaseSsl,
    defaultDataRegion: "eu",
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
  };
}
