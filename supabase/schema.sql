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

-- No auth/RLS yet (the app has no login). Supabase enables RLS by default on
-- tables created via the dashboard editor, so disable it explicitly —
-- otherwise the anon key can't insert and confirms fail silently. If auth is
-- added later, enable RLS and scope rows by user_id instead:
--   alter table movements enable row level security;
alter table movements disable row level security;

-- Stores conversation state per session (browser cookie id for the web
-- frontend, phone number for WhatsApp), so the same conversation engine in
-- lib/conversation/engine.ts can serve both channels statelessly per request.
create table if not exists conversation_sessions (
  session_id text primary key,
  status text not null default 'idle',
  pending_command jsonb,
  raw_text text,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Supabase enables RLS by default on tables created via the dashboard editor.
-- This app has no auth, so disable it here too (same as `movements` above) —
-- otherwise the anon key can't upsert/select and the conversation engine
-- silently falls back to a fresh session every request.
alter table conversation_sessions disable row level security;
