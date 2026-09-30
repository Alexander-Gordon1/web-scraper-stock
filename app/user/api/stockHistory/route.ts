import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TICKER_OPTIONS } from "@/app/user/lib/tickers";
import { TIME_RANGES, isTimeRange } from "@/app/user/lib/timeRanges";

const PAGE_SIZE = 1000; // supabase returns at most 1000 rows per request

// quote_time is stored as a UTC timestamp without a timezone, e.g. "2026-09-01T13:30:00"
const toDbTime = (d: Date) => d.toISOString().slice(0, 19);

// returns prices for a symbol over a time range, oldest first.
// without `start`, shows the most recent range (e.g. the past month).
// with `start`, shows the range counting forward from it (e.g. 1 Sep to 1 Oct).
// e.g. GET /user/api/stockHistory?symbol=AAPL&range=1M&start=2026-08-31T23:00:00.000Z
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.Supabase_URL;
  const supabaseSecret = process.env.Supabase_secret;

  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 });
  }

  const params = request.nextUrl.searchParams;
  const symbol = params.get("symbol")?.toUpperCase() ?? "";
  if (!TICKER_OPTIONS.includes(symbol)) {
    return NextResponse.json({ error: "Unknown symbol" }, { status: 400 });
  }

  const range = params.get("range") ?? "1D";
  if (!isTimeRange(range)) {
    return NextResponse.json({ error: "Unknown range" }, { status: 400 });
  }

  const { days, bucketMinutes } = TIME_RANGES[range];

  // optional start of the window, and where it ends (start + the range; 1D = one day)
  const startParam = params.get("start");
  const start = startParam ? new Date(startParam) : null;
  if (start && isNaN(start.getTime())) {
    return NextResponse.json({ error: "start must be a valid date" }, { status: 400 });
  }
  const until = start ? new Date(start.getTime() + (days ?? 1) * 86400000) : null;

  const supabase = createClient(supabaseUrl, supabaseSecret);

  // 1. find the most recent quote (before the window ends, if there's a start date).
  // without a start date, every range is measured back from it
  let latestQuery = supabase
    .from("stocks")
    .select("quote_time, prev_close")
    .eq("symbol", symbol);
  if (until) latestQuery = latestQuery.lt("quote_time", toDbTime(until));

  const { data: latest, error: latestError } = await latestQuery
    .order("quote_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    console.error("Supabase stocks fetch error:", latestError);
    return NextResponse.json({ error: "Failed to fetch stock history", details: latestError.message }, { status: 500 });
  }

  if (!latest) {
    return NextResponse.json({ symbol, range, prevClose: null, points: [] });
  }

  // 2a. longer ranges: let the database squash the rows into one point per bucket
  // (needs the stock_history function from supabase/stock_history.sql)
  if (days !== null && bucketMinutes !== null) {
    const since = start
      ? toDbTime(start)
      : toDbTime(new Date(Date.parse(`${latest.quote_time}Z`) - days * 86400000));

    let historyQuery = supabase.rpc("stock_history", {
      p_symbol: symbol,
      p_since: since,
      p_bucket_minutes: bucketMinutes,
    });
    if (until) historyQuery = historyQuery.lt("bucket", toDbTime(until));

    const { data, error } = await historyQuery;

    if (error) {
      console.error("Supabase stock_history error:", error);
      return NextResponse.json({ error: "Failed to fetch stock history", details: error.message }, { status: 500 });
    }

    const points = (data ?? []).map((row: { bucket: string; price: number }) => ({
      time: `${row.bucket}Z`,
      price: Number(row.price),
    }));

    return NextResponse.json({ symbol, range, prevClose: latest.prev_close, points });
  }

  // 2b. 1D: every quote from the start day, or the latest trading day.
  // quote_time is stored in UTC, so the latest trading day starts at midnight UTC of that date
  const dayStart = start ? toDbTime(start) : `${latest.quote_time.slice(0, 10)}T00:00:00`;

  const rows: { quote_time: string; current_price: number }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let dayQuery = supabase
      .from("stocks")
      .select("quote_time, current_price")
      .eq("symbol", symbol)
      .gte("quote_time", dayStart);
    if (until) dayQuery = dayQuery.lt("quote_time", toDbTime(until));

    const { data, error } = await dayQuery
      .order("quote_time", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Supabase stocks fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch stock history", details: error.message }, { status: 500 });
    }

    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  // the cron job re-saves the same quote every minute while the market is closed,
  // so keep one point per quote_time
  const seen = new Set<string>();
  const points = rows
    .filter((row) => {
      if (seen.has(row.quote_time)) return false;
      seen.add(row.quote_time);
      return true;
    })
    .map((row) => ({ time: `${row.quote_time}Z`, price: Number(row.current_price) }));

  return NextResponse.json({ symbol, range, prevClose: latest.prev_close, points });
}
