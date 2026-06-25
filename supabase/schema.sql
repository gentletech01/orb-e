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

-- WhatsApp (Meta) retries the webhook delivery if our server doesn't respond
-- fast enough, resending the exact same message id. Without tracking which
-- ids we already handled, a slow response (e.g. Ollama cold start) causes
-- the same user message to be processed multiple times, duplicating bot
-- replies. A unique constraint on message_id is what actually prevents the
-- race between concurrent/retried requests.
create table if not exists whatsapp_processed_messages (
  message_id text primary key,
  processed_at timestamptz not null default now()
);

alter table whatsapp_processed_messages disable row level security;

-- ============================================================================
-- Pivot to a multi-user money-tracking platform (replaces the stock/movements
-- model above — `movements` is left in place but no longer written to).
--
-- Identity model: `profiles.id` is the universal identity, NOT `auth.users.id`
-- directly. WhatsApp auto-creates a profile from just a phone number the
-- first time an unknown number messages the bot (no signup at all), so a
-- profile can exist with no `auth.users` row. `auth_user_id` is the bridge,
-- set once someone signs up with email and links/verifies that number.
-- `transactions.user_id` and `conversation_sessions.session_id` point at
-- `profiles.id`, so both channels share one identity and one conversation
-- thread once a number is claimed.
-- ============================================================================

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  whatsapp_number text unique,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "users manage own profile" on profiles
  for all using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  category text not null check (category in ('Materiales', 'Servicios', 'Sueldos', 'Alquiler', 'Impuestos', 'Otros')),
  concept text,
  date date not null,
  raw_text text,
  created_at timestamptz not null default now()
);

alter table transactions enable row level security;
create policy "users manage own transactions" on transactions
  for all using (user_id in (select id from profiles where auth_user_id = auth.uid()))
  with check (user_id in (select id from profiles where auth_user_id = auth.uid()));

-- Now that session_id carries real per-user financial chat history (raw
-- amounts/concepts pre-confirmation), this needs RLS too — unlike when this
-- table was anonymous-cookie-only. Only the service-role client (engine.ts)
-- writes here; the policy below only covers a user's own optional read.
alter table conversation_sessions enable row level security;
create policy "users read own session" on conversation_sessions
  for select using (session_id in (select id::text from profiles where auth_user_id = auth.uid()));

-- One-time codes for linking/merging a WhatsApp number into an authenticated
-- account. Needed because WhatsApp can unilaterally create history-bearing
-- profiles — without verifying phone ownership, anyone could type in a
-- stranger's number and inherit their transaction history.
create table if not exists whatsapp_verification_codes (
  phone_number text primary key,
  code text not null,
  profile_id uuid not null references profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table whatsapp_verification_codes enable row level security;
-- No policies at all: only the service-role client touches this table (the
-- settings page's request-code/confirm flow runs entirely server-side).

-- This pivot changes the shape of SessionState.pendingCommand (single object
-- → pendingTransactions array), so any conversation captured mid-flow before
-- this migration has the old shape. It's ephemeral chat state, not a
-- historical record — wipe it rather than write defensive parsing for a
-- shape that will never recur.
truncate table conversation_sessions;
