import { NextRequest, NextResponse } from "next/server";
import { allowRequest, rateLimitKey } from "@/lib/api/rateLimit";
import { billingConfig } from "@/lib/billing/config";
import { isAuthUser, requireUser } from "@/lib/cloud/http";
import { fetchB3Canonical } from "@/lib/connectors/b3/client";
import { canUseConnectors } from "@/lib/plans";
import {
  b3QuotaSubject,
  consumeB3QuerySlot,
  rememberB3Query,
} from "@/lib/connectors/b3/quota";
import { isConnectorEnabled, isLiveB3Mode } from "@/lib/connectors/flags";

export const dynamic = "force-dynamic";

function snapshotBody(snapshot: Awaited<ReturnType<typeof fetchB3Canonical>>) {
  return {
    mode: snapshot.health.mode,
    live: isLiveB3Mode(snapshot.health.mode),
    status: snapshot.health.status,
    lastSuccessAt: snapshot.health.lastSuccessAt,
    asOf: snapshot.health.asOf,
    partial: snapshot.health.partial,
    rawHash: snapshot.raw.hash,
    lastError: snapshot.health.lastError,
    staleness: snapshot.health.staleness,
    institutions: snapshot.institutions,
    accounts: snapshot.accounts,
    holdings: snapshot.holdings,
    cashFlows: snapshot.cashFlows,
    cached: false as boolean,
  };
}

export async function POST(request: NextRequest) {
  if (!allowRequest(rateLimitKey(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!isConnectorEnabled("b3")) {
    return NextResponse.json({ error: "B3 connector disabled" }, { status: 404 });
  }

  const billing = billingConfig();
  const user = await requireUser(request);
  if (!isAuthUser(user)) return user;
  if (!billing.enabled || !canUseConnectors(user.planTier)) {
    return NextResponse.json(
      { error: "plan_required", connectors: false },
      { status: 403 }
    );
  }

  const subject = b3QuotaSubject();
  const slot = consumeB3QuerySlot({ subject });
  if (slot.blocked) {
    if (slot.cached?.body && typeof slot.cached.body === "object") {
      return NextResponse.json({
        ...(slot.cached.body as Record<string, unknown>),
        cached: true,
        alreadyUpdatedToday: true,
      });
    }
    return NextResponse.json(
      { error: "already_updated_today", alreadyUpdatedToday: true },
      { status: 409 }
    );
  }

  try {
    await request.json().catch(() => ({}));
    const snapshot = await fetchB3Canonical();
    const body = snapshotBody(snapshot);
    rememberB3Query({ subject, body });
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: "B3 sync failed" }, { status: 502 });
  }
}
