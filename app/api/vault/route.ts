import { NextRequest, NextResponse } from "next/server";
import { parseBackupEnvelope } from "@/lib/backup";
import { getVaultEnvelope, upsertVaultEnvelope } from "@/lib/cloud/db";
import { isAuthUser, requireUser } from "@/lib/cloud/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!isAuthUser(user)) return user;
  const row = await getVaultEnvelope(user.id);
  if (!row) {
    return NextResponse.json({ envelope: null, updatedAt: null });
  }
  return NextResponse.json({
    envelope: row.envelope,
    schemaVersion: row.schemaVersion,
    dataRegion: row.dataRegion,
    updatedAt: row.updatedAt,
  });
}

export async function PUT(request: NextRequest) {
  const user = await requireUser(request);
  if (!isAuthUser(user)) return user;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  let envelope;
  try {
    envelope = parseBackupEnvelope(body);
  } catch {
    return NextResponse.json(
      { error: "plaintext_rejected" },
      { status: 400 }
    );
  }
  const saved = await upsertVaultEnvelope({
    userId: user.id,
    envelope,
    schemaVersion: envelope.persistVersion,
    dataRegion: user.dataRegion || "eu",
  });
  return NextResponse.json({
    updatedAt: saved.updatedAt,
    dataRegion: user.dataRegion || "eu",
  });
}
