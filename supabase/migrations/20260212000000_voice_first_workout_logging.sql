create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  date date not null,
  notes text
);

create table if not exists public.session_planned_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  order_index integer not null check (order_index > 0),
  unique (session_id, order_index)
);

create table if not exists public.set_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  set_number integer not null check (set_number > 0),
  reps integer not null check (reps > 0),
  weight numeric(8,2),
  unit text not null default 'lb' check (unit in ('lb', 'kg')),
  unique (session_id, exercise_id, set_number)
);

create index if not exists sessions_member_id_idx on public.sessions(member_id);
create index if not exists planned_session_id_idx on public.session_planned_exercises(session_id);
create index if not exists set_results_session_id_idx on public.set_results(session_id);

alter table public.members enable row level security;
alter table public.exercises enable row level security;
alter table public.sessions enable row level security;
alter table public.session_planned_exercises enable row level security;
alter table public.set_results enable row level security;

create policy if not exists "members_authenticated_all"
  on public.members
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy if not exists "exercises_authenticated_all"
  on public.exercises
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy if not exists "sessions_authenticated_all"
  on public.sessions
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy if not exists "planned_authenticated_all"
  on public.session_planned_exercises
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy if not exists "set_results_authenticated_all"
  on public.set_results
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

insert into public.exercises (name, is_custom) values
  ('Back Squat', false),
  ('Bench Press', false),
  ('Deadlift', false),
  ('Overhead Press', false),
  ('Barbell Row', false),
  ('Pull-Up', false),
  ('Romanian Deadlift', false),
  ('Leg Press', false),
  ('Lat Pulldown', false),
  ('Dumbbell Incline Press', false)
on conflict (name) do nothing;
