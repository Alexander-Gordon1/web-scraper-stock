// components/dashboard/TabNav.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import BackgroundRain from "@/app/user/components/BackgroundRain";

type TabNavProperties = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "personal-feed", label: "Personal Feed", short: "Feed" }, // short = label on phones
  { key: "explore-feed", label: "Invest" },
  { key: "pi5", label: "Pi-5" },
];

export default function TabNav({ activeTab, onTabChange }: TabNavProperties) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    // phones: logo + profile on the first row, tabs on a full-width row underneath
    <nav className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-y-3 border-b border-[#2f9e5b]/30 bg-black/40 px-4 py-3 backdrop-blur-sm lg:flex-nowrap lg:px-6">
      {/* slow rain behind the nav. -z-10 keeps it under the logo and tabs but above the
          nav's own background (sticky + z-40 make the nav its own stacking layer) */}
      <BackgroundRain className="absolute inset-0 -z-10" />

      {/* Left: Site name, in the terminal style of the login page */}
      <div className="flex items-center gap-2 whitespace-nowrap font-mono text-lg font-bold tracking-wider">
        <span aria-hidden="true" className="text-[#2f9e5b]">
          &gt;
        </span>
        <span className="text-primary">Market Rewind</span>
        <span
          aria-hidden="true"
          className="h-5 w-2.5 animate-pulse bg-[#2f9e5b]"
        />
      </div>

      {/* Center: Tab buttons */}
      <div className="order-last grid w-full grid-cols-4 gap-1 lg:order-none lg:flex lg:w-auto lg:gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            aria-current={activeTab === tab.key ? "page" : undefined}
            className={`rounded-md border px-1 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition lg:px-4 lg:text-xs lg:tracking-[0.2em] ${
              activeTab === tab.key
                ? "border-[#2f9e5b] bg-[#2f9e5b]/15 text-[#d9ffe6] shadow-[0_0_14px_rgba(47,158,91,0.45)]"
                : "border-transparent text-[#2f9e5b] hover:border-[#2f9e5b]/40 hover:text-[#d9ffe6]"
            }`}
          >
            {tab.short ? (
              <>
                <span className="lg:hidden">{tab.short}</span>
                <span className="hidden lg:inline">{tab.label}</span>
              </>
            ) : (
              tab.label
            )}
          </button>
        ))}
      </div>

      {/* Right: Profile button + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          aria-label="Account menu"
          className="h-9 w-9 overflow-hidden rounded-full border border-[#2f9e5b]/60 bg-[#2f9e5b]/20 transition hover:border-[#2f9e5b] hover:shadow-[0_0_14px_rgba(47,158,91,0.45)]"
        >
          {/* Replace with real image => <img src="..." />*/}
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border border-[#2f9e5b]/40 bg-black/80 py-1 font-mono shadow-lg backdrop-blur-sm">
            <a
              href="/user/settings"
              className="block px-4 py-2 text-sm text-[#d9ffe6] hover:bg-[#2f9e5b]/15"
            >
              Account Settings
            </a>
            <hr className="my-1 border-[#2f9e5b]/30" />
            <a
              href="/user/login"
              className="block px-4 py-2 text-sm text-red-400 hover:bg-red-950/50"
            >
              Sign out
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
