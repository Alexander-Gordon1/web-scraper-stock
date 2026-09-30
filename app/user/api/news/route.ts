import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MARKET_NEWS_SYMBOL, TICKER_KEYWORDS, TICKER_OPTIONS } from "@/app/user/lib/tickers";

const MAX_MARKET_ARTICLES = 30;

type Article = { title: string; link: string; pub_date: string };

// an article plus the feeds it was found in (via the rss_article_feeds link table)
type ArticleRow = Article & {
  rss_article_feeds: { rss: { symbol: string | null } | null }[] | null;
};

// matches any of the ticker's names as a whole word, e.g. "Apple" but not "Pineapple"
function keywordPattern(symbol: string) {
  const escaped = TICKER_KEYWORDS[symbol].map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(?<![\\w])(${escaped.join("|")})(?![\\w])`);
}

// returns the news published between `from` and `to`, split into
// articles about the symbol and general market news.
//
// "about the symbol" = found in that stock's Yahoo feed, or (for older articles from before
// feeds were per-stock) mentioning the company by name.
// "market news" = found in the market feed (^GSPC), or older untagged articles.
// e.g. GET /user/api/news?symbol=AAPL&from=2026-09-22T23:00:00Z&to=2026-09-23T23:00:00Z
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.Supabase_URL;
  const supabaseSecret = process.env.Supabase_secret;

  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 });
  }

  const params = request.nextUrl.searchParams;
  const symbol = params.get("symbol")?.toUpperCase() ?? "";
  if (!TICKER_OPTIONS.includes(symbol)) {
    return NextResponse.json({ error: "Unknown symbol" }, { status: 400 });
  }

  const from = new Date(params.get("from") ?? "");
  const to = new Date(params.get("to") ?? "");
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from || to.getTime() - from.getTime() > 2 * 86400000) {
    return NextResponse.json({ error: "from and to must be valid dates at most 2 days apart" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseSecret);

  // a few hundred articles a day at most, so one page of 1000 covers it
  const { data, error } = await supabase
    .from("rss_articles")
    .select("title, link, pub_date, rss_article_feeds(rss(symbol))")
    .gte("pub_date", from.toISOString())
    .lt("pub_date", to.toISOString())
    .order("pub_date", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Supabase rss_articles fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch news", details: error.message }, { status: 500 });
  }

  // only real web links (the scraper stores "no link found" when an item has none), no duplicates
  const seen = new Set<string>();
  const articles = ((data ?? []) as unknown as ArticleRow[])
    .filter((a) => {
      if (!/^https?:\/\//.test(a.link) || seen.has(a.link)) return false;
      seen.add(a.link);
      return true;
    })
    .map(({ rss_article_feeds, ...a }) => ({
      ...a,
      // the stocks whose feeds this article appeared in, e.g. ["NVDA", "AMD"]
      tags: (rss_article_feeds ?? []).flatMap((f) => (f.rss?.symbol ? [f.rss.symbol] : [])),
    }));

  const pattern = keywordPattern(symbol);
  const isRelated = (a: (typeof articles)[number]) => a.tags.includes(symbol) || pattern.test(a.title);
  const isMarket = (a: (typeof articles)[number]) => a.tags.includes(MARKET_NEWS_SYMBOL) || a.tags.length === 0;

  const strip = ({ title, link, pub_date }: Article) => ({ title, link, pub_date });
  const related = articles.filter(isRelated).map(strip);
  const market = articles
    .filter((a) => !isRelated(a) && isMarket(a))
    .slice(0, MAX_MARKET_ARTICLES)
    .map(strip);

  return NextResponse.json({
    symbol,
    totalArticles: articles.length,
    related,
    market,
  });
}
