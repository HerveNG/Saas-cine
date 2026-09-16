-- Monthly AI quota foundation. Apply after 005_ai_observability.sql.

create table if not exists public.ai_plans (
  id text primary key,
  label text not null,
  monthly_token_limit bigint not null check (monthly_token_limit > 0),
  monthly_run_limit integer not null check (monthly_run_limit > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.ai_plans (id, label, monthly_token_limit, monthly_run_limit)
values
  ('free', 'Free', 100000, 20),
  ('creator', 'Creator', 500000, 100),
  ('pro', 'Pro', 2000000, 400),
  ('studio', 'Studio', 10000000, 2000)
on conflict (id) do update set
  label = excluded.label,
  monthly_token_limit = excluded.monthly_token_limit,
  monthly_run_limit = excluded.monthly_run_limit,
  active = true;

create table if not exists public.ai_user_quotas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null references public.ai_plans(id) default 'free',
  monthly_token_limit bigint not null default 100000,
  monthly_run_limit integer not null default 20,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_user_quotas_plan on public.ai_user_quotas(plan_id);

alter table public.ai_plans enable row level security;
alter table public.ai_user_quotas enable row level security;

drop policy if exists "AI plans public read" on public.ai_plans;
create policy "AI plans public read" on public.ai_plans for select using (active = true);

drop policy if exists "Users can view own AI quota" on public.ai_user_quotas;
create policy "Users can view own AI quota" on public.ai_user_quotas for select using (auth.uid() = user_id);

create or replace function public.handle_new_user_ai_quota()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.ai_user_quotas (user_id, plan_id, monthly_token_limit, monthly_run_limit)
  select new.id, p.id, p.monthly_token_limit, p.monthly_run_limit
  from public.ai_plans p where p.id = 'free'
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ai_quota on auth.users;
create trigger on_auth_user_created_ai_quota
after insert on auth.users
for each row execute procedure public.handle_new_user_ai_quota();

insert into public.ai_user_quotas (user_id, plan_id, monthly_token_limit, monthly_run_limit)
select u.id, 'free', 100000, 20
from auth.users u
where not exists (select 1 from public.ai_user_quotas q where q.user_id = u.id);

create or replace function public.check_ai_quota(p_user_id uuid)
returns table (
  allowed boolean,
  plan_id text,
  plan_label text,
  monthly_token_limit bigint,
  monthly_run_limit integer,
  used_tokens bigint,
  used_runs bigint,
  remaining_tokens bigint,
  remaining_runs bigint,
  period_start timestamptz,
  reason text
)
language plpgsql
security definer set search_path = public
as $$
declare
  q public.ai_user_quotas%rowtype;
  p public.ai_plans%rowtype;
  start_at timestamptz := date_trunc('month', now());
  token_used bigint;
  run_used bigint;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Accès quota refusé.' using errcode = '42501';
  end if;

  select * into q from public.ai_user_quotas where user_id = p_user_id and enabled = true;
  if not found then
    insert into public.ai_user_quotas (user_id) values (p_user_id)
    on conflict (user_id) do nothing;
    select * into q from public.ai_user_quotas where user_id = p_user_id;
  end if;

  select * into p from public.ai_plans where id = q.plan_id;
  if not found then
    select * into p from public.ai_plans where id = 'free';
  end if;

  select coalesce(sum(coalesce(total_tokens, 0)), 0), count(*)
    into token_used, run_used
    from public.ai_agent_runs
   where user_id = p_user_id
     and created_at >= start_at;

  return query
  select
    (token_used < q.monthly_token_limit and run_used < q.monthly_run_limit),
    q.plan_id,
    p.label,
    q.monthly_token_limit,
    q.monthly_run_limit,
    token_used,
    run_used,
    greatest(q.monthly_token_limit - token_used, 0),
    greatest(q.monthly_run_limit - run_used, 0),
    start_at,
    case
      when token_used >= q.monthly_token_limit then 'monthly_token_limit'
      when run_used >= q.monthly_run_limit then 'monthly_run_limit'
      else null
    end;
end;
$$;

grant execute on function public.check_ai_quota(uuid) to authenticated;
