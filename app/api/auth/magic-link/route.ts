import { NextRequest, NextResponse } from "next/server";
import { allowRequest, rateLimitKey } from "@/lib/api/rateLimit";
import { cloudAuthConfig } from "@/lib/cloud/config";
import { createMagicLink } from "@/lib/cloud/db";
import { cloudDisabledResponse, requireCloudConfig } from "@/lib/cloud/http";
import { sendMagicLinkEmail } from "@/lib/cloud/mail";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!allowRequest(rateLimitKey(request), 8)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const cfg = requireCloudConfig();
  if (!cfg) return cloudDisabledResponse();
  if (!cfg.magicLink) {
    return NextResponse.json({ error: "magic_link_disabled" }, { status: 404 });
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const email = body.email?.trim() ?? "";
  if (!email.includes("@")) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const token = await createMagicLink(email);
  const origin = (cloudAuthConfig().authUrl || request.nextUrl.origin).replace(
    /\/$/,
    ""
  );
  const url = `${origin}/api/auth/callback?token=${encodeURIComponent(token)}`;
  await sendMagicLinkEmail({ to: email.toLowerCase(), url });
  return NextResponse.json({ sent: true });
}
