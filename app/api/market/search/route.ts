import { NextRequest, NextResponse } from "next/server";
import { searchMarket } from "@/lib/market/providers";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  if (q.length > 40) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  try {
    const results = await searchMarket(q);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Market search unavailable" },
      { status: 502 }
    );
  }
}