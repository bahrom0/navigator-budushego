-- Admission goal flow
alter table if exists profiles
  add column if not exists active_goal_id uuid;

create table if not exists admission_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  nct_code text not null,
  nct_title text not null,
  university text,
  profession text,
  city text,
  status text not null default 'active',
  goal_context jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz
);

create index if not exists idx_admission_goals_user_id on admission_goals(user_id);
create index if not exists idx_admission_goals_status on admission_goals(status);
create index if not exists idx_admission_goals_user_status on admission_goals(user_id, status);

alter table if exists plans
  add column if not exists goal_id uuid,
  add column if not exists plan_type text default 'general',
  add column if not exists roadmap_id uuid,
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_plans_goal_id on plans(goal_id);
create index if not exists idx_plans_plan_type on plans(plan_type);

create table if not exists roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  goal_id uuid references admission_goals(id) on delete cascade,
  plan_id uuid references plans(id) on delete cascade,
  weeks jsonb not null default '[]'::jsonb,
  current_week_number int default 1,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_roadmaps_user_id on roadmaps(user_id);
create index if not exists idx_roadmaps_goal_id on roadmaps(goal_id);
create index if not exists idx_roadmaps_plan_id on roadmaps(plan_id);

create table if not exists daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  goal_id uuid references admission_goals(id) on delete cascade,
  roadmap_id uuid references roadmaps(id) on delete cascade,
  plan_id uuid references plans(id) on delete cascade,
  plan_date date not null,
  week_id text not null,
  week_number int not null,
  title text not null,
  previous_date date,
  completed_task_ids text[] default '{}'::text[],
  skipped_task_ids text[] default '{}'::text[],
  summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, plan_date)
);

create index if not exists idx_daily_plans_user_id on daily_plans(user_id);
create index if not exists idx_daily_plans_goal_id on daily_plans(goal_id);
create index if not exists idx_daily_plans_roadmap_id on daily_plans(roadmap_id);
create index if not exists idx_daily_plans_plan_date on daily_plans(plan_date);

create table if not exists daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  daily_plan_id uuid references daily_plans(id) on delete cascade,
  task_id text not null,
  title text not null,
  type text not null,
  description text,
  duration_minutes int,
  position int not null default 0,
  status text not null default 'pending',
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_daily_tasks_user_id on daily_tasks(user_id);
create index if not exists idx_daily_tasks_plan_id on daily_tasks(daily_plan_id);

create table if not exists coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  goal_id uuid references admission_goals(id) on delete cascade,
  role text not null,
  content text not null,
  message_type text default 'text',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_coach_messages_user_id on coach_messages(user_id);
create index if not exists idx_coach_messages_goal_id on coach_messages(goal_id);

alter table if exists profiles
  add constraint profiles_active_goal_fk
  foreign key (active_goal_id) references admission_goals(id) on delete set null;

alter table if exists plans
  add constraint plans_goal_fk
  foreign key (goal_id) references admission_goals(id) on delete cascade;

alter table if exists plans
  add constraint plans_roadmap_fk
  foreign key (roadmap_id) references roadmaps(id) on delete set null;

alter table if exists roadmaps
  add constraint roadmaps_goal_fk
  foreign key (goal_id) references admission_goals(id) on delete cascade;

alter table if exists roadmaps
  add constraint roadmaps_plan_fk
  foreign key (plan_id) references plans(id) on delete cascade;

alter table if exists daily_plans
  add constraint daily_plans_goal_fk
  foreign key (goal_id) references admission_goals(id) on delete cascade;

alter table if exists daily_plans
  add constraint daily_plans_roadmap_fk
  foreign key (roadmap_id) references roadmaps(id) on delete cascade;

alter table if exists daily_plans
  add constraint daily_plans_plan_fk
  foreign key (plan_id) references plans(id) on delete cascade;

alter table if exists daily_tasks
  add constraint daily_tasks_plan_fk
  foreign key (daily_plan_id) references daily_plans(id) on delete cascade;

alter table if exists coach_messages
  add constraint coach_messages_goal_fk
  foreign key (goal_id) references admission_goals(id) on delete cascade;

alter table if exists admission_goals enable row level security;
alter table if exists roadmaps enable row level security;
alter table if exists daily_plans enable row level security;
alter table if exists daily_tasks enable row level security;
alter table if exists coach_messages enable row level security;
alter table if exists profiles enable row level security;
alter table if exists plans enable row level security;

drop policy if exists "Users can manage their admission goals" on admission_goals;
create policy "Users can manage their admission goals"
  on admission_goals
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their roadmaps" on roadmaps;
create policy "Users can manage their roadmaps"
  on roadmaps
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their daily plans" on daily_plans;
create policy "Users can manage their daily plans"
  on daily_plans
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their daily tasks" on daily_tasks;
create policy "Users can manage their daily tasks"
  on daily_tasks
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their coach messages" on coach_messages;
create policy "Users can manage their coach messages"
  on coach_messages
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their profiles" on profiles;
create policy "Users can manage their profiles"
  on profiles
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their plans" on plans;
create policy "Users can manage their plans"
  on plans
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
