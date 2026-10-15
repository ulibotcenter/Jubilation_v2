import { NextRequest, NextResponse } from "next/server";
import { cloudAuthConfig } from "@/lib/cloud/config";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  userFromSessionToken,
  type AuthUser,
} from "@/lib/cloud/db";

export function cloudDisabledResponse() {
  return NextResponse.json(
    { error: "cloud_disabled", enabled: false },
    { status: 503 }
  );
}

export function requireCloudConfig() {
  const cfg = cloudAuthConfig();
  if (!cfg.enabled) return null;
  return cfg;
}

export function sessionCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export function attachSession(res: NextResponse, token: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

export function clearSession(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return res;
}

export async function requireUser(
  request: NextRequest
): Promise<AuthUser | NextResponse> {
  if (!requireCloudConfig()) return cloudDisabledResponse();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = await userFromSessionToken(token);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return user;
}

export function isAuthUser(value: AuthUser | NextResponse): value is AuthUser {
  return !(value instanceof NextResponse);
}

export function publicAuthUser(user: AuthUser) {
  return {
    email: user.email,
    dataRegion: user.dataRegion,
    planTier: user.planTier,
    subscriptionStatus: user.subscriptionStatus,
    country: user.preferredCountry,
    locale: user.preferredLocale,
    currency: user.preferredCurrency,
  };
}
