// shares are stored to 6 decimal places (stock_purchases.quantity is numeric(18, 6))
export const SHARE_DECIMALS = 6;

// e.g. 1234.5 -> "$1,234.50", -3 -> "-$3.00"
export const money = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// drops trailing zeros, e.g. 0.500000 -> "0.5"
export const formatShares = (n: number) => String(Number(n.toFixed(SHARE_DECIMALS)));
