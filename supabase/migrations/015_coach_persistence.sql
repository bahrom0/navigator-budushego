-- Coach persistence: roadmaps, daily_plans, daily_tasks enhancements

-- === ROADMAPS ===
alter table if exists roadmaps
  add column if not exists duration_weeks integer not null default 12,
  add column if not exists title text,
  add column if not exists nct_code text,
  add column if not exists nct_title text,
  add column if not exists plan_snapshot jsonb,
  add column if not exists diagnostic_snapshot jsonb,
  add column if not exists generation_context jsonb,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists idx_roadmaps_status on roadmaps(status);
create unique index if not exists idx_roadmaps_user_goal_active on roadmaps(user_id, goal_id) where status = 'active';

-- === DAILY PLANS ===
alter table if exists daily_plans
  add column if not exists next_date date,
  add column if not exists completed_task_ids jsonb not null default '[]'::jsonb,
  add column if not exists skipped_task_ids jsonb not null default '[]'::jsonb,
  add column if not exists stats jsonb,
  add column if not exists generation_context jsonb;

drop index if exists idx_daily_plans_plan_date;
create index if not exists idx_daily_plans_plan_date_desc on daily_plans(plan_date desc);

-- change unique constraint to include goal_id for proper scoping
alter table if exists daily_plans
  drop constraint if exists daily_plans_user_id_plan_date_key;

alter table if exists daily_plans
  drop constraint if exists daily_plans_user_goal_date_unique;

alter table if exists daily_plans
  add constraint daily_plans_user_goal_date_unique unique (user_id, goal_id, plan_date);

-- === DAILY TASKS ===
alter table if exists daily_tasks
  add column if not exists metadata jsonb,
  add column if not exists skipped boolean not null default false;

create index if not exists idx_daily_tasks_status on daily_tasks(status);

-- === UPDATED_AT TRIGGERS ===
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_roadmaps_updated_at on roadmaps;
create trigger trg_roadmaps_updated_at
  before update on public.roadmaps
  for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_plans_updated_at on daily_plans;
create trigger trg_daily_plans_updated_at
  before update on public.daily_plans
  for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_tasks_updated_at on daily_tasks;
create trigger trg_daily_tasks_updated_at
  before update on public.daily_tasks
  for each row execute function public.set_updated_at();
