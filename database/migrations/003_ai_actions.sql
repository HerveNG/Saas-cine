create table if not exists public.ai_actions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null check (action_type in ('create_document','update_document','update_project','create_character','update_character')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','executed','failed')),
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create index if not exists ai_actions_project_idx on public.ai_actions(project_id, created_at desc);
create index if not exists ai_actions_conversation_idx on public.ai_actions(conversation_id, created_at desc);
create index if not exists ai_actions_status_idx on public.ai_actions(status);

alter table public.ai_actions enable row level security;

create policy "ai actions owner access" on public.ai_actions
for all
using (
  auth.uid() = user_id
  and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
)
with check (
  auth.uid() = user_id
  and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);
