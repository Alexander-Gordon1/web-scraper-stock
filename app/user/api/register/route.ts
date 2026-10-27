import { NextRequest, NextResponse } from "next/server";
import { brainApi } from "@/app/user/lib/brainApi";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const { status, data } = await brainApi("/users/register", { method: "POST", body });
  return NextResponse.json(data, { status });
}
