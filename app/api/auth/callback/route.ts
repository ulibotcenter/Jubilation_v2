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
  const settings = new URL("/settings", `${origin}/`);
  if (!cfg) return cloudDisabledResponse();

  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.redirect(`${settings.href}?auth=missing`);
  }
  const consumed = await consumeMagicLink(token);
  if (!consumed) {
    return NextResponse.redirect(`${settings.href}?auth=expired`);
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
        return NextResponse.redirect(`${settings.href}?auth=region`);
      }
      throw err;
    }
  }
  const session = await createSession(user.id);
  const res = NextResponse.redirect(`${settings.href}?auth=ok`);
  return attachSession(res, session);
}
