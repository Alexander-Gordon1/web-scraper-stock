import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

// checks a cron job's Authorization header against the CronJob env variable.
// returns an error response to send back, or null if the request is allowed.
// the token is accepted on its own or as "Bearer <token>", ignoring surrounding spaces.
export function checkCronAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.CronJob?.trim();

  if (!expected) {
    console.error("CronJob env variable is not set, so cron requests can't be checked");
    return NextResponse.json({ error: "Cron token not configured on the server" }, { status: 500 });
  }

  const header = req.headers.get("Authorization")?.trim() ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();

  // compare in constant time so the token can't be guessed from response timings
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized access to endpoint" }, { status: 401 });
  }

  return null;
}
