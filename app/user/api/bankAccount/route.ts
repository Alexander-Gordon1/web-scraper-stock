import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { brainApi, userPath } from "@/app/user/lib/brainApi";

// returns the logged-in user's bank account (null if they don't have one yet)
export async function GET() {
  const userId = (await cookies()).get("userId")?.value;
  if (!userId) {
    return NextResponse.json({ error: "You need to be logged in to view your bank account" }, { status: 401 });
  }

  const { status, data } = await brainApi(`${userPath(userId)}/bank-account`);
  return NextResponse.json(data, { status });
}

// saves the user's bank details, opening an account (with the default starting balance) if they don't have one
export async function PUT(request: Request) {
  const userId = (await cookies()).get("userId")?.value;
  if (!userId) {
    return NextResponse.json({ error: "You need to be logged in to edit your bank account" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { status, data } = await brainApi(`${userPath(userId)}/bank-account`, { method: "PUT", body });
  return NextResponse.json(data, { status });
}
