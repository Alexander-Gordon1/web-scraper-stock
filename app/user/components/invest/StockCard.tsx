// one row of the stocks table (latest quote for a symbol)
export type StockQuote = {
  id: string;
  symbol: string;
  current_price: number;
  change: number | null;
  percent_change: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  prev_close: number | null;
  quote_time: string;
  fetched_at: string | null;
  category: string | null;
};

// numeric columns can come back as strings, and the optional ones can be null
function formatNumber(value: number | string | null | undefined) {
  const n = Number(value);
  return value === null || value === undefined || Number.isNaN(n) ? "—" : n.toFixed(2);
}

type StockCardProps = {
  quote: StockQuote;
  onBuy?: (quote: StockQuote) => void;
};

export default function StockCard({ quote, onBuy }: StockCardProps) {
  const change = Number(quote.change ?? 0);
  const percent = Number(quote.percent_change ?? 0);
  const isUp = percent >= 0;
  const sign = isUp ? "+" : "";

  const stats = [
    { label: "Open", value: quote.open },
    { label: "Close", value: quote.prev_close },
    { label: "High", value: quote.high },
    { label: "Low", value: quote.low },
  ];

  return (
    <div data-stock-card className="flex flex-col gap-3 rounded-md border border-[#2f9e5b]/30 bg-[#2f9e5b]/10 py-4 pl-4 pr-[10px] transition hover:border-[#2f9e5b]/70 hover:shadow-[0_0_14px_rgba(47,158,91,0.25)]">
      <div className="relative -top-[8px] -mb-[21px] flex items-start justify-between gap-3">
        <h3 className="font-mono text-[24px] font-bold tracking-widest">{quote.symbol}</h3>
        <button
          type="button"
          onClick={() => onBuy?.(quote)}
          className="shrink-0 rounded-md border border-[#2f9e5b] bg-[#2f9e5b]/15 px-4 py-1 text-sm font-mono font-bold uppercase tracking-widest text-[#d9ffe6] transition hover:bg-[#2f9e5b] hover:text-black hover:shadow-[0_0_14px_rgba(47,158,91,0.45)]"
        >
          Buy
        </button>
      </div>

      {/* price + daily change on the left, day stats on the right */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[23px] text-[#d9ffe6]">${formatNumber(quote.current_price)}</p>
          <p className={`font-mono text-[14px] ${isUp ? "text-[#2f9e5b]" : "text-red-400"}`}>
            {sign}
            {formatNumber(change)}
          </p>
          <p className={`font-mono text-[14px] ${isUp ? "text-[#2f9e5b]" : "text-red-400"}`}>
            {sign}
            {formatNumber(percent)}%
          </p>
        </div>

        <dl className="grid shrink-0 grid-cols-2 gap-x-3 text-[14px]">
          {stats.map((stat) => (
            <div key={stat.label} className="flex justify-between gap-2">
              <dt className="text-[#d9ffe6]/60">{stat.label}</dt>
              <dd className="font-mono text-[#d9ffe6]">{formatNumber(stat.value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="text-[11.5px] text-[#d9ffe6]/60">
        Updated {new Date(quote.quote_time).toLocaleString()}
      </p>
    </div>
  );
}
