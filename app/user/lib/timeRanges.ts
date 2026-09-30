// time periods the stock graphs can show.
// days = how far back from the latest quote, bucketMinutes = one point per this many minutes
// (1D has neither: it shows every quote from the latest trading day)
export const TIME_RANGES = {
  "1D": { label: "1D", days: null, bucketMinutes: null },
  "1W": { label: "1W", days: 7, bucketMinutes: 10 },
  "1M": { label: "1M", days: 30, bucketMinutes: 30 },
  "3M": { label: "3M", days: 90, bucketMinutes: 60 },
} as const;

export type TimeRange = keyof typeof TIME_RANGES;

export const isTimeRange = (value: string): value is TimeRange => value in TIME_RANGES;
