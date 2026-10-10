// components/dashboard/TabNav.tsx
"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";

type TabNavProperties = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "personal-feed", label: "Personal Feed" },
  { key: "explore-feed", label: "Invest" },
  { key: "search", label: "Search" },
  { key: "admin", label: "Admin" },
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
    <nav className="flex items-center justify-between px-6 py-3 bg-[#262826] border-b border-gray-200/60">
      {/* Left: Logo / Company name */}
      <div className="flex items-center gap-2">
        <Image
          src="/forge-hammer.svg"
          alt="Logo"
          width={180}
          height={50}
          unoptimized
        />
      </div>

      {/* Center: Tab buttons */}
      <div className="flex gap-1 bg-[#262826] p-1 rounded-lg">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={` rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "px-5 py-2 bg-primary text-black border-4 border-foreground"
                : "px-4 py-1.5 bg-foreground border-[3px] border-background text-white hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right: Profile button + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="w-9 h-9 rounded-full bg-[#8458B3] overflow-hidden border-2 border-transparent hover:border-[#494D5F] transition-colors"
        >
          {/* Replace with real image => <img src="..." />*/}
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-[#494D5F] rounded-lg shadow-lg border border-[#8458B3] py-1 z-50">
            <a
              href="/user/settings"
              className="block px-4 py-2 text-sm text-[#E5EAF5] hover:bg-[#8458B3]"
            >
              Account Settings
            </a>
            <hr className="my-1 border-[#8458B3]" />
            <a
              href="/user/login"
              className="block px-4 py-2 text-sm text-red-400 hover:bg-[#8458B3]"
            >
              Sign out
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
