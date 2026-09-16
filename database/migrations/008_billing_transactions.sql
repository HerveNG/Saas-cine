create table if not exists public.billing_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.ai_plans(id),
  provider text not null check (provider in ('orange_money_cm', 'mtn_momo_cm')),
  reference text not null unique,
  external_transaction_id text,
  phone text,
  amount_xaf bigint not null check (amount_xaf > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  raw_response jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_transactions_provider_external_idx
  on public.billing_transactions(provider, external_transaction_id)
  where external_transaction_id is not null;

create index if not exists billing_transactions_user_idx
  on public.billing_transactions(user_id, created_at desc);

create index if not exists billing_transactions_status_idx
  on public.billing_transactions(status, created_at desc);

alter table public.billing_transactions enable row level security;

create policy "Users can view own billing transactions"
  on public.billing_transactions for select
  using (auth.uid() = user_id);

create policy "Users can create own pending billing transactions"
  on public.billing_transactions for insert
  with check (auth.uid() = user_id and status = 'pending');
