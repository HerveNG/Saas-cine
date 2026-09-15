create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  country text,
  profile_type text check (profile_type in ('author','producer','institution')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null check (type in ('Documentaire','Fiction','Série')),
  genre text,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  country text,
  language text,
  theme text,
  target_audience text,
  logline text,
  status text not null default 'draft',
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_details (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  concept text,
  story text,
  creative_vision text,
  production_context text,
  additional_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  role text,
  age integer,
  biography text,
  personality text,
  psychology text,
  habits text,
  relationships text,
  evolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('synopsis','intent_note','director_note','bible','pitch_deck','scenario','technical_breakdown','budget','financing_plan','production_schedule')),
  title text not null,
  content text not null default '',
  status text not null default 'draft',
  current_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version_number integer not null,
  content text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(document_id, version_number)
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  title text not null,
  description text,
  type text not null,
  country text,
  region text,
  amount_min numeric,
  amount_max numeric,
  currency text,
  deadline timestamptz,
  opening_date timestamptz,
  source_url text,
  eligibility text,
  required_documents text,
  status text not null default 'active',
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunity_criteria (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  criterion_type text not null,
  criterion_value text not null
);

create table if not exists public.project_matches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  compatibility_score integer check (compatibility_score between 0 and 100),
  matched_criteria jsonb not null default '[]'::jsonb,
  missing_criteria jsonb not null default '[]'::jsonb,
  status text not null default 'suggested',
  created_at timestamptz not null default now(),
  unique(project_id, opportunity_id)
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, opportunity_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects(owner_id);
create index if not exists documents_project_id_idx on public.documents(project_id);
create index if not exists opportunities_deadline_idx on public.opportunities(deadline);
create index if not exists opportunity_criteria_lookup_idx on public.opportunity_criteria(criterion_type, criterion_value);
create index if not exists notifications_user_read_idx on public.notifications(user_id, read);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_details enable row level security;
alter table public.characters enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_criteria enable row level security;
alter table public.project_matches enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;

create policy "profiles own row" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "projects owner access" on public.projects for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "project details owner access" on public.project_details for all using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "characters owner access" on public.characters for all using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "documents owner access" on public.documents for all using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "document versions owner access" on public.document_versions for all using (exists (select 1 from public.documents d join public.projects p on p.id = d.project_id where d.id = document_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.documents d join public.projects p on p.id = d.project_id where d.id = document_id and p.owner_id = auth.uid()));
create policy "opportunities public read" on public.opportunities for select using (status = 'active');
create policy "opportunity criteria public read" on public.opportunity_criteria for select using (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.status = 'active'));
create policy "matches owner access" on public.project_matches for all using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "favorites own access" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications own access" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', '')) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
