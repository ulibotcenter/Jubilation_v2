import { NextRequest, NextResponse } from "next/server";
import { parseSignupLead } from "@/lib/accounts/signupLead";
import { allowRequest, rateLimitKey } from "@/lib/api/rateLimit";
import { cloudAuthConfig } from "@/lib/cloud/config";
import { createPendingSignup, findUserByEmail } from "@/lib/cloud/db";
import { cloudDisabledResponse, requireCloudConfig } from "@/lib/cloud/http";
import { sendConfirmationEmail } from "@/lib/cloud/mail";
import { hashPassword } from "@/lib/cloud/passwords";
import { confirmCallbackUrl } from "@/lib/cloud/returnPath";
import { parsePasswordSignup } from "@/lib/cloud/signupConfirm";

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
  if (!cfg.magicLink) {
    return NextResponse.json({ error: "confirmation_disabled" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = parsePasswordSignup(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const existing = await findUserByEmail(parsed.email);
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }
  const lead = parseSignupLead(body);
  const next =
    body && typeof body === "object" && "next" in body
      ? (body as { next?: unknown }).next
      : null;
  const passwordHash = await hashPassword(parsed.password);
  const token = await createPendingSignup({
    email: parsed.email,
    passwordHash,
    dataRegion: cfg.defaultDataRegion,
    leadAge: lead?.age ?? null,
    country: lead?.country ?? null,
  });
  const origin = (cloudAuthConfig().authUrl || request.nextUrl.origin).replace(
    /\/$/,
    ""
  );
  const url = confirmCallbackUrl(
    origin,
    token,
    typeof next === "string" ? next : null
  );
  await sendConfirmationEmail({ to: parsed.email.toLowerCase(), url });
  return NextResponse.json({ pending: true });
}
