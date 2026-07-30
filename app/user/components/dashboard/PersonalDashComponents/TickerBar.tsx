"use client";

import { useEffect, useState } from "react";

type TickerItemProps = {
  label: string;
  value: number;
  changePercent: number;
};

function TickerItem({ label, value, changePercent }: TickerItemProps) {
  const isUp = changePercent >= 0;

  return (
    <div className="flex items-center justify-between gap-6 px-4 py-2 min-w-[140px]">
      <span
        className={`text-[16px] font-semibold tracking-wide ${
          isUp ? "text-green-500" : "text-red-500"
        }`}
      >
        {label}
      </span>
      <span className="text-sm font-mono text-white/70">
        {typeof value === "number" ? value.toFixed(2) : "—"}
      </span>
    </div>
  );
}

const TICKERS = [
  "NVDA", "MU", "GOOGL", "AVGO", "AAPL", "MRVL", "MSFT", "AMD", "META", "AMZN",
  
];

export default function TickerBar() {
  const [tickerItems, setTickerItems] = useState<TickerItemProps[]>([]);

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const res = await fetch("/user/api/getTickersFromDatabase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tickers: TICKERS }),
        });
        if (!res.ok) return; // keep existing data on HTTP error
        const data = await res.json();

        const formatted: TickerItemProps[] = (data.quotes ?? []).map((quote: any) => ({
          label: quote.symbol,
          value: quote.current_price,
          changePercent: quote.percent_change,
        }));

        if (formatted.length > 0) setTickerItems(formatted);
      } catch {
        // Network error — keep existing data
      }
    };

    fetchTickers();
    const interval = setInterval(fetchTickers, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[black] flex items-center">
      {tickerItems.map((item) => (
        <TickerItem key={item.label} {...item} />
      ))}
    </div>
  );
}