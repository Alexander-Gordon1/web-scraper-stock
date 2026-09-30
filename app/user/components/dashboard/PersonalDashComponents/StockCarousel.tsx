"use client";

import { useRef, useState } from "react";
import StockChart, { type Point } from "./StockChart";
import type { TimeRange } from "@/app/user/lib/timeRanges";

type StockCarouselProps = {
  symbols: string[];
  label?: string; // read out by screen readers, e.g. "Stock charts"
  initialRange?: TimeRange;
  // makes the charts' points clickable
  onPointClick?: (symbol: string, point: Point) => void;
  // shades this day on every chart (a Date.toDateString() value)
  highlightDay?: string;
  // called when a different stock swipes into view
  onCurrentChange?: (symbol: string) => void;
};

// swipeable row of stock charts, one per slide.
// swiping/trackpad scrolling comes from css scroll-snap; arrows + dots are for mouse users.
export default function StockCarousel({
  symbols,
  label = "Stock charts",
  initialRange = "1D",
  onPointClick,
  highlightDay,
  onCurrentChange,
}: StockCarouselProps) {
  const [current, setCurrent] = useState(0);
  // shared by every chart so the period stays the same while swiping
  const [range, setRange] = useState<TimeRange>(initialRange);
  const [start, setStart] = useState(""); // "" = latest period, counting back from now
  const trackRef = useRef<HTMLDivElement>(null);

  function goTo(index: number) {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  }

  // work out which slide is showing from the scroll position
  function handleScroll() {
    const track = trackRef.current;
    const first = track?.children[0] as HTMLElement | undefined;
    if (!track || !first) return;
    const slideWidth = first.offsetWidth + parseFloat(getComputedStyle(track).columnGap || "0");
    const index = Math.round(track.scrollLeft / slideWidth);
    if (index !== current) {
      setCurrent(index);
      onCurrentChange?.(symbols[index]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") goTo(Math.min(current + 1, symbols.length - 1));
    if (e.key === "ArrowLeft") goTo(Math.max(current - 1, 0));
  }

  const arrowClass =
    "flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-lg text-[#E5EAF5]/70 hover:bg-white/10 hover:text-[#E5EAF5] disabled:opacity-30 disabled:hover:bg-transparent transition-colors";

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        className="relative flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {symbols.map((symbol, i) => (
          <div
            key={symbol}
            className="w-full shrink-0 snap-center"
            aria-roledescription="slide"
            aria-label={`${symbol} (${i + 1} of ${symbols.length})`}
          >
            {/* only the visible chart and its neighbours load data */}
            <StockChart
              symbol={symbol}
              range={range}
              onRangeChange={setRange}
              start={start || undefined}
              onStartChange={setStart}
              active={Math.abs(i - current) <= 1}
              onPointClick={onPointClick && ((point) => onPointClick(symbol, point))}
              highlightDay={highlightDay}
            />
          </div>
        ))}
      </div>

      {/* controls */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          aria-label="Previous stock"
          className={arrowClass}
        >
          ‹
        </button>

        {/* phones: counter instead of dots */}
        <p className="text-xs text-[#E5EAF5]/60 sm:hidden" aria-live="polite">
          {symbols[current]} · {current + 1} / {symbols.length}
        </p>

        <div className="hidden flex-wrap justify-center gap-1.5 sm:flex">
          {symbols.map((symbol, i) => (
            <button
              key={symbol}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show ${symbol}`}
              aria-current={i === current}
              title={symbol}
              className={`h-2 rounded-full transition-all ${
                i === current ? "w-5 bg-[#9085e9]" : "w-2 bg-[#E5EAF5]/25 hover:bg-[#E5EAF5]/50"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(current + 1)}
          disabled={current === symbols.length - 1}
          aria-label="Next stock"
          className={arrowClass}
        >
          ›
        </button>
      </div>
    </div>
  );
}
