create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('orange_money_cm', 'mtn_momo_cm')),
  event_id text not null,
  event_type text,
  transaction_reference text,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists billing_events_provider_event_idx
  on public.billing_events(provider, event_id);

create index if not exists billing_events_reference_idx
  on public.billing_events(transaction_reference, created_at desc);

alter table public.billing_events enable row level security;

create policy "Users cannot directly access billing events"
  on public.billing_events for all
  using (false)
  with check (false);
