import { NextRequest, NextResponse } from "next/server";
import { allowRequest, rateLimitKey } from "@/lib/api/rateLimit";
import { createSession, findUserByEmail } from "@/lib/cloud/db";
import {
  attachSession,
  cloudDisabledResponse,
  publicAuthUser,
  requireCloudConfig,
} from "@/lib/cloud/http";
import { verifyPassword } from "@/lib/cloud/passwords";

export const dynamic = "force-dynamic";

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
  if (!email.includes("@") || password.length < 10) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  const user = await findUserByEmail(email);
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  const token = await createSession(user.id);
  const res = NextResponse.json(publicAuthUser(user));
  return attachSession(res, token);
}
