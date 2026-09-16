-- Package association and execution observability for the AI orchestration layer.
-- Apply after 004_ai_workflows.sql.

alter table public.ai_workflows
  add column if not exists package_id text;

-- 004 predates the specialized impact/validator roles. Recreate the role constraint
-- so package workflows using those agents can be persisted safely.
alter table public.ai_tasks drop constraint if exists ai_tasks_role_check;
alter table public.ai_tasks
  add constraint ai_tasks_role_check
  check (role in ('development','screenwriter','director','producer','financing','impact','validator'));

create index if not exists idx_ai_workflows_package
  on public.ai_workflows(project_id, package_id, created_at desc);

create table if not exists public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.ai_workflows(id) on delete cascade,
  task_id uuid references public.ai_tasks(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  model text,
  provider_base_url text,
  status text not null default 'running'
    check (status in ('running','completed','failed')),
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  duration_ms integer,
  action_count integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_agent_runs_project
  on public.ai_agent_runs(project_id, created_at desc);
create index if not exists idx_ai_agent_runs_workflow
  on public.ai_agent_runs(workflow_id, created_at desc);
create index if not exists idx_ai_agent_runs_task
  on public.ai_agent_runs(task_id, created_at desc);
create index if not exists idx_ai_agent_runs_user
  on public.ai_agent_runs(user_id, created_at desc);

alter table public.ai_agent_runs enable row level security;

drop policy if exists "Users can view own AI agent runs" on public.ai_agent_runs;
create policy "Users can view own AI agent runs"
  on public.ai_agent_runs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own AI agent runs" on public.ai_agent_runs;
create policy "Users can create own AI agent runs"
  on public.ai_agent_runs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own AI agent runs" on public.ai_agent_runs;
create policy "Users can update own AI agent runs"
  on public.ai_agent_runs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
