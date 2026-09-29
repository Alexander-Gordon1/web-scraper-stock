// the only stocks the finnHub cron job fetches into the stocks table,
// and the tickers the user can pick from in the ticker bar dropdown
export const TICKER_OPTIONS = [
  "AAPL", "AMD", "AMZN", "AVGO", "BA", "COST", "GOOGL", "JNJ", "JPM", "KO", "LLY",
  "META", "MSFT", "NFLX", "NVDA", "SNDK", "TSLA", "UNH", "V", "WMT", "XOM",
];

// shown when the user isn't logged in or hasn't picked any tickers yet
export const DEFAULT_TICKERS = ["NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "AMD", "NFLX"];

// most tickers a user can have in their ticker bar
export const MAX_TICKERS = 10;
