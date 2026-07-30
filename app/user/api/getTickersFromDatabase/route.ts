import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const supabaseUrl = process.env.Supabase_URL;
  const supabaseSecret = process.env.Supabase_secret;

  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseSecret);

  const body = await request.json().catch(() => null);
  const tickers: unknown = body?.tickers;

  if (!Array.isArray(tickers) || tickers.length === 0 || !tickers.every((t) => typeof t === "string")) {
    return NextResponse.json({ error: "Request body must include a non-empty array of ticker strings" }, { status: 400 });
  }

  const symbols = tickers.map((t) => t.toUpperCase());

  // Fetch all matching rows, most recent first.
  // Pull more than one row per symbol so we can pick the latest per symbol in JS.
  const { data, error } = await supabase
    .from("stocks")
    .select("*")
    .in("symbol", symbols)
    .order("quote_time", { ascending: false });

  if (error) {
    console.error("Supabase fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch stock quotes", details: error.message }, { status: 500 });
  }

  // Since data is already ordered newest-first, the first time we see
  // a symbol is its most recent quote. Keep only that one per symbol.
  const latestBySymbol = new Map<string, (typeof data)[number]>();
  for (const row of data ?? []) {
    if (!latestBySymbol.has(row.symbol)) {
      latestBySymbol.set(row.symbol, row);
    }
  }

  const missing = symbols.filter((s) => !latestBySymbol.has(s));

  return NextResponse.json({
    requested: symbols.length,
    found: latestBySymbol.size,
    missing,
    quotes: Array.from(latestBySymbol.values()),
  });
}