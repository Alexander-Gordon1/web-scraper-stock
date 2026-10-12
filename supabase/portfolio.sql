-- Portfolio tables for fake-money investing.
-- Run this in the Supabase SQL editor.
-- Assumes users.id is a uuid. If it's int8, change "user_id uuid" to "user_id bigint".

-- one fake bank account per user
create table if not exists bank_accounts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references users(id) on delete cascade,
  bank_name      text not null default 'Demo Bank',
  account_number text,
  balance        numeric(14, 2) not null default 10000,
  created_at     timestamptz not null default now()
);

-- one row per stock purchase
create table if not exists stock_purchases (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  symbol          text not null,
  quantity        numeric(18, 6) not null,
  price_per_share numeric(14, 4) not null,
  purchased_at    timestamptz not null default now()
);

create index if not exists stock_purchases_user_id_idx on stock_purchases (user_id);

-- tables made in the SQL editor don't get API access automatically,
-- so let the server key (service_role) read and write them
grant select, insert, update, delete on bank_accounts, stock_purchases to service_role;

-- buys a stock in one transaction: locks the user's bank account row, checks they can afford it,
-- takes the money out and records the purchase. two buys at once can't both spend the same money.
-- raises NO_ACCOUNT or INSUFFICIENT_FUNDS for the api route to turn into a friendly message.
create or replace function buy_stock(p_user_id uuid, p_symbol text, p_quantity numeric, p_price numeric)
returns table (purchase_id uuid, new_balance numeric)
language plpgsql
as $$
declare
  v_cost    numeric := round(p_quantity * p_price, 2);
  v_balance numeric;
begin
  -- v_cost < 0.01 stops tiny fractional orders that would round down to free
  if p_quantity <= 0 or p_price <= 0 or v_cost < 0.01 then
    raise exception 'INVALID_ORDER';
  end if;

  select balance into v_balance from bank_accounts where user_id = p_user_id for update;
  if not found then
    raise exception 'NO_ACCOUNT';
  end if;
  if v_balance < v_cost then
    raise exception 'INSUFFICIENT_FUNDS';
  end if;

  update bank_accounts set balance = balance - v_cost
  where user_id = p_user_id
  returning balance into new_balance;

  insert into stock_purchases (user_id, symbol, quantity, price_per_share)
  values (p_user_id, p_symbol, p_quantity, p_price)
  returning id into purchase_id;

  return next;
end;
$$;

-- only the server (service role key) may call it, otherwise anyone with the public key
-- could buy on another user's behalf
revoke execute on function buy_stock(uuid, text, numeric, numeric) from public, anon, authenticated;
grant execute on function buy_stock(uuid, text, numeric, numeric) to service_role;

-- tell supabase's api to pick up the new function straight away
notify pgrst, 'reload schema';
