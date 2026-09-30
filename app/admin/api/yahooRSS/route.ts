// app/admin/api/yahooRSS/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Parser from "rss-parser";
import { createHash, randomUUID } from "crypto";
import { checkCronAuth } from "@/app/lib/cronAuth";
import { MARKET_NEWS_SYMBOL, TICKER_OPTIONS, yahooFeedUrl } from "@/app/user/lib/tickers";

// fetching 22 feeds can take a while
export const maxDuration = 60;

const parser = new Parser({ timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });

// one feed per stock, plus one for general market news
const FEED_SYMBOLS = [...TICKER_OPTIONS, MARKET_NEWS_SYMBOL];
const CONCURRENCY = 4; // feeds fetched at once, to go easy on Yahoo

type Feed = { id: string; symbol: string; url: string };
type FeedResult = { symbol: string; status: "unchanged" | "updated" | "error"; newArticles?: number; error?: string };

// kept in memory between calls (while the server stays warm), filled from the rss table when empty:
// the feeds to fetch, and each feed's hash from its last run (to spot when nothing has changed)
let feeds: Feed[] = [];
const feedHashes = new Map<string, string | null>(); // rss id -> hash

function computeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

// fills `feeds` and `feedHashes` from the rss table, first creating a row
// (with its Yahoo url) for any stock that doesn't have one yet
async function loadFeeds(supabase: SupabaseClient) {
  const { data: existing, error } = await supabase.from("rss").select("symbol").not("symbol", "is", null);
  if (error) throw new Error(`Failed to read rss feeds: ${error.message}`);

  const have = new Set((existing ?? []).map((row) => row.symbol));
  const missing = FEED_SYMBOLS.filter((symbol) => !have.has(symbol));

  if (missing.length > 0) {
    const { error: insertError } = await supabase.from("rss").upsert(
      missing.map((symbol) => ({
        id: randomUUID(),
        symbol,
        rssURL: yahooFeedUrl(symbol),
        source_name: "Yahoo Finance",
        event_type: symbol === MARKET_NEWS_SYMBOL ? "market_news" : "ticker_news",
        is_active: true,
      })),
      { onConflict: "symbol", ignoreDuplicates: true }
    );
    if (insertError) throw new Error(`Failed to create rss feeds: ${insertError.message}`);
    console.log(`Created rss feeds for: ${missing.join(", ")}`);
  }

  // only active feeds for the stocks we track (feeds can be paused with is_active)
  const { data, error: loadError } = await supabase
    .from("rss")
    .select("id, symbol, rssURL, feedHashed")
    .in("symbol", FEED_SYMBOLS)
    .eq("is_active", true);
  if (loadError) throw new Error(`Failed to read rss feeds: ${loadError.message}`);

  feeds = (data ?? []).map((row) => ({ id: row.id, symbol: row.symbol, url: row.rssURL }));
  feedHashes.clear();
  for (const row of data ?? []) feedHashes.set(row.id, row.feedHashed);
}

// fetches one feed and stores any articles we don't have yet, linked to this feed
async function ingestFeed(supabase: SupabaseClient, feed: Feed): Promise<FeedResult> {
  const parsed = await parser.parseURL(feed.url);
  const items = parsed.items.filter((item) => item.title && item.link);

  // same articles as last time -> nothing to do
  const hash = computeHash(JSON.stringify(items.map((item) => item.guid ?? item.link)));
  if (feedHashes.get(feed.id) === hash) return { symbol: feed.symbol, status: "unchanged" };

  // hash by guid (or link), so the same article from two feeds is stored once
  const rows = items.map((item) => ({
    rss_id: feed.id, // the feed it was first seen in
    title: item.title!,
    link: item.link!,
    pub_date: item.isoDate ?? item.pubDate ?? null,
    guid: item.guid ?? item.link!,
    content_hash: computeHash(item.guid ?? item.link!),
    raw_payload: item,
  }));

  let newArticles = 0;
  if (rows.length > 0) {
    // insert the new ones; articles we already have are skipped
    const { data: inserted, error: insertError } = await supabase
      .from("rss_articles")
      .upsert(rows, { onConflict: "content_hash", ignoreDuplicates: true })
      .select("id");
    if (insertError) throw new Error(`Failed to store articles: ${insertError.message}`);
    newArticles = inserted?.length ?? 0;

    // link every article in the feed (new or already stored) to this feed
    const { data: articles, error: idError } = await supabase
      .from("rss_articles")
      .select("id")
      .in("content_hash", rows.map((row) => row.content_hash));
    if (idError) throw new Error(`Failed to look up articles: ${idError.message}`);

    const { error: linkError } = await supabase.from("rss_article_feeds").upsert(
      (articles ?? []).map((article) => ({ article_id: article.id, rss_id: feed.id })),
      { onConflict: "article_id,rss_id", ignoreDuplicates: true }
    );
    if (linkError) throw new Error(`Failed to link articles to feed: ${linkError.message}`);
  }

  // remember this run, so an unchanged feed is skipped next time
  const dates = rows.map((row) => Date.parse(row.pub_date ?? "")).filter((t) => !isNaN(t));
  const { error: updateError } = await supabase
    .from("rss")
    .update({
      feedHashed: hash,
      ...(dates.length > 0 && { latestItem: new Date(Math.max(...dates)).toISOString() }),
    })
    .eq("id", feed.id);
  if (updateError) throw new Error(`Failed to update feed tracking: ${updateError.message}`);

  feedHashes.set(feed.id, hash);
  return { symbol: feed.symbol, status: "updated", newArticles };
}

// called by the cron job every 10-15 minutes
export async function GET(req: NextRequest) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;

  const supabaseURL = process.env.Supabase_URL;
  const supabaseKEY = process.env.Supabase_secret;
  if (!supabaseURL || !supabaseKEY) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 });
  }
  const supabase = createClient(supabaseURL, supabaseKEY);

  // fill the feed list (and hashes) from the database if this is a fresh start
  if (feeds.length === 0) {
    try {
      await loadFeeds(supabase);
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load feeds" }, { status: 500 });
    }
  }

  // a few feeds at a time; one feed failing doesn't stop the others
  const results: FeedResult[] = [];
  for (let i = 0; i < feeds.length; i += CONCURRENCY) {
    const batch = feeds.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((feed) => ingestFeed(supabase, feed)));
    settled.forEach((result, j) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        const error = result.reason instanceof Error ? result.reason.message : String(result.reason);
        console.error(`Yahoo feed ${batch[j].symbol} failed:`, error);
        results.push({ symbol: batch[j].symbol, status: "error", error });
      }
    });
  }

  return NextResponse.json({
    feeds: results.length,
    updated: results.filter((r) => r.status === "updated").length,
    unchanged: results.filter((r) => r.status === "unchanged").length,
    errors: results.filter((r) => r.status === "error").length,
    newArticles: results.reduce((sum, r) => sum + (r.newArticles ?? 0), 0),
    results,
  });
}
