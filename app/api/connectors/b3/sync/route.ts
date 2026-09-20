import { NextRequest, NextResponse } from "next/server";
import { allowRequest, rateLimitKey } from "@/lib/api/rateLimit";
import { fetchB3Canonical } from "@/lib/connectors/b3/client";
import { isConnectorEnabled, isLiveB3Mode } from "@/lib/connectors/flags";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!allowRequest(rateLimitKey(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!isConnectorEnabled("b3")) {
    return NextResponse.json({ error: "B3 connector disabled" }, { status: 404 });
  }

  try {
    await request.json().catch(() => ({}));
    const snapshot = await fetchB3Canonical();
    return NextResponse.json({
      mode: snapshot.health.mode,
      live: isLiveB3Mode(snapshot.health.mode),
      asOf: snapshot.health.asOf,
      partial: snapshot.health.partial,
      rawHash: snapshot.raw.hash,
      lastError: snapshot.health.lastError,
      staleness: snapshot.health.staleness,
      institutions: snapshot.institutions,
      accounts: snapshot.accounts,
      holdings: snapshot.holdings,
      cashFlows: snapshot.cashFlows,
    });
  } catch {
    return NextResponse.json({ error: "B3 sync failed" }, { status: 502 });
  }
}
