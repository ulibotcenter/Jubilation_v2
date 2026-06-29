import { NextRequest, NextResponse } from "next/server";
import { fetchMarketQuotes } from "@/lib/market/providers";
import type { QuoteRequestItem } from "@/lib/market/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { assets?: QuoteRequestItem[] };
    const assets = body.assets ?? [];

    if (assets.length === 0) {
      return NextResponse.json({ quotes: [] });
    }

    if (assets.length > 50) {
      return NextResponse.json({ error: "Too many symbols" }, { status: 400 });
    }

    const quotes = await fetchMarketQuotes(assets);
    return NextResponse.json({ quotes, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { error: "Quote fetch failed" },
      { status: 502 }
    );
  }
}