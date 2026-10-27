"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { MAX_TICKERS } from "@/app/user/lib/tickers";

type TickerItemProps = {
  label: string;
  value: number;
  changePercent: number;
};

function TickerItem({ label, value, changePercent }: TickerItemProps) {
  const isUp = changePercent >= 0;

  return (
    <div className="flex shrink-0 items-center justify-between gap-6 px-4 py-2 min-w-[140px] font-mono">
      <span
        className={`text-[15px] font-bold tracking-widest ${
          isUp ? "text-[#2f9e5b]" : "text-red-400"
        }`}
      >
        <span aria-hidden="true" className="mr-1.5 text-[10px]">
          {isUp ? "▲" : "▼"}
        </span>
        {label}
      </span>
      <span className="text-sm text-[#d9ffe6]/70">
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
    // -mx-4 md:-mx-10 / -mt-4 cancel the dashboard's px-4 md:px-10 py-4 padding so the bar runs edge to edge
    // and sits right under the nav's bottom line; border-b matches that line.
    // backdrop-blur makes the bar its own stacking layer, so z-30 keeps the dropdown above the graph
    <div ref={containerRef} className="relative z-30 -mx-4 -mt-4 flex md:-mx-10 items-stretch border-b border-[#2f9e5b]/30 bg-black/60 backdrop-blur-sm">
      {/* same width as the + button, so the tickers are centred across the whole bar */}
      <div className="ml-2.5 w-8 shrink-0" aria-hidden="true" />

      {/* justify-center-safe: centred, but falls back to left-aligned when they don't all fit */}
      <div className="flex flex-1 items-stretch justify-center-safe overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tickerItems.map((item, i) => (
          <Fragment key={item.label}>
            {/* divider between tickers, 8px in from the top and bottom */}
            {i > 0 && <span className="my-2 w-px shrink-0 bg-[#2f9e5b]/30" aria-hidden="true" />}
            <TickerItem {...item} />
          </Fragment>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Add tickers"
        aria-expanded={open}
        className="mr-2.5 flex h-8 w-8 shrink-0 self-center items-center justify-center rounded-md border border-[#2f9e5b]/40 font-mono text-xl leading-none text-[#2f9e5b] transition hover:border-[#2f9e5b] hover:bg-[#2f9e5b]/15 hover:text-[#d9ffe6] hover:shadow-[0_0_14px_rgba(47,158,91,0.45)]"
      >
        +
      </button>

      {open && (
        <div className="absolute right-2.5 top-full z-20 mt-2 w-60 rounded-md border border-[#2f9e5b]/40 bg-black/80 font-mono shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-[#2f9e5b]/30 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#2f9e5b]">
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
                        ? "border-[#2f9e5b] bg-[#2f9e5b] text-black"
                        : "border-[#2f9e5b]/40 hover:border-[#2f9e5b]"
                    }`}
                  >
                    {isSelected && "✓"}
                  </button>
                  <span className={`text-sm font-medium ${isFull ? "text-[#d9ffe6]/30" : "text-[#d9ffe6]/80"}`}>
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
