"use client";

import { useCallback, useEffect, useState } from "react";
import type { StockQuote } from "./StockCard";
import { formatShares, money } from "./format";
import SellStockDialog from "./SellStockDialog";

// one row of the stock_purchases or stock_sales table (numeric columns can come back as strings)
type PurchaseRow = {
  id: string;
  symbol: string;
  quantity: number | string;
  price_per_share: number | string;
  purchased_at: string;
};
type SaleRow = Omit<PurchaseRow, "purchased_at"> & { sold_at: string };

// a buy or a sell, for the history table and for working out holdings
type Trade = {
  id: string;
  type: "Buy" | "Sell";
  symbol: string;
  quantity: number;
  price: number;
  at: string;
};

// what's left of one stock after all its buys and sells
type Holding = {
  symbol: string;
  shares: number;
  cost: number; // what the shares still held cost
  price: number | null; // latest price, null if we have no quote for it
};

// smaller than the 6 decimal places shares are stored to, so counts as none left
const NO_SHARES = 1e-9;

const percent = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const gainClass = (n: number) => (n >= 0 ? "text-[#2f9e5b]" : "text-red-400");

const thClass = "px-3 py-2 font-medium text-[#d9ffe6]/60";
const tdClass = "px-3 py-2.5 font-mono";
const numClass = `${tdClass} text-[#d9ffe6]`; // plain number cells

// the logged-in user's stocks: totals, one row per stock held (with a sell button), and every buy and sell
export default function YourInvestments({ quotes }: { quotes: StockQuote[] }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // the holding whose sell pop-up is open
  const [selling, setSelling] = useState<Holding | null>(null);

  const loadTrades = useCallback(() => {
    fetch("/user/api/investments")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const buys: Trade[] = (data.purchases as PurchaseRow[]).map((p) => ({
          id: p.id,
          type: "Buy",
          symbol: p.symbol,
          quantity: Number(p.quantity),
          price: Number(p.price_per_share),
          at: p.purchased_at,
        }));
        const sells: Trade[] = (data.sales as SaleRow[]).map((s) => ({
          id: s.id,
          type: "Sell",
          symbol: s.symbol,
          quantity: Number(s.quantity),
          price: Number(s.price_per_share),
          at: s.sold_at,
        }));
        // newest first
        setTrades([...buys, ...sells].sort((a, b) => b.at.localeCompare(a.at)));
        setError("");
      })
      .catch((err: Error) => setError(err.message || "Failed to load your investments."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const priceBySymbol = new Map(quotes.map((q) => [q.symbol, Number(q.current_price)]));

  // replay every trade oldest first. selling takes out cost at the average price paid
  // (average cost method), so the avg cost of the shares left doesn't change
  const holdingsBySymbol = new Map<string, Holding>();
  let realisedGain = 0;
  for (const t of [...trades].reverse()) {
    const h = holdingsBySymbol.get(t.symbol) ?? {
      symbol: t.symbol,
      shares: 0,
      cost: 0,
      price: priceBySymbol.get(t.symbol) ?? null,
    };
    if (t.type === "Buy") {
      h.shares += t.quantity;
      h.cost += t.quantity * t.price;
    } else {
      const avgCost = h.shares > 0 ? h.cost / h.shares : 0;
      realisedGain += t.quantity * (t.price - avgCost);
      h.shares -= t.quantity;
      h.cost -= t.quantity * avgCost;
      if (h.shares < NO_SHARES) {
        h.shares = 0;
        h.cost = 0;
      }
    }
    holdingsBySymbol.set(t.symbol, h);
  }
  const holdings = [...holdingsBySymbol.values()]
    .filter((h) => h.shares >= NO_SHARES)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
  const hasSales = trades.some((t) => t.type === "Sell");

  // a stock with no current price counts at what was paid for it
  const valueOf = (h: Holding) => (h.price === null ? h.cost : h.shares * h.price);
  const totalCost = holdings.reduce((sum, h) => sum + h.cost, 0);
  const totalValue = holdings.reduce((sum, h) => sum + valueOf(h), 0);
  const totalGain = totalValue - totalCost;

  const summary = [
    { label: "Invested", value: money(totalCost) },
    { label: "Current value", value: money(totalValue) },
    {
      label: "Total gain / loss",
      value: `${money(totalGain)} (${percent(totalCost ? (totalGain / totalCost) * 100 : 0)})`,
      className: gainClass(totalGain),
    },
    // profit or loss already locked in by selling
    ...(hasSales
      ? [{ label: "Realised gain / loss", value: money(realisedGain), className: gainClass(realisedGain) }]
      : []),
  ];

  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-mono text-lg font-bold tracking-wider">Your investments</h2>

      {loading && <p className="text-[#d9ffe6]/60">Loading your investments…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && trades.length === 0 && (
        <p className="text-[#d9ffe6]/60">You haven&apos;t bought any stocks yet. Press Buy on a stock to get started.</p>
      )}

      {trades.length > 0 && (
        <>
          {/* totals */}
          <dl className="flex flex-wrap gap-x-10 gap-y-3">
            {summary.map((item) => (
              <div key={item.label}>
                <dt className="text-sm text-[#d9ffe6]/60">{item.label}</dt>
                <dd className={`font-mono text-[22px] ${item.className ?? "text-[#d9ffe6]"}`}>{item.value}</dd>
              </div>
            ))}
          </dl>

          {/* one row per stock still held */}
          <div>
            <h3 className="mb-2 font-mono text-sm font-bold uppercase tracking-[0.2em] text-[#2f9e5b]">Holdings</h3>
            {holdings.length === 0 ? (
              <p className="text-[#d9ffe6]/60">You don&apos;t own any stocks right now.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-[#2f9e5b]/30">
                <table className="w-full text-right text-sm">
                  <thead className="border-b border-[#2f9e5b]/30 bg-[#2f9e5b]/10">
                    <tr>
                      <th className={`${thClass} text-left`}>Stock</th>
                      <th className={thClass}>Shares</th>
                      <th className={thClass}>Avg cost</th>
                      <th className={thClass}>Price</th>
                      <th className={thClass}>Value</th>
                      <th className={thClass}>Gain / loss</th>
                      <th className={thClass}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2f9e5b]/15">
                    {holdings.map((h) => {
                      const gain = valueOf(h) - h.cost;
                      return (
                        <tr key={h.symbol} className="hover:bg-[#2f9e5b]/10">
                          <td className="px-3 py-2.5 text-left font-semibold text-[#d9ffe6]">{h.symbol}</td>
                          <td className={numClass}>{formatShares(h.shares)}</td>
                          <td className={numClass}>{money(h.cost / h.shares)}</td>
                          <td className={numClass}>{h.price === null ? "—" : money(h.price)}</td>
                          <td className={`${tdClass} text-[#d9ffe6]`}>{money(valueOf(h))}</td>
                          <td className={`${tdClass} ${gainClass(gain)}`}>
                            {money(gain)} ({percent(h.cost ? (gain / h.cost) * 100 : 0)})
                          </td>
                          <td className="px-3 py-1.5">
                            <button
                              type="button"
                              onClick={() => setSelling(h)}
                              disabled={h.price === null}
                              title={h.price === null ? "No current price for this stock" : undefined}
                              className="rounded-md border border-[#2f9e5b]/60 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-[#d9ffe6] transition hover:border-[#2f9e5b] hover:bg-[#2f9e5b] hover:text-black hover:shadow-[0_0_14px_rgba(47,158,91,0.45)] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#d9ffe6] disabled:hover:shadow-none"
                            >
                              Sell
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* every buy and sell */}
          <div>
            <h3 className="mb-2 font-mono text-sm font-bold uppercase tracking-[0.2em] text-[#2f9e5b]">History</h3>
            <div className="max-h-80 overflow-auto overscroll-contain rounded-md border border-[#2f9e5b]/30">
              <table className="w-full text-right text-sm">
                <thead className="sticky top-0 border-b border-[#2f9e5b]/30 bg-[#141714]">
                  <tr>
                    <th className={`${thClass} text-left`}>Date</th>
                    <th className={`${thClass} text-left`}>Type</th>
                    <th className={`${thClass} text-left`}>Stock</th>
                    <th className={thClass}>Shares</th>
                    <th className={thClass}>Price</th>
                    <th className={thClass}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2f9e5b]/15">
                  {trades.map((t) => (
                    <tr key={`${t.type}-${t.id}`} className="hover:bg-[#2f9e5b]/10">
                      <td className="px-3 py-2.5 text-left text-[#d9ffe6]/80">{new Date(t.at).toLocaleString()}</td>
                      <td
                        className={`px-3 py-2.5 text-left font-semibold ${
                          t.type === "Buy" ? "text-[#2f9e5b]" : "text-amber-400"
                        }`}
                      >
                        {t.type}
                      </td>
                      <td className="px-3 py-2.5 text-left font-semibold text-[#d9ffe6]">{t.symbol}</td>
                      <td className={numClass}>{formatShares(t.quantity)}</td>
                      <td className={numClass}>{money(t.price)}</td>
                      <td className={numClass}>{money(t.quantity * t.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selling && selling.price !== null && (
        <SellStockDialog
          symbol={selling.symbol}
          sharesOwned={selling.shares}
          price={selling.price}
          onClose={() => setSelling(null)}
          onSold={loadTrades}
        />
      )}
    </section>
  );
}
