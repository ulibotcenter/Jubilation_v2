import { NextResponse } from "next/server";
import { publicBillingStatus } from "@/lib/billing/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(publicBillingStatus());
}
