import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { brainApi, userPath } from "@/app/lib/brainApi";

// buys whole or fractional shares of a stock at its latest price (the Pi checks the order and the balance)
export async function POST(request: Request) {
  const userId = (await cookies()).get("userId")?.value;
  if (!userId) {
    return NextResponse.json({ error: "You need to be logged in to buy stocks" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { status, data } = await brainApi(`${userPath(userId)}/buy`, { method: "POST", body });
  return NextResponse.json(data, { status });
}
