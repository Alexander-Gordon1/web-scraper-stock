// the only stocks the finnHub cron job fetches into the stocks table,
// and the tickers the user can pick from in the ticker bar dropdown
export const TICKER_OPTIONS = [
  "AAPL", "AMD", "AMZN", "AVGO", "BA", "COST", "GOOGL", "JNJ", "JPM", "KO", "LLY",
  "META", "MSFT", "NFLX", "NVDA", "SNDK", "TSLA", "UNH", "V", "WMT", "XOM",
];

// sector for each ticker, saved in the stocks table's category column
export const TICKER_CATEGORIES: Record<string, string> = {
  AMZN: "Consumer Discretionary",
  TSLA: "Consumer Discretionary",
  COST: "Consumer Staples",
  KO: "Consumer Staples",
  WMT: "Consumer Staples",
  GOOGL: "Communication Services",
  META: "Communication Services",
  NFLX: "Communication Services",
  XOM: "Energy",
  JPM: "Financials",
  V: "Financials",
  JNJ: "Healthcare",
  LLY: "Healthcare",
  UNH: "Healthcare",
  BA: "Industrials",
  AAPL: "Technology",
  AMD: "Technology",
  AVGO: "Technology",
  MSFT: "Technology",
  NVDA: "Technology",
  SNDK: "Technology",
};

// shown when the user isn't logged in or hasn't picked any tickers yet
export const DEFAULT_TICKERS = ["NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "AMD", "NFLX"];

// most tickers a user can have in their ticker bar
export const MAX_TICKERS = 10;

// names a news headline might use for each ticker (matched as whole words, case-sensitive),
// since the rss articles aren't tagged with tickers
export const TICKER_KEYWORDS: Record<string, string[]> = {
  AAPL: ["AAPL", "Apple", "iPhone"],
  AMD: ["AMD", "Advanced Micro Devices"],
  AMZN: ["AMZN", "Amazon"],
  AVGO: ["AVGO", "Broadcom"],
  BA: ["Boeing", "NYSE:BA", "(BA)"],
  COST: ["Costco", "(COST)"],
  GOOGL: ["GOOGL", "GOOG", "Google", "Alphabet"],
  JNJ: ["JNJ", "Johnson & Johnson", "J&J"],
  JPM: ["JPM", "JPMorgan", "JP Morgan"],
  KO: ["Coca-Cola", "Coca Cola", "Coke", "(KO)"],
  LLY: ["LLY", "Eli Lilly", "Lilly"],
  META: ["Meta", "Facebook", "Instagram", "WhatsApp"],
  MSFT: ["MSFT", "Microsoft"],
  NFLX: ["NFLX", "Netflix"],
  NVDA: ["NVDA", "Nvidia", "NVIDIA"],
  SNDK: ["SNDK", "SanDisk", "Sandisk"],
  TSLA: ["TSLA", "Tesla", "Elon Musk", "Musk"],
  UNH: ["UNH", "UnitedHealth"],
  V: ["Visa", "NYSE:V", "(V)"],
  WMT: ["WMT", "Walmart"],
  XOM: ["XOM", "Exxon", "ExxonMobil"],
};

// Yahoo Finance feed used for general market news (the S&P 500)
export const MARKET_NEWS_SYMBOL = "^GSPC";

// Yahoo Finance's headline feed for one ticker, e.g. AAPL or ^GSPC.
// holds roughly the latest 20 articles Yahoo links to that ticker
export const yahooFeedUrl = (symbol: string) =>
  `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
