"use client";

import { useEffect, useState } from "react";
import type { StockQuote } from "./StockCard";
import { formatShares, money } from "./format";

// one row of the stock_purchases table (numeric columns can come back as strings)
type PurchaseRow = {
  id: string;
  symbol: string;
  quantity: number | string;
  price_per_share: number | string;
  purchased_at: string;
};

// all purchases of one stock added together
type Holding = {
  symbol: string;
  shares: number;
  cost: number; // total paid
  price: number | null; // latest price, null if we have no quote for it
};

const percent = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const gainClass = (n: number) => (n >= 0 ? "text-green-500" : "text-red-500");

const thClass = "px-3 py-2 font-medium text-[#E5EAF5]/60";
const tdClass = "px-3 py-2.5 font-mono";
const numClass = `${tdClass} text-[#E5EAF5]`; // plain number cells

// the logged-in user's stocks: totals, one row per stock held, and every purchase
export default function YourInvestments({ quotes }: { quotes: StockQuote[] }) {
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/user/api/investments")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPurchases(data.purchases);
      })
      .catch((err: Error) => setError(err.message || "Failed to load your investments."))
      .finally(() => setLoading(false));
  }, []);

  const priceBySymbol = new Map(quotes.map((q) => [q.symbol, Number(q.current_price)]));

  const holdingsBySymbol = new Map<string, Holding>();
  for (const p of purchases) {
    const holding = holdingsBySymbol.get(p.symbol) ?? {
      symbol: p.symbol,
      shares: 0,
      cost: 0,
      price: priceBySymbol.get(p.symbol) ?? null,
    };
    holding.shares += Number(p.quantity);
    holding.cost += Number(p.quantity) * Number(p.price_per_share);
    holdingsBySymbol.set(p.symbol, holding);
  }
  const holdings = [...holdingsBySymbol.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));

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
  ];

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">Your investments</h2>

      {loading && <p className="text-[#E5EAF5]/60">Loading your investments…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && purchases.length === 0 && (
        <p className="text-[#E5EAF5]/60">You haven&apos;t bought any stocks yet. Press Buy on a stock to get started.</p>
      )}

      {holdings.length > 0 && (
        <>
          {/* totals */}
          <dl className="flex flex-wrap gap-x-10 gap-y-3">
            {summary.map((item) => (
              <div key={item.label}>
                <dt className="text-sm text-[#E5EAF5]/60">{item.label}</dt>
                <dd className={`font-mono text-[22px] ${item.className ?? "text-white"}`}>{item.value}</dd>
              </div>
            ))}
          </dl>

          {/* one row per stock */}
          <div>
            <h3 className="mb-2 font-semibold">Holdings</h3>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-right text-sm">
                <thead className="border-b border-white/10 bg-white/5">
                  <tr>
                    <th className={`${thClass} text-left`}>Stock</th>
                    <th className={thClass}>Shares</th>
                    <th className={thClass}>Avg cost</th>
                    <th className={thClass}>Price</th>
                    <th className={thClass}>Value</th>
                    <th className={thClass}>Gain / loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {holdings.map((h) => {
                    const gain = valueOf(h) - h.cost;
                    return (
                      <tr key={h.symbol} className="hover:bg-white/5">
                        <td className="px-3 py-2.5 text-left font-semibold text-white">{h.symbol}</td>
                        <td className={numClass}>{formatShares(h.shares)}</td>
                        <td className={numClass}>{money(h.cost / h.shares)}</td>
                        <td className={numClass}>{h.price === null ? "—" : money(h.price)}</td>
                        <td className={`${tdClass} text-white`}>{money(valueOf(h))}</td>
                        <td className={`${tdClass} ${gainClass(gain)}`}>
                          {money(gain)} ({percent((gain / h.cost) * 100)})
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* every purchase */}
          <div>
            <h3 className="mb-2 font-semibold">Purchase history</h3>
            <div className="max-h-80 overflow-auto overscroll-contain rounded-lg border border-white/10">
              <table className="w-full text-right text-sm">
                <thead className="sticky top-0 border-b border-white/10 bg-[#2f3130]">
                  <tr>
                    <th className={`${thClass} text-left`}>Date</th>
                    <th className={`${thClass} text-left`}>Stock</th>
                    <th className={thClass}>Shares</th>
                    <th className={thClass}>Price paid</th>
                    <th className={thClass}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5">
                      <td className="px-3 py-2.5 text-left text-[#E5EAF5]/80">
                        {new Date(p.purchased_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-left font-semibold text-white">{p.symbol}</td>
                      <td className={numClass}>{formatShares(Number(p.quantity))}</td>
                      <td className={numClass}>{money(Number(p.price_per_share))}</td>
                      <td className={numClass}>{money(Number(p.quantity) * Number(p.price_per_share))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
