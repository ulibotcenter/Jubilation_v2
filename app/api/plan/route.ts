import { NextRequest, NextResponse } from "next/server";
import { allowRequest, rateLimitKey } from "@/lib/api/rateLimit";
import { getRetirementPlan, upsertRetirementPlan } from "@/lib/cloud/db";
import { isAuthUser, requireUser } from "@/lib/cloud/http";
import { canSaveFullPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!isAuthUser(user)) return user;
  const row = await getRetirementPlan(user.id);
  if (!row) {
    return NextResponse.json({ document: null, updatedAt: null });
  }
  return NextResponse.json({
    document: row.document,
    updatedAt: row.updatedAt,
  });
}

export async function PUT(request: NextRequest) {
  if (!allowRequest(rateLimitKey(request), 30)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const user = await requireUser(request);
  if (!isAuthUser(user)) return user;
  if (!canSaveFullPlan(user.planTier)) {
    return NextResponse.json({ error: "plan_requires_paid" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const saved = await upsertRetirementPlan(user.id, body);
  if (!saved) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }
  return NextResponse.json({ updatedAt: saved.updatedAt });
}
