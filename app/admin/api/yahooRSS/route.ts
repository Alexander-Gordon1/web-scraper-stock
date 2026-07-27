// app/admin/api/yahooRSS/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Parser from 'rss-parser';
import {createHash} from "crypto";
import { incertArticle } from "@/app/admin/lib/incertArticle";

const parser = new Parser();

function computeHash(content: string): string {
  const hash = createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

export async function GET(req: NextRequest) {


  // auth check for cron bot calls every 5 mins
  const authHeader = req.headers.get('Authorization');
  const expected = process.env.CronJob;

  if (authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized access to endpoint' }, { status: 401 });
  }



  //fetch feed 
  const feed = await parser.parseURL('https://finance.yahoo.com/news/rssindex');
  const rss_id = '9ce7f6b7-bcfc-4220-bc74-ae47a86bca5c'; //id in rss table for yahoo finance infomration and tracker columns 

  //hashed feed to compare if new feed is different from previous feed 
  const hashedFeed = computeHash(JSON.stringify(feed.items));

  // parse every item's pubDate into a real Date, dropping anything missing/invalid
  // rather than trusting feed.items[0] to always be the newest (ordering isn't guaranteed)
  const validDates = feed.items
    .map((item) => (item.pubDate ? new Date(item.pubDate) : null))
    .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

  const mostRecentItemDate = validDates.length > 0
    ? new Date(Math.max(...validDates.map((d) => d.getTime())))
    : null;

  //fetching latest article date from database to compare with mostrecentitemdate  
  const supabaseURL = process.env.Supabase_URL!;
  const supabaseKEY = process.env.Supabase_secret!;

  //creating supabase client 
  const supabase = createClient(supabaseURL, supabaseKEY);  

  //query for latest article time
  const { data, error } = await supabase
    .from("rss")
    .select("feedHashed, latestItem")
    .eq("rssURL", 'https://finance.yahoo.com/news/rssindex')
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch existing rss row:", error);
    return NextResponse.json({ error: "Database fetch failed" }, { status: 500 });
    }

  
  const storedHash = data?.feedHashed ?? null;
  const storedLatestItem = data?.latestItem ? new Date(data.latestItem) : null;

  
  if (hashedFeed !== storedHash){

    if(storedLatestItem && mostRecentItemDate && mostRecentItemDate <= storedLatestItem){
      console.log("No new articles to ingest.");
      return NextResponse.json({ message: "No new articles to ingest." });
    }


    //articles found as hash is different and time is different. 
    else{
      console.log("New articles found. Ingesting...");

      // build array of only the items newer than what we already have stored
      const newItems = feed.items.filter((item) => {
        if (!item.pubDate) return false;    // can't compare, skip it

        const itemDate = new Date(item.pubDate);
        if (isNaN(itemDate.getTime())) return false; // malformed date, skip it rather than silently failing the comparison

        if (!storedLatestItem) return true; // nothing stored yet, treat everything as new
        return itemDate > storedLatestItem;
      });

      console.log(`${newItems.length} new item(s) to ingest.`);

      for (const item of newItems) {
        const payload = {
          rss_id: rss_id,
          title: item.title ?? "no title found",
          link: item.link ?? "no link found",
          pubDate: item.pubDate ?? null,
          guid: item.guid ?? item.link ?? null,
          content_hash: computeHash(JSON.stringify(item)),
          raw_payload: item,
        };
        await incertArticle(payload);
      }

      // only update the tracking row if we have a valid date to record —
      // otherwise a null would overwrite the good stored value and re-trigger
      // a "treat everything as new" state on the next run
      if (mostRecentItemDate) {
        const { error: updateError } = await supabase
          .from("rss")
          .update({
            feedHashed: hashedFeed,
            latestItem: mostRecentItemDate.toISOString(),
          })
          .eq("rssURL", 'https://finance.yahoo.com/news/rssindex');

        if (updateError) {
          console.error("Failed to update rss tracking row:", updateError);
          return NextResponse.json({ error: "Failed to update rss tracking row" }, { status: 500 });
        }
      } else {
        console.warn("No valid dates found in feed — skipping latestItem update to avoid wiping stored value.");
      }

      return NextResponse.json({
        title: feed.title,
        newItemsIngested: newItems.length,
        items: newItems,
      });

    }
  }
  else if (storedHash === hashedFeed && storedLatestItem && mostRecentItemDate && mostRecentItemDate > storedLatestItem) {
    console.log("Hash unchanged but latest item date advanced — investigate.");
    return NextResponse.json({ message: "Anomaly: hash same, date newer. Check needed." });
}
else {
  console.log("No changes to articles found.");
  return NextResponse.json({ message: "No changes to articles found." });
}

}
