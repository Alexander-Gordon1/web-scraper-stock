import "server-only";

// calls the stock API on the Pi (through the Cloudflare tunnel) and returns its JSON body and status code unchanged.
// needs BRAIN_API_URL, BRAIN_API_KEY, CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET. server-side only
export async function brainApi(path: string, init: { method?: string; body?: unknown } = {}) {
  const baseUrl = process.env.BRAIN_API_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    console.error("BRAIN_API_URL env variable is not set");
    return { status: 500, data: { error: "Stock API not configured on the server" } };
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method: init.method ?? "GET",
      cache: "no-store",
      headers: {
        "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID ?? "",
        "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET ?? "",
        Authorization: `Bearer ${process.env.BRAIN_API_KEY ?? ""}`,
        ...(init.body !== undefined && { "Content-Type": "application/json" }),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch (e) {
    // the Pi or the tunnel is down
    console.error(`Stock API request to ${path} failed:`, e);
    return { status: 502, data: { error: "Couldn't reach the stock API" } };
  }

  // a 403 from Cloudflare is an HTML page, not JSON
  const data = await res.json().catch(() => {
    console.error(`Stock API ${path} returned ${res.status} with a non-JSON body`);
    return { error: "Bad response from the API" };
  });
  return { status: res.status, data };
}

// the logged-in user's id, made safe to put in an API path
export function userPath(userId: string) {
  return `/users/${encodeURIComponent(userId)}`;
}
