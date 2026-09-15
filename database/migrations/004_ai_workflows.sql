create table if not exists public.ai_workflows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  goal text not null,
  status text not null default 'running' check (status in ('running','waiting_approval','completed','failed','cancelled')),
  current_task_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.ai_tasks (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.ai_workflows(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_index integer not null,
  role text not null check (role in ('development','screenwriter','director','producer','financing')),
  objective text not null,
  output_label text not null,
  depends_on jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','running','waiting_approval','completed','failed')),
  input_context text,
  output text,
  action_ids jsonb not null default '[]'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workflow_id, task_index)
);

create index if not exists idx_ai_workflows_project on public.ai_workflows(project_id, created_at desc);
create index if not exists idx_ai_tasks_workflow on public.ai_tasks(workflow_id, task_index);
create index if not exists idx_ai_tasks_project on public.ai_tasks(project_id, created_at desc);

alter table public.ai_workflows enable row level security;
alter table public.ai_tasks enable row level security;

drop policy if exists "Users can view own AI workflows" on public.ai_workflows;
create policy "Users can view own AI workflows" on public.ai_workflows for select using (auth.uid() = user_id);

drop policy if exists "Users can create own AI workflows" on public.ai_workflows;
create policy "Users can create own AI workflows" on public.ai_workflows for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own AI workflows" on public.ai_workflows;
create policy "Users can update own AI workflows" on public.ai_workflows for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own AI workflows" on public.ai_workflows;
create policy "Users can delete own AI workflows" on public.ai_workflows for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own AI tasks" on public.ai_tasks;
create policy "Users can view own AI tasks" on public.ai_tasks for select using (auth.uid() = user_id);

drop policy if exists "Users can create own AI tasks" on public.ai_tasks;
create policy "Users can create own AI tasks" on public.ai_tasks for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own AI tasks" on public.ai_tasks;
create policy "Users can update own AI tasks" on public.ai_tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own AI tasks" on public.ai_tasks;
create policy "Users can delete own AI tasks" on public.ai_tasks for delete using (auth.uid() = user_id);
