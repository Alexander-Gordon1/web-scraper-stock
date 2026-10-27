// shares are stored to 6 decimal places (stock_purchases.quantity is numeric(18, 6))
export const SHARE_DECIMALS = 6;
const SHARE_STEP = 10 ** SHARE_DECIMALS;

// smallest buy or sell in dollars, so a tiny order can't round to a free one
export const MIN_ORDER = 0.01;

// what can be typed in a shares box: digits with up to 6 decimal places
export const SHARES_PATTERN = /^\d*\.?\d{0,6}$/;

// rounds down to 6 decimal places, so shares never cost more than the money they came from
export const floorShares = (n: number) => Math.floor(n * SHARE_STEP + 1e-9) / SHARE_STEP;

// e.g. 1234.5 -> "$1,234.50", -3 -> "-$3.00"
export const money = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// drops trailing zeros, e.g. 0.500000 -> "0.5"
export const formatShares = (n: number) => String(Number(n.toFixed(SHARE_DECIMALS)));
