revoke execute on function public.set_ai_user_plan(uuid, text) from authenticated;

drop function if exists public.set_ai_user_plan(uuid, text);

create or replace function public.set_ai_user_plan(p_user_id uuid, p_plan_id text)
returns public.ai_user_quotas
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_plan public.ai_plans%rowtype;
  result public.ai_user_quotas;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  select * into selected_plan
  from public.ai_plans
  where id = p_plan_id and active = true;

  if not found then
    raise exception 'AI plan not found or inactive';
  end if;

  insert into public.ai_user_quotas (
    user_id, plan_id, monthly_token_limit, monthly_run_limit, enabled, updated_at
  ) values (
    p_user_id, selected_plan.id, selected_plan.monthly_token_limit,
    selected_plan.monthly_run_limit, true, now()
  )
  on conflict (user_id) do update set
    plan_id = excluded.plan_id,
    monthly_token_limit = excluded.monthly_token_limit,
    monthly_run_limit = excluded.monthly_run_limit,
    enabled = excluded.enabled,
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.set_ai_user_plan(uuid, text) to service_role;
