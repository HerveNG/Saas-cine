create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('development','screenwriter','director','producer','financing')),
  title text not null default 'Nouvelle conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_conversations_project_idx on public.ai_conversations(project_id, updated_at desc);
create index if not exists ai_messages_conversation_idx on public.ai_messages(conversation_id, created_at);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

create policy "ai conversations owner access" on public.ai_conversations for all using (auth.uid() = user_id and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())) with check (auth.uid() = user_id and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "ai messages owner access" on public.ai_messages for all using (auth.uid() = user_id and exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())) with check (auth.uid() = user_id and exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
