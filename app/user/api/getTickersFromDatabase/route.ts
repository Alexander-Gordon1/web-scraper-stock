import { NextResponse } from "next/server";
import { brainApi } from "@/app/user/lib/brainApi";

// returns the newest quote for each ticker in { tickers: [...] }
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tickers: unknown = body?.tickers;

  if (!Array.isArray(tickers) || tickers.length === 0 || !tickers.every((t) => typeof t === "string")) {
    return NextResponse.json({ error: "Request body must include a non-empty array of ticker strings" }, { status: 400 });
  }

  const symbols = tickers.map((t) => encodeURIComponent(t.toUpperCase())).join(",");
  const { status, data } = await brainApi(`/stocks/latest?symbols=${symbols}`);
  return NextResponse.json(data, { status });
}
