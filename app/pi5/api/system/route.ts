import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { brainApi } from "@/app/lib/brainApi";

// health of the Pi 5 (temperatures, CPU, memory, disks, database, collectors, tunnel), for any logged-in user
export async function GET() {
  const userId = (await cookies()).get("userId")?.value;
  if (!userId) {
    return NextResponse.json({ error: "You need to be logged in to view the Pi" }, { status: 401 });
  }

  const { status, data } = await brainApi("/system");
  return NextResponse.json(data, { status });
}
