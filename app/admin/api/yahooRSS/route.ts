// app/admin/api/yahooRSS/route.ts
import { NextResponse } from "next/server";
import Parser from 'rss-parser';
import {createHash} from "crypto";
import { incertArticle } from "@/app/admin/lib/incertArticle";

const parser = new Parser();

function computeHash(content: string): string {
  const hash = createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

export async function GET() {
  const feed = await parser.parseURL('https://finance.yahoo.com/news/rssindex');
  const rss_id = '9ce7f6b7-bcfc-4220-bc74-ae47a86bca5c';

  const result = [];

  for (const item of feed.items) {
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

  console.log(feed.title);
  console.log(feed.items.length);
  console.log(feed.items[0]);

  return NextResponse.json({
    title: feed.title,
    count: feed.items.length,
    items: feed.items,
  });







}