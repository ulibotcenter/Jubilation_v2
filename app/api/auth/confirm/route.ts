import { NextRequest, NextResponse } from "next/server";
import { allowRequest, rateLimitKey } from "@/lib/api/rateLimit";
import { cloudAuthConfig } from "@/lib/cloud/config";
import {
  consumePendingSignup,
  createSession,
  createUser,
  findUserByEmail,
  setUserPasswordHash,
} from "@/lib/cloud/db";
import {
  attachSession,
  cloudDisabledResponse,
  requireCloudConfig,
} from "@/lib/cloud/http";
import { loginFailureUrl, resolveConfirmRedirect } from "@/lib/cloud/returnPath";
import { DataRegionError } from "@/lib/region";

export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET(request: NextRequest) {
  if (!allowRequest(rateLimitKey(request), 8)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const cfg = requireCloudConfig();
  const origin = (cloudAuthConfig().authUrl || request.nextUrl.origin).replace(
    /\/$/,
    ""
  );
  const next = request.nextUrl.searchParams.get("next");
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!cfg) return cloudDisabledResponse();

  const missing = resolveConfirmRedirect({
    origin,
    token: token || null,
    consumed: false,
    next,
  });
  if (!token) {
    return NextResponse.redirect(missing.url);
  }

  const pending = await consumePendingSignup(token);
  const decided = resolveConfirmRedirect({
    origin,
    token,
    consumed: Boolean(pending),
    next,
  });
  if (!pending || !decided.ok) {
    return NextResponse.redirect(decided.url);
  }

  try {
    let user = await findUserByEmail(pending.email);
    if (!user) {
      user = await createUser({
        email: pending.email,
        passwordHash: pending.passwordHash,
        dataRegion: pending.dataRegion || cfg.defaultDataRegion,
        leadAge: pending.leadAge,
        country: pending.leadCountry,
      });
    } else if (!user.passwordHash) {
      const updated = await setUserPasswordHash(user.id, pending.passwordHash);
      if (updated) user = updated;
    }
    const session = await createSession(user.id);
    const res = NextResponse.redirect(decided.url);
    return attachSession(res, session);
  } catch (err) {
    if (err instanceof DataRegionError) {
      return NextResponse.redirect(loginFailureUrl(origin, "region", next));
    }
    throw err;
  }
}
