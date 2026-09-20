import { NextResponse } from "next/server";
import { publicB3Status } from "@/lib/connectors/flags";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(publicB3Status());
}
