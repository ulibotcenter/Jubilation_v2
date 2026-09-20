import { NextRequest, NextResponse } from "next/server";
import { allowRequest, rateLimitKey } from "@/lib/api/rateLimit";
import { billingConfig, offerById } from "@/lib/billing/config";
import { createStripeCheckoutSession } from "@/lib/billing/checkout";
import { isAuthUser, requireUser } from "@/lib/cloud/http";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!allowRequest(rateLimitKey(request), 8)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const cfg = billingConfig();
  if (!cfg.enabled) {
    return NextResponse.json(
      { error: "billing_disabled", reason: cfg.reason, enabled: false },
      { status: 503 }
    );
  }

  const user = await requireUser(request);
  if (!isAuthUser(user)) return user;

  let body: { offerId?: string };
  try {
    body = (await request.json()) as { offerId?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const offer = offerById(cfg.offers, body.offerId ?? "");
  if (!offer) {
    return NextResponse.json({ error: "unknown_offer" }, { status: 400 });
  }

  const origin = (
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin
  ).replace(/\/$/, "");

  try {
    const session = await createStripeCheckoutSession({
      secretKey: cfg.secretKey,
      offer,
      userId: user.id,
      email: user.email,
      customerId: user.stripeCustomerId,
      successUrl: `${origin}/upgrade?checkout=success`,
      cancelUrl: `${origin}/upgrade?checkout=cancel`,
    });
    return NextResponse.json({ url: session.url, id: session.id });
  } catch {
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
}
