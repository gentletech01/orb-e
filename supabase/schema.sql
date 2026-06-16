-- Run this in the Supabase SQL editor (or via `supabase db push`) to create
-- the table used by the voice chatbot to store confirmed movements.

create table if not exists movements (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('buy', 'sell')),
  item text not null,
  quantity numeric not null,
  date date not null,
  raw_text text,
  created_at timestamptz not null default now()
);

-- No auth/RLS yet (the app has no login). If auth is added later, enable RLS
-- and scope rows by user_id:
--   alter table movements enable row level security;
