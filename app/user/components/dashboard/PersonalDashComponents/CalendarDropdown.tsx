// components/dashboard/PersonalDashComponents/CalendarDropdown.tsx
"use client";

import { useEffect, useRef, useState } from "react";

const POPOVER_WIDTH = 280;
const POPOVER_HEIGHT = 340; // roughly, used to decide whether to open above or below
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// "YYYY-MM-DD" in local time
const toValue = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromValue = (v: string) => new Date(`${v}T00:00:00`);

// button that opens a month calendar for picking a start date.
// value is "YYYY-MM-DD", or "" for none (the chart then shows the latest period)
export default function CalendarDropdown({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  // top when opening below the button, bottom when opening above it
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const [month, setMonth] = useState(() => {
    const d = value ? fromValue(value) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const today = toValue(new Date());

  // position: fixed so the carousel's scroll area can't clip it
  function toggle() {
    if (open) return setOpen(false);
    const rect = buttonRef.current!.getBoundingClientRect();
    const below = rect.bottom + 8 + POPOVER_HEIGHT <= window.innerHeight;
    setPosition({
      ...(below ? { top: rect.bottom + 8 } : { bottom: window.innerHeight - rect.top + 8 }),
      left: Math.min(Math.max(rect.left + rect.width / 2 - POPOVER_WIDTH / 2, 8), window.innerWidth - POPOVER_WIDTH - 8),
    });
    const d = value ? fromValue(value) : new Date();
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setOpen(true);
  }

  // close on outside click, Escape, scroll or resize
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!popoverRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    };
    const onScroll = (e: Event) => {
      if (!popoverRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  // days to show: blanks up to the month's first weekday (Monday first), then each day
  const firstWeekday = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  const isCurrentMonth = month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth();

  const buttonLabel = value
    ? `From ${fromValue(value).toLocaleDateString([], { day: "numeric", month: "short" })}`
    : "Latest";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={value ? `Start date: ${buttonLabel}. Change start date` : "Choose a start date"}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
          value
            ? "border-[#2f9e5b] text-[#d9ffe6]"
            : "border-[#2f9e5b]/30 text-[#d9ffe6]/60 hover:bg-[#2f9e5b]/15 hover:text-[#d9ffe6]"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="2" y="3" width="12" height="11" rx="2" />
          <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" strokeLinecap="round" />
        </svg>
        {buttonLabel}
        <span aria-hidden="true" className="text-[10px]">▾</span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Choose a start date"
          className="fixed z-50 rounded-lg border border-[#2f9e5b]/30 bg-black/85 backdrop-blur-sm p-3 text-[#d9ffe6] shadow-xl"
          style={{ ...position, width: POPOVER_WIDTH }}
        >
          {/* month navigation */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              aria-label="Previous month"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#d9ffe6]/70 hover:bg-[#2f9e5b]/15"
            >
              ‹
            </button>
            <p className="text-sm font-semibold">
              {month.toLocaleDateString([], { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              disabled={isCurrentMonth}
              aria-label="Next month"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#d9ffe6]/70 hover:bg-[#2f9e5b]/15 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ›
            </button>
          </div>

          {/* day grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1 text-[10px] font-semibold text-[#d9ffe6]/40">
                {d}
              </span>
            ))}
            {cells.map((date, i) => {
              if (!date) return <span key={`blank-${i}`} />;
              const v = toValue(date);
              const isSelected = v === value;
              const isFuture = v > today;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => pick(v)}
                  disabled={isFuture}
                  aria-pressed={isSelected}
                  aria-label={date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
                  className={`h-8 rounded-md text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${
                    isSelected
                      ? "bg-[#2f9e5b] font-semibold text-black"
                      : v === today
                        ? "border border-[#2f9e5b]/60 hover:bg-[#2f9e5b]/15"
                        : "hover:bg-[#2f9e5b]/15"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* deselect: back to the latest period, counting back from today */}
          <button
            type="button"
            onClick={() => pick("")}
            disabled={!value}
            className="mt-3 w-full rounded-md border border-[#2f9e5b]/30 py-1.5 text-xs text-[#d9ffe6]/70 hover:bg-[#2f9e5b]/15 hover:text-[#d9ffe6] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Deselect · show latest
          </button>
        </div>
      )}
    </>
  );
}
