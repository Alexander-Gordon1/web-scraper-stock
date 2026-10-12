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
