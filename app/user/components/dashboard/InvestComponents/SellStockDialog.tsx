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
  "w-full rounded-md border border-[#2f9e5b]/30 bg-black/20 px-3 py-2 font-mono text-[#d9ffe6] caret-[#2f9e5b] focus:border-[#2f9e5b] focus:shadow-[0_0_14px_rgba(47,158,91,0.35)] focus:outline-none";

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
      className="m-auto w-[min(400px,calc(100vw-32px))] rounded-md border border-[#2f9e5b]/50 bg-[#141714] p-0 text-[#d9ffe6] shadow-[0_0_30px_rgba(47,158,91,0.25)] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      {/* padding lives here so clicks on it aren't mistaken for backdrop clicks */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="sell-stock-title" className="font-mono text-[22px] font-bold tracking-widest">
            Sell {symbol}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="rounded-md px-2 text-xl text-[#d9ffe6]/70 transition-colors hover:bg-[#2f9e5b]/15 hover:text-[#d9ffe6]"
          >
            ×
          </button>
        </div>

        {sale ? (
          // done: show what was sold
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-[#2f9e5b]">
              Sold {formatShares(sale.quantity)} {symbol} share{sale.quantity === 1 ? "" : "s"} at{" "}
              {money(sale.pricePerShare)} for {money(sale.total)}.
            </p>
            <p>
              New balance: <span className="font-mono text-[#d9ffe6]">{money(sale.balance)}</span>
            </p>
            <p>
              {symbol} shares left: <span className="font-mono text-[#d9ffe6]">{formatShares(sale.sharesLeft)}</span>
            </p>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="self-end rounded-md border border-[#2f9e5b] bg-[#2f9e5b]/15 px-4 py-1.5 text-sm font-mono font-bold uppercase tracking-widest text-[#d9ffe6] transition hover:bg-[#2f9e5b] hover:text-black hover:shadow-[0_0_14px_rgba(47,158,91,0.45)]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSell} className="mt-4 flex flex-col gap-4">
            <dl className="flex flex-col gap-2">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-4">
                  <dt className="text-[#d9ffe6]/60">{row.label}</dt>
                  <dd className="font-mono text-[#d9ffe6]">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex items-end gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1 font-mono text-xs uppercase tracking-[0.2em] text-[#2f9e5b]">
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
              <label className="flex min-w-0 flex-1 flex-col gap-1 font-mono text-xs uppercase tracking-[0.2em] text-[#2f9e5b]">
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
                className="rounded-md border border-[#2f9e5b]/30 px-3 py-2 text-sm transition-colors hover:bg-[#2f9e5b]/15"
              >
                Max
              </button>
            </div>

            <div className="flex justify-between gap-4 border-t border-[#2f9e5b]/30 pt-3">
              <span className="text-[#d9ffe6]/60">You receive</span>
              <span className="font-mono text-[#d9ffe6]">{validQuantity ? money(proceeds) : "—"}</span>
            </div>
            {validQuantity && (
              <div className="-mt-3 flex justify-between gap-4 text-sm">
                <span className="text-[#d9ffe6]/60">Shares left</span>
                <span className="font-mono text-[#d9ffe6]/80">{formatShares(maxShares - quantity)}</span>
              </div>
            )}
            {shares !== "" && quantityError && <p className="-mt-2 text-sm text-red-400">{quantityError}</p>}

            {sellError && <p className="text-sm text-red-400">{sellError}</p>}

            <button
              type="submit"
              disabled={!validQuantity || selling}
              className="rounded-md border border-[#2f9e5b] bg-[#2f9e5b]/15 px-4 py-2 font-mono font-bold uppercase tracking-widest text-[#d9ffe6] transition hover:bg-[#2f9e5b] hover:text-black hover:shadow-[0_0_14px_rgba(47,158,91,0.45)] disabled:opacity-50 disabled:hover:bg-[#2f9e5b]/15 disabled:hover:text-[#d9ffe6] disabled:hover:shadow-none"
            >
              {selling ? "Selling…" : validQuantity ? `Sell for ${money(proceeds)}` : "Sell"}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}
