import { NextRequest, NextResponse } from "next/server";
import { brainApi } from "@/app/lib/brainApi";

// returns prices for a symbol over a time range, oldest first.
// without `start`, shows the most recent range (e.g. the past month).
// with `start`, shows the range counting forward from it (e.g. 1 Sep to 1 Oct).
// e.g. GET /user/api/stockHistory?symbol=AAPL&range=1M&start=2026-08-31T23:00:00.000Z
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const symbol = params.get("symbol")?.toUpperCase() ?? "";
  if (!symbol) {
    return NextResponse.json({ error: "Unknown symbol" }, { status: 400 });
  }

  const query = new URLSearchParams({ range: params.get("range") ?? "1D" });
  const start = params.get("start");
  if (start) query.set("start", start);

  const { status, data } = await brainApi(`/stocks/${encodeURIComponent(symbol)}/history?${query}`);
  return NextResponse.json(data, { status });
}
