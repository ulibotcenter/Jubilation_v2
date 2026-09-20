import { NextResponse } from "next/server";
import { publicCloudStatus } from "@/lib/cloud/config";

export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET() {
  return NextResponse.json(publicCloudStatus());
}
