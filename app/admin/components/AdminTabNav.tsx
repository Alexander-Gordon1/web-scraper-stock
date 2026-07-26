// components/admin/AdminTabNav.tsx
"use client";

type TabNavProperties = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

const TABS = [
  { key: "controlPanel", label: "Control Panel" },
  { key: "accounts", label: "Accounts" },
  { key: "scrapers", label: "Scrapers" },
  { key: "rssControl", label: "RSS Control" },
];

export default function AdminTabNav({ activeTab, onTabChange }: TabNavProperties) {
  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-[#262826] border-b border-gray-200">
      <div> </div>
      {/* Center: Tab buttons */}
      <div className="flex width-100 gap-1 bg-[#262826] p-1 rounded-lg">
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
      <div> </div>
    </nav>
  );
}
