"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TIME_RANGES, type TimeRange } from "@/app/user/lib/timeRanges";
import CalendarDropdown from "./CalendarDropdown";

export type Point = { time: string; price: number };

type HistoryResponse = {
  symbol: string;
  range: TimeRange;
  prevClose: number | null;
  points: Point[];
};

const HEIGHT = 240;
const MARGIN = { top: 12, right: 56, bottom: 28, left: 8 };
const MIN_LABEL_GAP = 64; // px between x axis labels

// chart colours (line colour validated against the #262826 card surface)
const LINE_COLOR = "#9085e9";
const SURFACE = "#262826";

// wording for the period shown, and for the change in the header
const PERIOD_LABEL: Record<TimeRange, string> = {
  "1D": "Latest trading day",
  "1W": "Past week",
  "1M": "Past month",
  "3M": "Past 3 months",
};
const CHANGE_LABEL: Record<TimeRange, string> = {
  "1D": "vs prev close",
  "1W": "past week",
  "1M": "past month",
  "3M": "past 3 months",
};

// round, evenly spaced axis values that cover [min, max]
function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || Math.abs(max) || 1;
  const rawStep = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep)!;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

const formatPrice = (n: number) => `$${n.toFixed(2)}`;
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });

type StockChartProps = {
  symbol: string;
  range: TimeRange;
  // leave out to hide the period buttons (e.g. when something else controls the range)
  onRangeChange?: (range: TimeRange) => void;
  // false pauses fetching (e.g. when the chart is off-screen in a carousel)
  active?: boolean;
  // makes points clickable
  onPointClick?: (point: Point) => void;
  // shades every point on this day (a Date.toDateString() value)
  highlightDay?: string;
  // "YYYY-MM-DD" (from a date input): show the range counting forward from this day
  // instead of the most recent range
  start?: string;
  // shows a calendar dropdown next to the period buttons for picking `start`
  onStartChange?: (start: string) => void;
};

export default function StockChart({
  symbol,
  range,
  onRangeChange,
  active = true,
  onPointClick,
  highlightDay,
  start,
  onStartChange,
}: StockChartProps) {
  // keep each range + start date's data so switching back to it is instant
  const [cache, setCache] = useState<Record<string, HistoryResponse>>({});
  const [error, setError] = useState("");
  const [width, setWidth] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // midnight (local time) of the start day, and the day the window ends
  const startDate = start ? new Date(`${start}T00:00:00`) : null;
  const endDate = startDate ? new Date(startDate) : null;
  endDate?.setDate(endDate.getDate() + (TIME_RANGES[range].days ?? 1));
  const cacheKey = `${range}|${start ?? ""}`;

  const fetchHistory = useCallback(() => {
    const params = new URLSearchParams({ symbol, range });
    if (start) params.set("start", new Date(`${start}T00:00:00`).toISOString());

    return fetch(`/user/api/stockHistory?${params}`)
      .then((res) => (res.ok ? (res.json() as Promise<HistoryResponse>) : Promise.reject()))
      .then((json) => {
        setCache((c) => ({ ...c, [`${range}|${start ?? ""}`]: json }));
        setError("");
      })
      .catch(() => setError("Couldn't load price history."));
  }, [symbol, range, start]);

  // load now, then refresh every minute to match the cron job
  useEffect(() => {
    if (!active) return;
    fetchHistory();
    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, [fetchHistory, active]);

  // keep the svg as wide as its container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const data = cache[cacheKey];

  // e.g. "Past month", or "1 Sept – 1 Oct" when there's a start date
  const periodLabel = !startDate
    ? PERIOD_LABEL[range]
    : range === "1D"
      ? formatDay(startDate.toISOString())
      : `${formatDay(startDate.toISOString())} – ${formatDay(endDate!.toISOString())}`;
  const changeLabel = startDate && range !== "1D" ? "over this period" : CHANGE_LABEL[range];
  const points = data?.points ?? [];
  const isIntraday = range === "1D";
  const latest = points.at(-1);

  // 1D compares against yesterday's close, longer ranges against the first point shown
  const prevClose = isIntraday ? (data?.prevClose ?? null) : null;
  const baseline = isIntraday ? prevClose : (points[0]?.price ?? null);
  const change = latest && baseline ? latest.price - baseline : null;
  const changePct = change !== null && baseline ? (change / baseline) * 100 : null;
  const isUp = (change ?? 0) >= 0;

  // scales. points are spaced evenly by index rather than by clock time,
  // so nights and weekends (when the market is closed) don't show as long flat lines
  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 0);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const prices = points.map((p) => p.price).concat(prevClose ?? []);
  const yTicks = points.length ? niceTicks(Math.min(...prices), Math.max(...prices)) : [];
  const yMin = yTicks[0] ?? 0;
  const yMax = yTicks.at(-1) ?? 1;
  const yTickDecimals = yTicks.every((v) => Number.isInteger(v)) ? 0 : 2;

  const x = (i: number) => MARGIN.left + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => MARGIN.top + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join("");

  // x axis labels: the first point of each new hour (1D) or day (longer ranges),
  // skipping any that would sit closer than MIN_LABEL_GAP to the previous label
  const labelKey = (iso: string) => {
    const d = new Date(iso);
    return isIntraday ? `${d.toDateString()} ${d.getHours()}` : d.toDateString();
  };
  const xTicks: number[] = [];
  for (let i = 1; i < points.length; i++) {
    if (labelKey(points[i].time) === labelKey(points[i - 1].time)) continue;
    // keep labels far enough from the edges that they aren't cut off
    if (x(i) < MARGIN.left + 24 || x(i) > MARGIN.left + innerW - 24) continue;
    const last = xTicks.at(-1);
    if (last === undefined || x(i) - x(last) >= MIN_LABEL_GAP) xTicks.push(i);
  }
  // 1D labels show the whole hour (e.g. 16:00) even if the first quote in it was at 16:01
  const formatTick = (iso: string) => {
    if (!isIntraday) return formatDay(iso);
    const hour = new Date(iso);
    hour.setMinutes(0, 0, 0);
    return formatTime(hour.toISOString());
  };

  // find the point closest to the mouse / finger
  function indexAt(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    return Math.min(Math.max(Math.round(fraction * (points.length - 1)), 0), points.length - 1);
  }

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    if (points.length) setHoverIndex(indexAt(e));
  }

  function handleClick(e: React.MouseEvent<SVGRectElement>) {
    if (!points.length || !onPointClick) return;
    const i = indexAt(e);
    setHoverIndex(i);
    onPointClick(points[i]);
  }

  // first and last point of the highlighted day, for the shaded band
  const dayIndexes = highlightDay
    ? points.flatMap((p, i) => (new Date(p.time).toDateString() === highlightDay ? [i] : []))
    : [];

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="@container p-6 rounded-lg shadow-sm bg-[#262826] border border-[#D0BDF4] text-[#E5EAF5]">
      {/* header: stacked when the card is narrow (e.g. 3 side by side), one row when wide */}
      <div className="flex flex-col gap-2 mb-4 @lg:flex-row @lg:items-end @lg:justify-between @lg:gap-4">
        <div>
          <p className="text-lg font-semibold">{symbol}</p>
          <p className="text-xs text-[#E5EAF5]/60">
            {periodLabel} · price in USD
          </p>
          {prevClose !== null && (
            <p className="mt-1 flex items-center gap-2 text-xs text-[#E5EAF5]/60">
              <svg width="16" height="2" aria-hidden="true">
                <line x1="0" x2="16" y1="1" y2="1" stroke="rgba(229,234,245,0.5)" strokeDasharray="4 4" />
              </svg>
              Prev close {formatPrice(prevClose)}
            </p>
          )}
        </div>
        {latest && (
          <div className="@lg:text-right">
            <p className="text-2xl font-semibold font-mono">{formatPrice(latest.price)}</p>
            {change !== null && changePct !== null && (
              <p className={`text-sm font-mono ${isUp ? "text-green-500" : "text-red-500"}`}>
                {isUp ? "▲" : "▼"} {isUp ? "+" : ""}
                {change.toFixed(2)} ({isUp ? "+" : ""}
                {changePct.toFixed(2)}%) <span className="font-sans text-[#E5EAF5]/60">{changeLabel}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* chart */}
      <div ref={containerRef} className="relative w-full" style={{ height: HEIGHT }}>
        {error && !data && <p className="text-sm text-[#E5EAF5]/60">{error}</p>}
        {!error && !data && <p className="text-sm text-[#E5EAF5]/60">Loading…</p>}
        {data && points.length === 0 && <p className="text-sm text-[#E5EAF5]/60">No price data for this period.</p>}

        {width > 0 && points.length > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`${symbol} price, ${periodLabel.toLowerCase()}, from ${formatPrice(points[0].price)} to ${formatPrice(latest!.price)}`}
          >
            {/* gridlines + y axis labels */}
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={MARGIN.left} x2={MARGIN.left + innerW} y1={y(v)} y2={y(v)} stroke="rgba(229,234,245,0.08)" />
                <text x={MARGIN.left + innerW + 8} y={y(v)} dy="0.32em" fontSize={11} fill="rgba(229,234,245,0.6)" className="font-mono">
                  {v.toFixed(yTickDecimals)}
                </text>
              </g>
            ))}

            {/* x axis labels */}
            {xTicks.map((i) => (
              <text key={i} x={x(i)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="rgba(229,234,245,0.6)">
                {formatTick(points[i].time)}
              </text>
            ))}

            {/* previous close reference line (1D only) */}
            {prevClose !== null && (
              <line
                x1={MARGIN.left}
                x2={MARGIN.left + innerW}
                y1={y(prevClose)}
                y2={y(prevClose)}
                stroke="rgba(229,234,245,0.35)"
                strokeDasharray="4 4"
              />
            )}

            {/* shaded band over the highlighted day */}
            {dayIndexes.length > 0 && (
              <rect
                x={x(dayIndexes[0]) - 2}
                y={MARGIN.top}
                width={Math.max(x(dayIndexes.at(-1)!) - x(dayIndexes[0]), 0) + 4}
                height={innerH}
                fill={LINE_COLOR}
                opacity={0.15}
                rx={4}
              />
            )}

            {/* price line */}
            <path d={path} fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {/* hover crosshair + marker */}
            {hovered && hoverIndex !== null && (
              <g pointerEvents="none">
                <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={MARGIN.top} y2={MARGIN.top + innerH} stroke="rgba(229,234,245,0.35)" />
                <circle cx={x(hoverIndex)} cy={y(hovered.price)} r={5} fill={LINE_COLOR} stroke={SURFACE} strokeWidth={2} />
              </g>
            )}

            {/* invisible hit area for the mouse */}
            <rect
              x={MARGIN.left}
              y={MARGIN.top}
              width={innerW}
              height={innerH}
              fill="transparent"
              className={onPointClick ? "cursor-pointer" : undefined}
              onClick={handleClick}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoverIndex(null)}
            />
          </svg>
        )}

        {/* tooltip */}
        {hovered && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-white/10 bg-[#1a1a1a] px-3 py-2 text-xs shadow-lg"
            style={{
              top: MARGIN.top,
              // sit beside the crosshair, flipping to the left side near the right edge
              left: x(hoverIndex) + 132 > width ? x(hoverIndex) - 132 : x(hoverIndex) + 12,
              width: 120,
            }}
          >
            <p className="text-[#E5EAF5]/60">
              {isIntraday ? formatTime(hovered.time) : `${formatDay(hovered.time)}, ${formatTime(hovered.time)}`}
            </p>
            <p className="font-mono text-sm font-semibold text-[#E5EAF5]">{formatPrice(hovered.price)}</p>
            {onPointClick && <p className="mt-1 text-[#9085e9]">Click for news</p>}
          </div>
        )}
      </div>

      {/* time period selector + start date calendar */}
      {(onRangeChange || onStartChange) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {onRangeChange && (
            <div className="inline-flex gap-1 rounded-lg border border-white/10 p-1" role="group" aria-label="Time period">
              {(Object.keys(TIME_RANGES) as TimeRange[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setHoverIndex(null);
                    onRangeChange(key);
                  }}
                  aria-pressed={range === key}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                    range === key ? "bg-[#9085e9] text-[#1a1a1a]" : "text-[#E5EAF5]/60 hover:bg-white/10 hover:text-[#E5EAF5]"
                  }`}
                >
                  {TIME_RANGES[key].label}
                </button>
              ))}
            </div>
          )}
          {onStartChange && <CalendarDropdown value={start ?? ""} onChange={onStartChange} />}
        </div>
      )}
    </div>
  );
}
