import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { brainApi, userPath } from "@/app/user/lib/brainApi";

// returns every stock purchase and sale the logged-in user has made, newest first
export async function GET() {
  const userId = (await cookies()).get("userId")?.value;
  if (!userId) {
    return NextResponse.json({ error: "You need to be logged in to view your investments" }, { status: 401 });
  }

  const { status, data } = await brainApi(`${userPath(userId)}/investments`);
  return NextResponse.json(data, { status });
}
