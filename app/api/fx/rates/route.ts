import { NextResponse } from "next/server";
import type { Currency } from "@/types";
import type { FxSnapshot } from "@/lib/fx/types";
import { allowRequest, fetchWithTimeout, rateLimitKey } from "@/lib/api/rateLimit";

const SUPPORTED: Currency[] = ["USD", "BRL", "EUR"];
const CACHE_MS = 15 * 60 * 1000;

let cache: { snapshot: FxSnapshot; expiresAt: number } | null = null;

export async function GET(request: Request) {
  if (!allowRequest(rateLimitKey(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    if (cache && Date.now() < cache.expiresAt) {
      return NextResponse.json({ snapshot: cache.snapshot, cached: true });
    }

    const targets = SUPPORTED.filter((c) => c !== "USD").join(",");
    const res = await fetchWithTimeout(
      `https://api.frankfurter.app/latest?from=USD&to=${targets}`,
      { timeoutMs: 8000 }
    );

    if (!res.ok) {
      throw new Error(`Frankfurter API ${res.status}`);
    }

    const data = (await res.json()) as {
      base: string;
      date: string;
      rates: Record<string, number>;
    };

    const snapshot: FxSnapshot = {
      base: "USD",
      date: data.date,
      rates: {
        USD: 1,
        BRL: data.rates.BRL ?? 5.5,
        EUR: data.rates.EUR ?? 0.92,
      },
      fetchedAt: new Date().toISOString(),
    };

    cache = { snapshot, expiresAt: Date.now() + CACHE_MS };

    return NextResponse.json({ snapshot, cached: false });
  } catch (error) {
    const fallback: FxSnapshot = {
      base: "USD",
      date: new Date().toISOString().slice(0, 10),
      rates: { USD: 1, BRL: 5.45, EUR: 0.92 },
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json({
      snapshot: fallback,
      cached: false,
      fallback: true,
      error: error instanceof Error ? error.message : "FX fetch failed",
    });
  }
}