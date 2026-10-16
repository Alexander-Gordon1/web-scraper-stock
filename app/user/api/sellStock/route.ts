import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { TICKER_OPTIONS } from "@/app/user/lib/tickers";

// errors raised by the sell_stock function (supabase/stock_sales.sql)
const SALE_ERRORS: Record<string, string> = {
  NO_ACCOUNT: "You need a bank account to receive the money from a sale",
  INSUFFICIENT_SHARES: "You don't own that many shares",
  INVALID_ORDER: "Invalid order",
};

// stock_sales.quantity is numeric(18, 6)
const SHARE_STEP = 1_000_000;
const MIN_ORDER = 0.01; // dollars, so a tiny order can't round down to nothing

// sells whole or fractional shares of a stock at its latest price from the stocks table
export async function POST(request: Request) {
  const supabaseUrl = process.env.Supabase_URL;
  const supabaseSecret = process.env.Supabase_secret;
  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 });
  }

  const userId = (await cookies()).get("userId")?.value;
  if (!userId) {
    return NextResponse.json({ error: "You need to be logged in to sell stocks" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const symbol = typeof body?.symbol === "string" ? body.symbol.toUpperCase() : "";
  const rawQuantity = body?.quantity;

  if (!TICKER_OPTIONS.includes(symbol)) {
    return NextResponse.json({ error: "Unknown stock" }, { status: 400 });
  }
  if (
    typeof rawQuantity !== "number" ||
    !Number.isFinite(rawQuantity) ||
    rawQuantity <= 0 ||
    Math.abs(rawQuantity * SHARE_STEP - Math.round(rawQuantity * SHARE_STEP)) > 1e-6
  ) {
    return NextResponse.json({ error: "Quantity must be above 0 with up to 6 decimal places" }, { status: 400 });
  }
  const quantity = Math.round(rawQuantity * SHARE_STEP) / SHARE_STEP;

  const supabase = createClient(supabaseUrl, supabaseSecret);

  // use the price from the database, never one sent by the browser
  const { data: quote, error: quoteError } = await supabase
    .from("stocks")
    .select("current_price")
    .eq("symbol", symbol)
    .order("quote_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (quoteError || !quote) {
    console.error("Supabase stocks fetch error:", quoteError);
    return NextResponse.json({ error: "Couldn't get a price for this stock" }, { status: 500 });
  }

  const price = Number(quote.current_price);
  const total = Math.round(quantity * price * 100) / 100;
  if (total < MIN_ORDER) {
    return NextResponse.json({ error: `The smallest order is $${MIN_ORDER.toFixed(2)}` }, { status: 400 });
  }

  // checks the shares, pays the money in and records the sale in one transaction
  const { data, error } = await supabase
    .rpc("sell_stock", { p_user_id: userId, p_symbol: symbol, p_quantity: quantity, p_price: price })
    .single<{ sale_id: string; new_balance: number | string; shares_left: number | string }>();

  if (error) {
    const known = Object.keys(SALE_ERRORS).find((code) => error.message.includes(code));
    if (known) {
      return NextResponse.json({ error: SALE_ERRORS[known] }, { status: 400 });
    }
    console.error("Supabase sell_stock error:", error);
    return NextResponse.json({ error: "Failed to sell stock", details: error.message }, { status: 500 });
  }

  return NextResponse.json({
    saleId: data.sale_id,
    symbol,
    quantity,
    pricePerShare: price,
    total,
    balance: Number(data.new_balance),
    sharesLeft: Number(data.shares_left),
  });
}
