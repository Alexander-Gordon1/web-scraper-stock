import { NextRequest, NextResponse } from "next/server";
import { brainApi } from "@/app/user/lib/brainApi";

// returns the news published between `from` and `to` (at most 2 days apart), split into
// articles about the symbol and general market news.
// e.g. GET /user/api/news?symbol=AAPL&from=2026-09-22T23:00:00Z&to=2026-09-23T23:00:00Z
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = new URLSearchParams({
    symbol: params.get("symbol") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
  });

  const { status, data } = await brainApi(`/news?${query}`);
  return NextResponse.json(data, { status });
}
