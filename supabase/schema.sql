create table if not exists quizzes (
  quiz_id text primary key,
  created_at timestamptz not null default now(),
  title text,
  quiz_json jsonb not null
);

create table if not exists quiz_sessions (
  session_id text primary key,
  quiz_id text not null,
  created_at timestamptz not null default now(),
  answers_json jsonb not null default '{}'::jsonb,
  score_map jsonb not null default '{}'::jsonb,
  primary_archetype text,
  primary_archetype_id text,
  preview_json jsonb not null default '{}'::jsonb,
  premium_json jsonb not null default '{}'::jsonb,
  unlocked boolean not null default false,
  unlocked_at timestamptz,
  price numeric(10,2) not null default 1.00,
  stripe_checkout_session_id text,
  stripe_payment_status text
);

create table if not exists trend_packets (
  trend_id text primary key,
  created_at timestamptz not null default now(),
  trend_json jsonb not null
);
