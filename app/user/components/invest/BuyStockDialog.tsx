"use client";

import { useEffect, useRef, useState } from "react";
import type { StockQuote } from "./StockCard";
import { MIN_ORDER, SHARE_DECIMALS, SHARES_PATTERN, floorShares, formatShares, money } from "./format";

type BuyStockDialogProps = {
  quote: StockQuote;
  onClose: () => void;
};

type Purchase = {
  quantity: number;
  pricePerShare: number;
  total: number;
  balance: number;
};

const inputClass =
  "w-full rounded-md border border-[#2f9e5b]/30 bg-black/20 px-3 py-2 font-mono text-[#d9ffe6] caret-[#2f9e5b] focus:border-[#2f9e5b] focus:shadow-[0_0_14px_rgba(47,158,91,0.35)] focus:outline-none";

// pop-up for buying whole or fractional shares of one stock. shows the user's balance and the most they can afford
export default function BuyStockDialog({ quote, onClose }: BuyStockDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");
  // shares and dollar amount are linked: typing in one fills in the other
  const [shares, setShares] = useState("");
  const [amount, setAmount] = useState("");
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [purchase, setPurchase] = useState<Purchase | null>(null);

  // showModal gives us the backdrop, Esc to close, and keeps focus inside the pop-up
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    fetch("/user/api/bankAccount")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!data.account) throw new Error("Open a bank account in the Bank account section before buying stocks.");
        setBalance(Number(data.account.balance));
      })
      .catch((err: Error) => setLoadError(err.message || "Failed to load your balance."));
  }, []);

  const price = Number(quote.current_price);
  const maxShares = balance === null ? 0 : floorShares(balance / price);
  const quantity = Number(shares);
  const cost = Math.round(quantity * price * 100) / 100;

  // why the current entry can't be bought ("" = it can)
  let quantityError = "";
  if (!SHARES_PATTERN.test(shares)) quantityError = `Shares can have up to ${SHARE_DECIMALS} decimal places.`;
  else if (quantity > maxShares) quantityError = `You can buy at most ${formatShares(maxShares)} shares.`;
  else if (cost < MIN_ORDER) quantityError = `The smallest order is ${money(MIN_ORDER)}.`;
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

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    if (!validQuantity) return;
    setBuying(true);
    setBuyError("");
    try {
      const res = await fetch("/user/api/buyStock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: quote.symbol, quantity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPurchase(data);
      setBalance(data.balance);
    } catch (err) {
      setBuyError((err as Error).message || "Failed to buy stock.");
    } finally {
      setBuying(false);
    }
  }

  const rows =
    balance === null
      ? []
      : [
          { label: "Price per share", value: money(price) },
          { label: "Your balance", value: money(balance) },
          { label: "You can buy", value: `${formatShares(maxShares)} share${maxShares === 1 ? "" : "s"}` },
        ];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()} // click on the backdrop
      aria-labelledby="buy-stock-title"
      className="m-auto w-[min(400px,calc(100vw-32px))] rounded-md border border-[#2f9e5b]/50 bg-[#141714] p-0 text-[#d9ffe6] shadow-[0_0_30px_rgba(47,158,91,0.25)] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      {/* padding lives here so clicks on it aren't mistaken for backdrop clicks */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="buy-stock-title" className="font-mono text-[22px] font-bold tracking-widest">
            Buy {quote.symbol}
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

        {loadError && <p className="mt-4 text-red-400">{loadError}</p>}
        {!loadError && balance === null && <p className="mt-4 text-[#d9ffe6]/60">Loading your balance…</p>}

        {purchase ? (
          // done: show what was bought
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-[#2f9e5b]">
              Bought {formatShares(purchase.quantity)} {quote.symbol} share{purchase.quantity === 1 ? "" : "s"} at{" "}
              {money(purchase.pricePerShare)} for {money(purchase.total)}.
            </p>
            <p>
              New balance: <span className="font-mono text-[#d9ffe6]">{money(purchase.balance)}</span>
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
          balance !== null && (
            <form onSubmit={handleBuy} className="mt-4 flex flex-col gap-4">
              <dl className="flex flex-col gap-2">
                {rows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <dt className="text-[#d9ffe6]/60">{row.label}</dt>
                    <dd className="font-mono text-[#d9ffe6]">{row.value}</dd>
                  </div>
                ))}
              </dl>

              {maxShares * price < MIN_ORDER ? (
                <p className="text-red-400">Your balance is too low to buy any shares.</p>
              ) : (
                <>
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
                    <span className="text-[#d9ffe6]/60">Total cost</span>
                    <span className="font-mono text-[#d9ffe6]">{validQuantity ? money(cost) : "—"}</span>
                  </div>
                  {validQuantity && (
                    <div className="-mt-3 flex justify-between gap-4 text-sm">
                      <span className="text-[#d9ffe6]/60">Balance after</span>
                      <span className="font-mono text-[#d9ffe6]/80">{money(balance - cost)}</span>
                    </div>
                  )}
                  {shares !== "" && quantityError && (
                    <p className="-mt-2 text-sm text-red-400">{quantityError}</p>
                  )}

                  {buyError && <p className="text-sm text-red-400">{buyError}</p>}

                  <button
                    type="submit"
                    disabled={!validQuantity || buying}
                    className="rounded-md border border-[#2f9e5b] bg-[#2f9e5b]/15 px-4 py-2 font-mono font-bold uppercase tracking-widest text-[#d9ffe6] transition hover:bg-[#2f9e5b] hover:text-black hover:shadow-[0_0_14px_rgba(47,158,91,0.45)] disabled:opacity-50 disabled:hover:bg-[#2f9e5b]/15 disabled:hover:text-[#d9ffe6] disabled:hover:shadow-none"
                  >
                    {buying ? "Buying…" : validQuantity ? `Buy for ${money(cost)}` : "Buy"}
                  </button>
                </>
              )}
            </form>
          )
        )}
      </div>
    </dialog>
  );
}
