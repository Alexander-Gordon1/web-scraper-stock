// components/dashboard/PersonalDashComponents/WhatHappenedSection.tsx
"use client";

import { useRef, useState } from "react";
import { type Point } from "./StockChart";
import StockCarousel from "./StockCarousel";
import { TICKER_OPTIONS } from "@/app/user/lib/tickers";

type Article = { title: string; link: string; pub_date: string };

type NewsResponse = {
  symbol: string;
  related: Article[];
  market: Article[];
};

const formatDayLong = (d: Date) =>
  d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function ArticleList({ articles }: { articles: Article[] }) {
  return (
    <ul className="flex flex-col divide-y divide-white/5">
      {articles.map((a) => (
        <li key={a.link}>
          {/* opens the article in a new tab */}
          <a
            href={a.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start justify-between gap-4 rounded-md px-3 py-2.5 hover:bg-white/5 transition-colors"
          >
            <span className="text-sm text-[#E5EAF5] group-hover:text-white">{a.title}</span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-[#E5EAF5]/50">
              {formatTime(a.pub_date)}
              <span aria-hidden="true" className="group-hover:text-[#9085e9]">↗</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function WhatHappenedSection() {
  const [day, setDay] = useState<Date | null>(null); // midnight (local time) of the clicked day
  const [news, setNews] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0); // ignore responses from older clicks
  const swipeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function loadNews(forSymbol: string, forDay: Date) {
    const id = ++requestId.current;
    const next = new Date(forDay);
    next.setDate(next.getDate() + 1);

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ symbol: forSymbol, from: forDay.toISOString(), to: next.toISOString() });
      const res = await fetch(`/user/api/news?${params}`);
      if (!res.ok) throw new Error();
      const json = (await res.json()) as NewsResponse;
      if (id === requestId.current) setNews(json);
    } catch {
      if (id === requestId.current) setError("Couldn't load the news for this day.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  function handlePointClick(clickedSymbol: string, point: Point) {
    const clickedDay = new Date(point.time);
    clickedDay.setHours(0, 0, 0, 0);
    setDay(clickedDay);
    loadNews(clickedSymbol, clickedDay);
  }

  // swiping to another stock keeps the same day and shows that stock's news.
  // waits until swiping settles, so jumping past several stocks only loads once
  function handleCurrentChange(value: string) {
    clearTimeout(swipeTimer.current);
    if (day) swipeTimer.current = setTimeout(() => loadNews(value, day), 300);
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#E5EAF5] mb-2">What Happened</h3>

      <StockCarousel
        symbols={TICKER_OPTIONS}
        label="What happened charts"
        initialRange="1M"
        onPointClick={handlePointClick}
        highlightDay={day?.toDateString()}
        onCurrentChange={handleCurrentChange}
      />

      {/* news for the clicked day */}
      <div className="mt-3 min-h-64 rounded-lg border border-[#D0BDF4] bg-[#262826] p-6 text-[#E5EAF5]" aria-live="polite">
        {!day ? (
          <p className="text-sm text-[#E5EAF5]/60">Click a point on the graph to see the news from that day.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-lg font-semibold">What happened on {formatDayLong(day)}</p>
              {loading && <p className="text-xs text-[#E5EAF5]/60">Loading…</p>}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {news && !error && (
              <div className="flex flex-col gap-6">
                <section>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#9085e9]">
                    About {news.symbol} ({news.related.length})
                  </p>
                  {news.related.length > 0 ? (
                    <ArticleList articles={news.related} />
                  ) : (
                    <p className="px-3 py-2 text-sm text-[#E5EAF5]/60">No headlines mentioned {news.symbol} this day.</p>
                  )}
                </section>

                <section>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#E5EAF5]/60">Market news</p>
                  {news.market.length > 0 ? (
                    // only market news scrolls; there are up to 30 a day
                    <div className="max-h-80 overflow-y-auto pr-2" tabIndex={0} aria-label="Market news articles">
                      <ArticleList articles={news.market} />
                    </div>
                  ) : (
                    <p className="px-3 py-2 text-sm text-[#E5EAF5]/60">No news stored for this day.</p>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
