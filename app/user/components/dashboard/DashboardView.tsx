// components/dashboard/DashboardView.tsx
"use client";

import { useState } from "react";
import GraphsSection from "./GraphsSection";
import CompareStocksSection from "./CompareStocksSection";
import WhatHappenedSection from "./WhatHappenedSection";
import TickerBar from "./TickerBar";

// the dashboard is split into one section at a time instead of one long scroll
const SECTIONS = [
  { key: "markets", label: "Markets", hint: "Live charts", Component: GraphsSection },
  { key: "compare", label: "Compare", hint: "Side by side", Component: CompareStocksSection },
  { key: "what-happened", label: "What Happened", hint: "News by day", Component: WhatHappenedSection },
];

export default function DashboardView() {
  const [active, setActive] = useState(SECTIONS[0].key);
  const { Component } = SECTIONS.find((s) => s.key === active)!;

  return (
    <div className="flex flex-col gap-6">
      <TickerBar />

      {/* section picker: numbered like terminal menu options. one compact row on phones */}
      <div role="tablist" aria-label="Dashboard sections" className="grid grid-cols-3 gap-2 sm:gap-3">
        {SECTIONS.map((section, i) => {
          const isActive = section.key === active;
          return (
            <button
              key={section.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(section.key)}
              className={`flex flex-col gap-0.5 rounded-md border px-2 py-2 text-left font-mono transition sm:flex-row sm:items-baseline sm:gap-3 sm:px-4 sm:py-3 ${
                isActive
                  ? "border-[#2f9e5b] bg-[#2f9e5b]/15 shadow-[0_0_14px_rgba(47,158,91,0.35)]"
                  : "border-[#2f9e5b]/25 bg-black/20 hover:border-[#2f9e5b]/60"
              }`}
            >
              <span className="text-xs text-[#2f9e5b]">0{i + 1}</span>
              <span className="flex flex-col">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider sm:text-sm sm:tracking-[0.2em] ${
                    isActive ? "text-[#d9ffe6]" : "text-[#2f9e5b]"
                  }`}
                >
                  {section.label}
                </span>
                <span className="hidden text-xs text-[#d9ffe6]/50 sm:inline">{section.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        <Component />
      </div>
    </div>
  );
}
