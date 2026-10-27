import { NextRequest, NextResponse } from "next/server";
import { brainApi } from "@/app/user/lib/brainApi";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const { status, data } = await brainApi("/users/login", { method: "POST", body });

  if (status !== 200 || typeof data?.userId !== "string") {
    return NextResponse.json(data, { status: status === 200 ? 500 : status });
  }

  // the browser doesn't need the id, it only gets it as an httpOnly cookie
  const { userId, ...rest } = data;
  const response = NextResponse.json(rest, { status: 200 });

  // remember who is logged in so other routes (e.g. the ticker bar) can look up their data
  response.cookies.set("userId", userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return response;
}
