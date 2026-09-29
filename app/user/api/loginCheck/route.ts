import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {
  const supabaseURL = process.env.Supabase_URL!;
  const supabaseKEY = process.env.Supabase_secret!;

  const {username, password} = await request.json();

  //creating supabase client 
  const supabase = createClient(supabaseURL, supabaseKEY);  

  //query supabase
  const { data, error } = await supabase
    .from("users")
    .select("id, username, password")
    .eq("username", username)
    .eq("password", password)
    .single();


  if (error || !data) {
    return NextResponse.json(
      {Success: false, message: "invalid Username or Password"},
      {status : 401}
    )
  }
  else {
    const response = NextResponse.json(
      {Success: true, message: "Login Successful"},
      {status : 200}
    )

    // remember who is logged in so other routes (e.g. the ticker bar) can look up their data
    response.cookies.set("userId", data.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return response;
  }

  

}