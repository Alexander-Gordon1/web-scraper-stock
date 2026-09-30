// components/dashboard/PersonalDashComponents/CompareStocksSection.tsx
"use client";

import { useState } from "react";
import StockChart from "./StockChart";
import SelectBox from "./SelectBox";
import DateBox from "./DateBox";
import { TICKER_OPTIONS } from "@/app/user/lib/tickers";
import { TIME_RANGES, isTimeRange, type TimeRange } from "@/app/user/lib/timeRanges";

const SLOTS = 3;

// how many columns the graphs take up, depending on how many are picked
const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
};

export default function CompareStocksSection() {
  // "" = nothing picked in that box
  const [slots, setSlots] = useState<string[]>(Array(SLOTS).fill(""));
  const [range, setRange] = useState<TimeRange>("1D");
  const [start, setStart] = useState(""); // "" = show the most recent period

  const selected = slots.filter((s) => s !== "");

  function setSlot(index: number, symbol: string) {
    setSlots((prev) => prev.map((s, i) => (i === index ? symbol : s)));
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#E5EAF5] mb-2">Compare stocks</h3>

      {/* three ticker boxes + the time period and start date boxes */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {slots.map((value, i) => (
          <SelectBox key={i} label={`Stock ${i + 1}`} value={value} onChange={(v) => setSlot(i, v)}>
            <option value="">{value ? "None" : "Select a ticker"}</option>
            {TICKER_OPTIONS.map((symbol) => (
              // a ticker already picked in another box can't be picked twice
              <option key={symbol} value={symbol} disabled={symbol !== value && slots.includes(symbol)}>
                {symbol}
              </option>
            ))}
          </SelectBox>
        ))}

        <SelectBox label="Time period" value={range} onChange={(v) => isTimeRange(v) && setRange(v)}>
          {(Object.keys(TIME_RANGES) as TimeRange[]).map((key) => (
            <option key={key} value={key}>
              {TIME_RANGES[key].label}
            </option>
          ))}
        </SelectBox>

        <DateBox label="Start date" value={start} onChange={setStart} />
      </div>

      {/* the picked stocks' graphs, sized to fit 1, 2 or 3 side by side */}
      {selected.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-[#D0BDF4]/50 p-6 text-center text-sm text-[#E5EAF5]/60">
          Pick up to three tickers above to compare them.
        </div>
      ) : (
        <div className={`mt-3 grid gap-3 ${GRID_COLS[selected.length]}`}>
          {selected.map((symbol) => (
            // key by symbol so a chart swapped to a new ticker starts fresh
            <StockChart key={symbol} symbol={symbol} range={range} start={start || undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
