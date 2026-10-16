"use client";

import { useEffect, useRef, useState } from "react";
import { MIN_ORDER, SHARE_DECIMALS, SHARES_PATTERN, floorShares, formatShares, money } from "./format";

type SellStockDialogProps = {
  symbol: string;
  sharesOwned: number;
  price: number; // latest price per share
  onClose: () => void;
  onSold: () => void; // called after a sale goes through, so the page can reload
};

type Sale = {
  quantity: number;
  pricePerShare: number;
  total: number;
  balance: number;
  sharesLeft: number;
};

const inputClass =
  "w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 font-mono text-white focus:border-[#9085e9] focus:outline-none";

// pop-up for selling whole or fractional shares of a stock the user owns
export default function SellStockDialog({ symbol, sharesOwned, price, onClose, onSold }: SellStockDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // shares and dollar amount are linked: typing in one fills in the other
  const [shares, setShares] = useState("");
  const [amount, setAmount] = useState("");
  const [selling, setSelling] = useState(false);
  const [sellError, setSellError] = useState("");
  const [sale, setSale] = useState<Sale | null>(null);

  // showModal gives us the backdrop, Esc to close, and keeps focus inside the pop-up
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // owned shares rounded to what the database stores, so "Max" matches it exactly
  const maxShares = Number(formatShares(sharesOwned));
  const quantity = Number(shares);
  const proceeds = Math.round(quantity * price * 100) / 100;

  // why the current entry can't be sold ("" = it can)
  let quantityError = "";
  if (!SHARES_PATTERN.test(shares)) quantityError = `Shares can have up to ${SHARE_DECIMALS} decimal places.`;
  else if (quantity > maxShares) quantityError = `You only own ${formatShares(maxShares)} shares.`;
  else if (proceeds < MIN_ORDER) quantityError = `The smallest order is ${money(MIN_ORDER)}.`;
  const validQuantity = shares !== "" && quantity > 0 && !quantityError;

  function handleSharesChange(value: string) {
    setShares(value);
    const n = Number(value);
    setAmount(value && n > 0 ? (n * price).toFixed(2) : "");
  }

  function handleAmountChange(value: string) {
    setAmount(value);
    const n = Number(value);
    setShares(value && n > 0 ? formatShares(floorShares(n / price)) : "");
  }

  function fillMax() {
    setShares(formatShares(maxShares));
    setAmount((maxShares * price).toFixed(2));
  }

  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    if (!validQuantity) return;
    setSelling(true);
    setSellError("");
    try {
      const res = await fetch("/user/api/sellStock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, quantity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSale(data);
      onSold();
    } catch (err) {
      setSellError((err as Error).message || "Failed to sell stock.");
    } finally {
      setSelling(false);
    }
  }

  const rows = [
    { label: "Price per share", value: money(price) },
    { label: "Shares you own", value: formatShares(maxShares) },
    { label: "Worth now", value: money(maxShares * price) },
  ];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()} // click on the backdrop
      aria-labelledby="sell-stock-title"
      className="m-auto w-[min(400px,calc(100vw-32px))] rounded-lg border border-white/10 bg-[#2f3130] p-0 text-[#E5EAF5] backdrop:bg-black/60"
    >
      {/* padding lives here so clicks on it aren't mistaken for backdrop clicks */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="sell-stock-title" className="text-[22px] font-bold tracking-wide">
            Sell {symbol}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="rounded-md px-2 text-xl text-[#E5EAF5]/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        {sale ? (
          // done: show what was sold
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-green-500">
              Sold {formatShares(sale.quantity)} {symbol} share{sale.quantity === 1 ? "" : "s"} at{" "}
              {money(sale.pricePerShare)} for {money(sale.total)}.
            </p>
            <p>
              New balance: <span className="font-mono text-white">{money(sale.balance)}</span>
            </p>
            <p>
              {symbol} shares left: <span className="font-mono text-white">{formatShares(sale.sharesLeft)}</span>
            </p>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="self-end rounded-md bg-[#9085e9] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#7b6fe0]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSell} className="mt-4 flex flex-col gap-4">
            <dl className="flex flex-col gap-2">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-4">
                  <dt className="text-[#E5EAF5]/60">{row.label}</dt>
                  <dd className="font-mono text-white">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex items-end gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-[#E5EAF5]/80">
                Shares
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.5"
                  value={shares}
                  onChange={(e) => handleSharesChange(e.target.value.trim())}
                  autoFocus
                  className={inputClass}
                />
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-[#E5EAF5]/80">
                Amount ($)
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="100.00"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value.trim())}
                  className={inputClass}
                />
              </label>
              <button
                type="button"
                onClick={fillMax}
                className="rounded-md border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/10"
              >
                Max
              </button>
            </div>

            <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
              <span className="text-[#E5EAF5]/60">You receive</span>
              <span className="font-mono text-white">{validQuantity ? money(proceeds) : "—"}</span>
            </div>
            {validQuantity && (
              <div className="-mt-3 flex justify-between gap-4 text-sm">
                <span className="text-[#E5EAF5]/60">Shares left</span>
                <span className="font-mono text-[#E5EAF5]/80">{formatShares(maxShares - quantity)}</span>
              </div>
            )}
            {shares !== "" && quantityError && <p className="-mt-2 text-sm text-red-400">{quantityError}</p>}

            {sellError && <p className="text-sm text-red-400">{sellError}</p>}

            <button
              type="submit"
              disabled={!validQuantity || selling}
              className="rounded-md bg-[#9085e9] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#7b6fe0] disabled:opacity-50 disabled:hover:bg-[#9085e9]"
            >
              {selling ? "Selling…" : validQuantity ? `Sell for ${money(proceeds)}` : "Sell"}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}
