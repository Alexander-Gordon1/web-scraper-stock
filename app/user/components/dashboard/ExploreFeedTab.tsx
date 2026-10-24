// components/dashboard/ExploreFeedTab.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { TICKER_OPTIONS, TICKER_CATEGORIES } from "@/app/user/lib/tickers";
import StockCard, { type StockQuote } from "./InvestComponents/StockCard";
import InvestSidebar, { type SidebarItem } from "./InvestComponents/InvestSidebar";
import BankAccount from "./InvestComponents/BankAccount";
import BuyStockDialog from "./InvestComponents/BuyStockDialog";
import YourInvestments from "./InvestComponents/YourInvestments";
import SectionIntro from "./PersonalDashComponents/SectionIntro";

const ALL_STOCKS = "all-stocks";
const YOUR_INVESTMENTS = "your-investments";
const BANK_ACCOUNT = "bank-account";
const VISIBLE_ROWS = 3; // card area scrolls after this many rows

export default function ExploreFeedTab() {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // which sidebar item is showing: ALL_STOCKS or a category name
  const [activeView, setActiveView] = useState(ALL_STOCKS);
  const cardAreaRef = useRef<HTMLDivElement>(null);
  const [cardAreaHeight, setCardAreaHeight] = useState<number>();
  // the stock whose buy pop-up is open
  const [buying, setBuying] = useState<StockQuote | null>(null);

  useEffect(() => {
    // latest quote for every stock we track
    fetch("/user/api/getTickersFromDatabase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickers: TICKER_OPTIONS }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { quotes: StockQuote[] }) => setQuotes(data.quotes))
      .catch(() => setError("Failed to load stocks."))
      .finally(() => setLoading(false));
  }, []);

  // cap the card area at VISIBLE_ROWS rows of cards (counting the headings in between),
  // measured from where the cards actually sit so it stays right as the layout changes
  useEffect(() => {
    const area = cardAreaRef.current;
    if (!area) return;

    function measure() {
      if (!area) return;
      const areaTop = area.getBoundingClientRect().top - area.scrollTop;
      // bottom edge of each row of cards, top to bottom
      const rowBottoms = [
        ...new Set(
          [...area.querySelectorAll<HTMLElement>("[data-stock-card]")].map((card) =>
            Math.round(card.getBoundingClientRect().bottom - areaTop)
          )
        ),
      ].sort((x, y) => x - y);
      // fewer rows than the limit = no need to scroll. phones (one card per row) skip the cap,
      // since a small scroll box inside the page is awkward to swipe through
      const isPhone = !window.matchMedia("(min-width: 768px)").matches;
      setCardAreaHeight(!isPhone && rowBottoms.length > VISIBLE_ROWS ? rowBottoms[VISIBLE_ROWS - 1] : undefined);
    }

    measure();
    // re-measure when the window (and so cards per row) changes size
    const observer = new ResizeObserver(measure);
    observer.observe(area.parentElement ?? area);
    return () => observer.disconnect();
  }, [quotes, activeView]);

  // group cards by sector, sectors and tickers alphabetical
  const bySector = new Map<string, StockQuote[]>();
  for (const quote of [...quotes].sort((a, b) => a.symbol.localeCompare(b.symbol))) {
    // older cron rows were saved without a category, so fall back to the ticker list
    const sector = quote.category ?? TICKER_CATEGORIES[quote.symbol] ?? "Other";
    bySector.set(sector, [...(bySector.get(sector) ?? []), quote]);
  }
  const sectors = [...bySector.keys()].sort();
  const shownSectors = activeView === ALL_STOCKS ? sectors : sectors.filter((s) => s === activeView);

  // each inner list is a separate block in the sidebar
  const sidebarGroups: SidebarItem[][] = [
    [
      { key: ALL_STOCKS, label: "All stocks" },
      ...sectors.map((sector) => ({ key: sector, label: sector })),
    ],
    [
      { key: YOUR_INVESTMENTS, label: "Your investments" },
      { key: BANK_ACCOUNT, label: "Bank account" },
    ],
  ];

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <InvestSidebar groups={sidebarGroups} activeKey={activeView} onSelect={setActiveView} />

      <div className="flex min-w-0 flex-1 flex-col gap-8">
        {activeView === BANK_ACCOUNT ? (
          <BankAccount />
        ) : activeView === YOUR_INVESTMENTS ? (
          <YourInvestments quotes={quotes} />
        ) : (
          <>
            <SectionIntro title="Invest">
              Here you can use the knowledge you have gained viewing the news and stocks and put your money
              where your mouth is. Press Buy on any stock to invest with your bank balance.
            </SectionIntro>

            {loading && <p className="text-center text-[#d9ffe6]/60">Loading stocks…</p>}
            {error && <p className="text-center text-red-400">{error}</p>}

            <div
              ref={cardAreaRef}
              style={{ maxHeight: cardAreaHeight }}
              className="flex flex-col gap-8 overflow-y-auto overscroll-contain pr-2"
            >
              {shownSectors.map((sector) => (
                <section key={sector}>
                  <h2 className="mb-3 font-mono text-lg font-bold tracking-wider">{sector}</h2>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(0,380px))] gap-4">
                    {bySector.get(sector)!.map((quote) => (
                      <StockCard key={quote.symbol} quote={quote} onBuy={setBuying} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>

      {buying && <BuyStockDialog quote={buying} onClose={() => setBuying(null)} />}
    </div>
  );
}
