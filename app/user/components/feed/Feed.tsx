"use client";

import { useEffect, useState } from "react";
import PostCard, { type Article } from "./PostCard";

export default function Feed() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/user/api/alphaVantage", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => setArticles(data.feed ?? []))
      .catch((err: Error) => {
        // AbortError just means the first render was cancelled by StrictMode — ignore it
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

const SENTIMENTS = [
  { label: "Bullish",          colour: "text-emerald-600" },
  { label: "Somewhat-Bullish", colour: "text-emerald-400" },
  { label: "Neutral",          colour: "text-gray-300"    },
  { label: "Somewhat-Bearish", colour: "text-red-300"     },
  { label: "Bearish",          colour: "text-red-600"     },
];

  if (loading) return <p className="text-center text-gray-500 py-8">Loading news...</p>;
  if (error)   return <p className="text-center text-red-500 py-8">{error}</p>;
  if (articles.length === 0) return <p className="text-center text-gray-500 py-8">No articles found.</p>;

  return (
    <div className="flex flex-col gap-8 py-5 md:px-10 bg-[#262826]">
      {SENTIMENTS.map(({ label, colour }) => {
        const group = articles.filter((a) => a.overall_sentiment_label === label);
        if (group.length === 0) return null;
        return (
          <section key={label}>
            <h2 className={`text-lg font-bold mb-3 ${colour}`}>{label}</h2>
            <div className="flex flex-row gap-4 overflow-x-auto pb-2">
              {group.map((article, index) => (
                <PostCard key={index} article={article} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};