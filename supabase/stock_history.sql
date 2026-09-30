-- Run this once in the Supabase SQL editor.
-- Used by /user/api/stockHistory for the 1W / 1M / 3M graph ranges.

-- speeds up every "prices for one symbol over time" query.
-- current_price is included so the graph queries can be answered from the index alone,
-- without reading the (much bigger, per-minute) stocks table
drop index if exists public.stocks_symbol_quote_time_idx;
create index if not exists stocks_symbol_quote_time_price_idx
  on public.stocks (symbol, quote_time) include (current_price);

-- returns the last price in each time bucket, e.g. one point per 30 minutes,
-- so a month of per-minute rows comes back as a few hundred points
create or replace function public.stock_history(p_symbol text, p_since timestamp, p_bucket_minutes int)
returns table (bucket timestamp, price numeric)
language sql
stable
as $$
  select distinct on (b)
    b as bucket,
    current_price as price
  from (
    select
      date_bin(make_interval(mins => p_bucket_minutes), quote_time, timestamp '2000-01-01') as b,
      current_price,
      quote_time
    from public.stocks
    where symbol = p_symbol
      and quote_time >= p_since
  ) t
  order by b, quote_time desc;
$$;

grant execute on function public.stock_history(text, timestamp, int) to service_role;

-- then run this on its own (it can't run together with the statements above).
-- it lets postgres use the index without checking the table
-- vacuum analyze public.stocks;
