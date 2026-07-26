// app/admin/api/rssHandler/route.ts
import { NextResponse } from "next/server";
import Parser from 'rss-parser';

const parser = new Parser();

export async function GET() {
  const feed = await parser.parseURL('https://finance.yahoo.com/news/rssindex');

  console.log(feed.title);
  console.log(feed.items.length);
  console.log(feed.items[0]);

  return NextResponse.json({
    title: feed.title,
    count: feed.items.length,
    items: feed.items,
  });
}