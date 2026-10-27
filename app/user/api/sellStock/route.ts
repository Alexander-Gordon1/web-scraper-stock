import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { brainApi, userPath } from "@/app/user/lib/brainApi";

// sells whole or fractional shares of a stock at its latest price (the Pi checks the order and the shares owned)
export async function POST(request: Request) {
  const userId = (await cookies()).get("userId")?.value;
  if (!userId) {
    return NextResponse.json({ error: "You need to be logged in to sell stocks" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { status, data } = await brainApi(`${userPath(userId)}/sell`, { method: "POST", body });
  return NextResponse.json(data, { status });
}
