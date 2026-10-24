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
  const dotsRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [dragged, setDragged] = useState(false); // hides the "drag to navigate" hint once used

  function goTo(index: number, behavior: ScrollBehavior = "smooth") {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft, behavior });
  }

  // dragging along the dots jumps straight to the stock whose dot is nearest the pointer
  // (measured in both directions in case the dots wrap onto a second row)
  function dragTo(e: React.PointerEvent) {
    const dots = Array.from(dotsRef.current?.children ?? []);
    if (!dots.length) return;
    const distance = (el: Element) => {
      const r = el.getBoundingClientRect();
      return Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY);
    };
    let nearest = 0;
    dots.forEach((dot, i) => {
      if (distance(dot) < distance(dots[nearest])) nearest = i;
    });
    if (nearest !== current) goTo(nearest, "instant");
  }

  function handleDotsPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    setDragged(true);
    e.currentTarget.setPointerCapture(e.pointerId); // keep following the pointer off the dots
    dragTo(e);
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
    "hidden h-8 w-8 items-center justify-center rounded-md sm:flex border border-[#2f9e5b]/30 text-lg text-[#d9ffe6]/70 hover:bg-[#2f9e5b]/15 hover:text-[#d9ffe6] disabled:opacity-30 disabled:hover:bg-transparent transition-colors";

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

      {/* controls: arrows either side of the dots. phones just swipe, so they only get a counter */}
      <div className="mt-3 flex items-center justify-center gap-3">
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
        <p className="text-xs text-[#d9ffe6]/60 sm:hidden" aria-live="polite">
          {symbols[current]} · {current + 1} / {symbols.length}
        </p>

        {/* touch-none stops a finger drag from scrolling the page instead */}
        <div
          ref={dotsRef}
          onPointerDown={handleDotsPointerDown}
          onPointerMove={(e) => dragging.current && dragTo(e)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          className="hidden cursor-grab touch-none flex-wrap justify-center gap-1.5 py-2 select-none active:cursor-grabbing sm:flex"
        >
          {symbols.map((symbol, i) => (
            <button
              key={symbol}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show ${symbol}`}
              aria-current={i === current}
              title={symbol}
              className={`h-2 rounded-full transition-all ${
                i === current ? "w-5 bg-[#2f9e5b]" : "w-2 bg-[#d9ffe6]/25 hover:bg-[#d9ffe6]/50"
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

      {/* fades out after the first drag; keeps its space so nothing jumps */}
      <p
        aria-hidden="true"
        className={`mt-1 hidden text-center font-mono text-xs uppercase tracking-[0.2em] text-[#2f9e5b] transition-opacity duration-500 sm:block ${
          dragged ? "opacity-0" : "opacity-100"
        }`}
      >
        ‹ drag to navigate ›
      </p>
    </div>
  );
}
