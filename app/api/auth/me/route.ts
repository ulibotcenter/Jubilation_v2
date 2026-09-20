import { NextRequest, NextResponse } from "next/server";
import { isAuthUser, publicAuthUser, requireUser } from "@/lib/cloud/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!isAuthUser(user)) return user;
  return NextResponse.json(publicAuthUser(user));
}
