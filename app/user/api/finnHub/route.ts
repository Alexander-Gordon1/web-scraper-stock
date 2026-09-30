import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { TICKER_OPTIONS as tickers } from "@/app/user/lib/tickers";
import { checkCronAuth } from "@/app/lib/cronAuth";

type FinnhubQuote = {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
};

export async function GET(req: NextRequest) {
  const apiKey = process.env.FinnHubApiKey!;
  const supabaseUrl = process.env.Supabase_URL!;
  const supabaseSecret = process.env.Supabase_secret!;

  // auth check for cron bot calls every 5 mins
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;

  
  
  const supabase = createClient(supabaseUrl, supabaseSecret);

  const quotes = await Promise.all(
    tickers.map(async (symbol) => {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        console.error(`Finnhub error for ${symbol}: ${res.status} — ${bodyText.slice(0, 200)}`);
        return { symbol, error: `Finnhub request failed: ${res.status}` };
      }

      let data: Partial<FinnhubQuote>;
      try {
        data = (await res.json()) as Partial<FinnhubQuote>;
      } catch {
        return { symbol, error: "Finnhub returned non-JSON response" };
      }


      if (typeof data.c !== "number" || Number.isNaN(data.c) || typeof data.t !== "number" || data.t <= 0) {
        return { symbol, error: "Invalid quote payload" };
      }

      const quoteTime = new Date(data.t * 1000).toISOString();

      return {
        symbol,
        current_price: data.c,
        change: typeof data.d === "number" ? data.d : null,
        percent_change: typeof data.dp === "number" ? data.dp : null,
        high: typeof data.h === "number" ? data.h : null,
        low: typeof data.l === "number" ? data.l : null,
        open: typeof data.o === "number" ? data.o : null,
        prev_close: typeof data.pc === "number" ? data.pc : null,
        quote_time: quoteTime,
      };
    })
  );

  const validRows = quotes.filter((q) => !("error" in q));
  const failed = quotes.filter((q) => "error" in q);

  if (validRows.length === 0) {
    return NextResponse.json(
      {
        error: "No valid quotes were returned from Finnhub",
        failed,
      },
      { status: 502 }
    );
  }

  const { error: insertError } = await supabase
    .from("stocks")
    .insert(validRows);

  if (insertError) {
    console.error("Supabase insert error:", insertError);
    return NextResponse.json(
      {
        error: "Failed to insert stock quotes",
        details: insertError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    fetched: tickers.length,
    insertedOrExisting: validRows.length,
    failedCount: failed.length,
    failed,
    quotes: validRows,
  });
}