import { NextResponse } from "next/server";
import { publicCloudStatus } from "@/lib/cloud/config";
import { preferredRegion } from "@/lib/region";

export const dynamic = "force-dynamic";
export { preferredRegion };

export async function GET() {
  return NextResponse.json(publicCloudStatus());
}
