import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_TICKERS, MAX_TICKERS, TICKER_OPTIONS } from "@/app/user/lib/tickers";

function getSupabase() {
  const supabaseUrl = process.env.Supabase_URL;
  const supabaseSecret = process.env.Supabase_secret;
  if (!supabaseUrl || !supabaseSecret) return null;
  return createClient(supabaseUrl, supabaseSecret);
}

// returns the user's tickers + the latest quote for each one
export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 });
  }

  const userId = (await cookies()).get("userId")?.value;

  // 1. get the logged-in user's tickers from the tickerBar table
  let symbols: string[] = [];
  if (userId) {
    const { data, error } = await supabase
      .from("tickerBar")
      .select("ticker")
      .eq("userid", userId);

    if (error) {
      console.error("Supabase tickerBar fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch ticker bar", details: error.message }, { status: 500 });
    }

    // the ticker column holds a comma-separated list, e.g. "AMZN,GOOGL,KRG"
    const parsed = (data ?? []).flatMap((row) =>
      (row.ticker ?? "")
        .split(",")
        .map((t: string) => t.trim().toUpperCase())
        .filter((t: string) => t.length > 0)
    );
    symbols = [...new Set(parsed)];
  }

  const usingDefaults = symbols.length === 0;
  if (usingDefaults) symbols = DEFAULT_TICKERS;

  // 2. get the most recent quote for each ticker from the stocks table.
  // one small query per symbol (limit 1) so we never pull the whole price history.
  const results = await Promise.all(
    symbols.map((symbol) =>
      supabase
        .from("stocks")
        .select("symbol, current_price, change, percent_change, quote_time")
        .eq("symbol", symbol)
        .order("quote_time", { ascending: false })
        .limit(1)
        .maybeSingle()
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("Supabase stocks fetch error:", failed.error);
    return NextResponse.json({ error: "Failed to fetch stock quotes", details: failed.error.message }, { status: 500 });
  }

  const quotes = results.map((r) => r.data).filter((q) => q !== null);
  const missing = symbols.filter((s) => !quotes.some((q) => q.symbol === s));

  return NextResponse.json({
    loggedIn: Boolean(userId),
    usingDefaults,
    symbols,
    options: TICKER_OPTIONS,
    missing,
    quotes,
  });
}

// saves the user's tickers as one comma-separated row, e.g. "AMZN,GOOGL,KRG"
export async function PUT(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 });
  }

  const userId = (await cookies()).get("userId")?.value;
  if (!userId) {
    return NextResponse.json({ error: "You need to be logged in to edit the ticker bar" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const tickers: unknown = body?.tickers;

  if (!Array.isArray(tickers) || !tickers.every((t) => typeof t === "string")) {
    return NextResponse.json({ error: "Request body must include an array of ticker strings" }, { status: 400 });
  }

  const symbols = [...new Set(tickers.map((t) => t.trim().toUpperCase()))].filter(
    (t) => TICKER_OPTIONS.includes(t)
  );

  if (symbols.length > MAX_TICKERS) {
    return NextResponse.json({ error: `The ticker bar can only hold ${MAX_TICKERS} tickers` }, { status: 400 });
  }

  const ticker = symbols.join(",");

  const { data: rows, error: fetchError } = await supabase
    .from("tickerBar")
    .select("id")
    .eq("userid", userId);

  if (fetchError) {
    console.error("Supabase tickerBar fetch error:", fetchError);
    return NextResponse.json({ error: "Failed to save ticker bar", details: fetchError.message }, { status: 500 });
  }

  // keep a single row per user: update the first one, remove any extras
  const [first, ...extras] = rows ?? [];
  const { error: saveError } = first
    ? await supabase.from("tickerBar").update({ ticker }).eq("id", first.id)
    : await supabase.from("tickerBar").insert({ id: crypto.randomUUID(), userid: userId, ticker });

  if (saveError) {
    console.error("Supabase tickerBar save error:", saveError);
    return NextResponse.json({ error: "Failed to save ticker bar", details: saveError.message }, { status: 500 });
  }

  if (extras.length > 0) {
    await supabase.from("tickerBar").delete().in("id", extras.map((r) => r.id));
  }

  return NextResponse.json({ symbols });
}
