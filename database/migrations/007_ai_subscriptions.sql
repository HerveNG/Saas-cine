-- Subscription state foundation. Apply after 006_ai_quotas.sql.
-- This migration does not connect a payment provider yet.

create table if not exists public.ai_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null references public.ai_plans(id),
  status text not null default 'active'
    check (status in ('active','trialing','past_due','cancelled','expired')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_subscriptions_plan on public.ai_subscriptions(plan_id);
create index if not exists idx_ai_subscriptions_provider_customer on public.ai_subscriptions(provider_customer_id);
create index if not exists idx_ai_subscriptions_provider_subscription on public.ai_subscriptions(provider_subscription_id);

alter table public.ai_subscriptions enable row level security;

drop policy if exists "Users can view own AI subscription" on public.ai_subscriptions;
create policy "Users can view own AI subscription"
  on public.ai_subscriptions for select
  using (auth.uid() = user_id);

-- Keep quota assignment synchronized with the application subscription state.
create or replace function public.set_ai_user_plan(p_user_id uuid, p_plan_id text)
returns public.ai_user_quotas
language plpgsql
security definer set search_path = public
as $$
declare
  result public.ai_user_quotas%rowtype;
  p public.ai_plans%rowtype;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Accès abonnement refusé.' using errcode = '42501';
  end if;

  select * into p from public.ai_plans where id = p_plan_id and active = true;
  if not found then
    raise exception 'Plan IA inconnu.' using errcode = '22023';
  end if;

  insert into public.ai_user_quotas (user_id, plan_id, monthly_token_limit, monthly_run_limit, updated_at)
  values (p_user_id, p.id, p.monthly_token_limit, p.monthly_run_limit, now())
  on conflict (user_id) do update set
    plan_id = excluded.plan_id,
    monthly_token_limit = excluded.monthly_token_limit,
    monthly_run_limit = excluded.monthly_run_limit,
    enabled = true,
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.set_ai_user_plan(uuid, text) to authenticated;

-- Create a local subscription record for existing users when missing.
insert into public.ai_subscriptions (user_id, plan_id, status)
select q.user_id, q.plan_id, 'active'
from public.ai_user_quotas q
where not exists (
  select 1 from public.ai_subscriptions s where s.user_id = q.user_id
);
