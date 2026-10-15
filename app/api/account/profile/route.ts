import { NextRequest, NextResponse } from "next/server";
import { allowRequest, rateLimitKey } from "@/lib/api/rateLimit";
import { parseProfilePreferences } from "@/lib/accounts/planDocument";
import { updateUserPreferences } from "@/lib/cloud/db";
import { isAuthUser, publicAuthUser, requireUser } from "@/lib/cloud/http";

export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function PUT(request: NextRequest) {
  if (!allowRequest(rateLimitKey(request), 30)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const user = await requireUser(request);
  if (!isAuthUser(user)) return user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const prefs = parseProfilePreferences(body);
  if (!prefs) {
    return NextResponse.json({ error: "invalid_profile" }, { status: 400 });
  }
  const updated = await updateUserPreferences(user.id, prefs);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(publicAuthUser(updated));
}
