import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// returns the logged-in user's bank account (null if they don't have one yet)
export async function GET() {
  const supabaseUrl = process.env.Supabase_URL;
  const supabaseSecret = process.env.Supabase_secret;
  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 });
  }

  const userId = (await cookies()).get("userId")?.value;
  if (!userId) {
    return NextResponse.json({ error: "You need to be logged in to view your bank account" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseSecret);

  const { data, error } = await supabase
    .from("bank_accounts")
    .select("bank_name, account_number, balance, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Supabase bank_accounts fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch bank account", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ account: data });
}

// saves the user's bank details, opening an account (with the default starting balance) if they don't have one
export async function PUT(request: Request) {
  const supabaseUrl = process.env.Supabase_URL;
  const supabaseSecret = process.env.Supabase_secret;
  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 });
  }

  const userId = (await cookies()).get("userId")?.value;
  if (!userId) {
    return NextResponse.json({ error: "You need to be logged in to edit your bank account" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const bankName = typeof body?.bank_name === "string" ? body.bank_name.trim() : "";
  const accountNumber = typeof body?.account_number === "string" ? body.account_number.trim() : "";

  if (!bankName || bankName.length > 100) {
    return NextResponse.json({ error: "Bank name is required (100 characters max)" }, { status: 400 });
  }
  if (accountNumber.length > 34) {
    return NextResponse.json({ error: "Account number can be 34 characters max" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseSecret);

  // user_id is unique, so this updates their row if it exists and leaves the balance alone
  const { data, error } = await supabase
    .from("bank_accounts")
    .upsert(
      { user_id: userId, bank_name: bankName, account_number: accountNumber || null },
      { onConflict: "user_id" }
    )
    .select("bank_name, account_number, balance, created_at")
    .single();

  if (error) {
    console.error("Supabase bank_accounts save error:", error);
    return NextResponse.json({ error: "Failed to save bank account", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ account: data });
}
