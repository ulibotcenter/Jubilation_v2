import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, deleteSession } from "@/lib/cloud/db";
import {
  clearSession,
  cloudDisabledResponse,
  requireCloudConfig,
} from "@/lib/cloud/http";

export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function POST(request: NextRequest) {
  if (!requireCloudConfig()) return cloudDisabledResponse();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  await deleteSession(token);
  return clearSession(NextResponse.json({ ok: true }));
}
