import { NextRequest, NextResponse } from "next/server";
import { billingConfig, billingConfigMatched } from "@/lib/billing/config";
import { commandFromStripeEvent } from "@/lib/billing/events";
import { persistBillingCommand } from "@/lib/billing/persist";
import { verifyStripeSignature } from "@/lib/billing/signature";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "fra1";

export async function POST(request: NextRequest) {
  const cfg = billingConfig();
  if (!cfg.enabled) {
    return NextResponse.json(
      { error: "billing_disabled", reason: cfg.reason, enabled: false },
      { status: 503 }
    );
  }
  if (!cfg.webhookSecret) {
    return NextResponse.json(
      { error: "webhook_unconfigured", enabled: true },
      { status: 503 }
    );
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeSignature(payload, signature, cfg.webhookSecret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let event: unknown;
  try {
    event = JSON.parse(payload) as unknown;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const matched = await billingConfigMatched();
  const command = commandFromStripeEvent(
    event as { id?: unknown; type?: unknown; data?: { object?: Record<string, unknown> } },
    matched.offers
  );

  try {
    const result = await persistBillingCommand(command);
    return NextResponse.json({
      received: true,
      applied: result.applied,
      duplicate: result.duplicate,
      ignored: command.action === "ignore" ? command.reason : null,
    });
  } catch {
    return NextResponse.json({ error: "persist_failed" }, { status: 500 });
  }
}
