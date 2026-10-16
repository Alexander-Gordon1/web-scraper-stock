import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// returns every stock purchase and sale the logged-in user has made, newest first
export async function GET() {
  const supabaseUrl = process.env.Supabase_URL;
  const supabaseSecret = process.env.Supabase_secret;
  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 });
  }

  const userId = (await cookies()).get("userId")?.value;
  if (!userId) {
    return NextResponse.json({ error: "You need to be logged in to view your investments" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseSecret);

  const [purchases, sales] = await Promise.all([
    supabase
      .from("stock_purchases")
      .select("id, symbol, quantity, price_per_share, purchased_at")
      .eq("user_id", userId)
      .order("purchased_at", { ascending: false }),
    supabase
      .from("stock_sales")
      .select("id, symbol, quantity, price_per_share, sold_at")
      .eq("user_id", userId)
      .order("sold_at", { ascending: false }),
  ]);

  const error = purchases.error ?? sales.error;
  if (error) {
    console.error("Supabase investments fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch investments", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ purchases: purchases.data, sales: sales.data });
}
