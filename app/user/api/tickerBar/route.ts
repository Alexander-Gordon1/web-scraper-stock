import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { brainApi, userPath } from "@/app/lib/brainApi";

// returns the user's tickers (or the defaults when logged out) + the latest quote for each one
export async function GET() {
  const userId = (await cookies()).get("userId")?.value;

  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const { status, data } = await brainApi(`/ticker-bar${query}`);
  return NextResponse.json(data, { status });
}

// saves the user's tickers (unknown ones are dropped, 10 max)
export async function PUT(request: Request) {
  const userId = (await cookies()).get("userId")?.value;
  if (!userId) {
    return NextResponse.json({ error: "You need to be logged in to edit the ticker bar" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { status, data } = await brainApi(`${userPath(userId)}/ticker-bar`, { method: "PUT", body });
  return NextResponse.json(data, { status });
}
