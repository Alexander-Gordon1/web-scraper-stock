"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_TICKERS } from "@/app/user/lib/tickers";

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

type TickerBarResponse = {
  loggedIn: boolean;
  symbols: string[];
  options: string[];
  quotes: { symbol: string; current_price: number; percent_change: number }[];
};

export default function TickerBar() {
  const [tickerItems, setTickerItems] = useState<TickerItemProps[]>([]);
  const [selected, setSelected] = useState<string[]>([]); // tickers currently in the bar
  const [options, setOptions] = useState<string[]>([]); // every ticker the user can add
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchTickers = useCallback(() => {
    // returns the latest quote for each ticker in the user's tickerBar table
    return fetch("/user/api/tickerBar")
      .then((res) => (res.ok ? (res.json() as Promise<TickerBarResponse>) : null))
      .then((data) => {
        if (!data) return; // keep existing data on HTTP error

        setTickerItems(
          data.quotes.map((quote) => ({
            label: quote.symbol,
            value: quote.current_price,
            changePercent: quote.percent_change,
          }))
        );
        setSelected(data.symbols);
        setOptions(data.options);
        setLoggedIn(data.loggedIn);
      })
      .catch(() => {
        // Network error — keep existing data
      });
  }, []);

  useEffect(() => {
    fetchTickers();
    const interval = setInterval(fetchTickers, 15000);
    return () => clearInterval(interval);
  }, [fetchTickers]);

  // close the dropdown when clicking anywhere outside the bar
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function toggleTicker(symbol: string) {
    setError("");
    if (!loggedIn) {
      setError("Log in to customise your ticker bar.");
      return;
    }

    const isSelected = selected.includes(symbol);
    if (!isSelected && selected.length >= MAX_TICKERS) {
      setError(`The ticker bar can only hold ${MAX_TICKERS} tickers.`);
      return;
    }

    const previous = selected;
    const next = isSelected ? selected.filter((s) => s !== symbol) : [...selected, symbol];
    setSelected(next); // update the checkbox straight away

    const res = await fetch("/user/api/tickerBar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickers: next }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSelected(previous);
      setError(data.error ?? "Failed to save ticker bar.");
      return;
    }

    fetchTickers();
  }

  return (
    <div ref={containerRef} className="relative w-full bg-[black] flex items-center">
      <div className="flex flex-1 items-center overflow-hidden">
        {tickerItems.map((item) => (
          <TickerItem key={item.label} {...item} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Add tickers"
        aria-expanded={open}
        className="mr-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-2xl leading-none text-white/70 hover:bg-white/10 hover:text-white transition-colors"
      >
        +
      </button>

      {open && (
        <div className="absolute right-2.5 top-full z-20 mt-2 w-60 rounded-lg border border-white/10 bg-[#1a1a1a] shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-white/50">
            <span>Tickers</span>
            <span>
              {selected.length}/{MAX_TICKERS}
            </span>
          </div>

          {error && <p className="px-4 py-2 text-xs text-red-400">{error}</p>}

          <ul className="max-h-72 overflow-y-auto py-1">
            {options.map((symbol) => {
              const isSelected = selected.includes(symbol);
              const isFull = !isSelected && selected.length >= MAX_TICKERS;

              return (
                <li key={symbol} className="flex items-center gap-3 px-4 py-1.5">
                  <button
                    type="button"
                    onClick={() => toggleTicker(symbol)}
                    disabled={isFull}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? "Remove" : "Add"} ${symbol}`}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                      isSelected
                        ? "border-green-500 bg-green-500 text-black"
                        : "border-white/40 hover:border-white"
                    }`}
                  >
                    {isSelected && "✓"}
                  </button>
                  <span className={`text-sm font-medium ${isFull ? "text-white/30" : "text-white/80"}`}>
                    {symbol}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
