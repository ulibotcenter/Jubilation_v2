import { NextResponse } from "next/server";
import { publicBillingStatus } from "@/lib/billing/config";

export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET() {
  return NextResponse.json(await publicBillingStatus());
}
