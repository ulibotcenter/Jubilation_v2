import { NextRequest, NextResponse } from "next/server";
import { allowRequest, rateLimitKey } from "@/lib/api/rateLimit";
import { cloudAuthConfig } from "@/lib/cloud/config";
import {
  consumeMagicLink,
  createSession,
  createUser,
  findUserByEmail,
} from "@/lib/cloud/db";
import {
  attachSession,
  cloudDisabledResponse,
  requireCloudConfig,
} from "@/lib/cloud/http";
import { loginFailureUrl, postLoginUrl } from "@/lib/cloud/returnPath";
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
  if (!cfg) return cloudDisabledResponse();

  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.redirect(loginFailureUrl(origin, "missing", next));
  }
  const consumed = await consumeMagicLink(token);
  if (!consumed) {
    return NextResponse.redirect(loginFailureUrl(origin, "expired", next));
  }
  let user = await findUserByEmail(consumed.email);
  if (!user) {
    try {
      user = await createUser({
        email: consumed.email,
        dataRegion: cfg.defaultDataRegion,
        leadAge: consumed.leadAge,
        country: consumed.leadCountry,
      });
    } catch (err) {
      if (err instanceof DataRegionError) {
        return NextResponse.redirect(loginFailureUrl(origin, "region", next));
      }
      throw err;
    }
  }
  const session = await createSession(user.id);
  const res = NextResponse.redirect(postLoginUrl(origin, next));
  return attachSession(res, session);
}
