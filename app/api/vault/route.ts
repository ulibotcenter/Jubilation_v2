import { NextRequest, NextResponse } from "next/server";
import { parseBackupEnvelope } from "@/lib/backup";
import { getVaultEnvelope, upsertVaultEnvelope } from "@/lib/cloud/db";
import { isAuthUser, requireUser } from "@/lib/cloud/http";
import {
  DataRegionError,
  assertTenantMayPersistOnHost,
  parseDataRegion,
  regionPersistResponse,
} from "@/lib/region";

export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

function regionBlocked(err: unknown) {
  if (err instanceof DataRegionError) {
    return NextResponse.json(regionPersistResponse(err), { status: 409 });
  }
  throw err;
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!isAuthUser(user)) return user;
  try {
    assertTenantMayPersistOnHost({
      dataRegion: parseDataRegion(user.dataRegion),
    });
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
  } catch (err) {
    return regionBlocked(err);
  }
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
  try {
    const dataRegion = parseDataRegion(user.dataRegion);
    assertTenantMayPersistOnHost({ dataRegion });
    const saved = await upsertVaultEnvelope({
      userId: user.id,
      envelope,
      schemaVersion: envelope.persistVersion,
      dataRegion,
    });
    return NextResponse.json({
      updatedAt: saved.updatedAt,
      dataRegion,
    });
  } catch (err) {
    return regionBlocked(err);
  }
}
