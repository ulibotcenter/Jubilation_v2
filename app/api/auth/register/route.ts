import { NextRequest, NextResponse } from "next/server";
import { parseSignupLead } from "@/lib/accounts/signupLead";
import { allowRequest, rateLimitKey } from "@/lib/api/rateLimit";
import { createSession, createUser, findUserByEmail } from "@/lib/cloud/db";
import {
  attachSession,
  cloudDisabledResponse,
  publicAuthUser,
  requireCloudConfig,
} from "@/lib/cloud/http";
import { hashPassword } from "@/lib/cloud/passwords";
import {
  DataRegionError,
  regionPersistResponse,
} from "@/lib/region";

export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function POST(request: NextRequest) {
  if (!allowRequest(rateLimitKey(request), 8)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const cfg = requireCloudConfig();
  if (!cfg) return cloudDisabledResponse();
  if (!cfg.password) {
    return NextResponse.json({ error: "password_disabled" }, { status: 404 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  const lead = parseSignupLead(body);
  if (!email.includes("@") || password.length < 10 || !lead) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }
  const passwordHash = await hashPassword(password);
  try {
    const user = await createUser({
      email,
      passwordHash,
      dataRegion: cfg.defaultDataRegion,
      leadAge: lead.age,
      country: lead.country,
    });
    const token = await createSession(user.id);
    const res = NextResponse.json(publicAuthUser(user));
    return attachSession(res, token);
  } catch (err) {
    if (err instanceof DataRegionError) {
      return NextResponse.json(regionPersistResponse(err), { status: 409 });
    }
    throw err;
  }
}
