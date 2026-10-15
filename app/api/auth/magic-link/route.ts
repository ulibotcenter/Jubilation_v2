import { NextRequest, NextResponse } from "next/server";
import { allowRequest, rateLimitKey } from "@/lib/api/rateLimit";
import { parseSignupLead } from "@/lib/accounts/signupLead";
import { cloudAuthConfig } from "@/lib/cloud/config";
import { createMagicLink } from "@/lib/cloud/db";
import { cloudDisabledResponse, requireCloudConfig } from "@/lib/cloud/http";
import { sendMagicLinkEmail } from "@/lib/cloud/mail";

export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function POST(request: NextRequest) {
  if (!allowRequest(rateLimitKey(request), 8)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const cfg = requireCloudConfig();
  if (!cfg) return cloudDisabledResponse();
  if (!cfg.magicLink) {
    return NextResponse.json({ error: "magic_link_disabled" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const email =
    body && typeof body === "object" && "email" in body
      ? String((body as { email?: unknown }).email ?? "").trim()
      : "";
  if (!email.includes("@")) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  const lead = parseSignupLead(body);
  if (!lead) {
    return NextResponse.json({ error: "invalid_lead" }, { status: 400 });
  }

  const token = await createMagicLink(email, Date.now(), lead);
  const origin = (cloudAuthConfig().authUrl || request.nextUrl.origin).replace(
    /\/$/,
    ""
  );
  const url = `${origin}/api/auth/callback?token=${encodeURIComponent(token)}`;
  await sendMagicLinkEmail({ to: email.toLowerCase(), url });
  return NextResponse.json({ sent: true });
}
