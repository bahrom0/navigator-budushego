-- Session Pack D: persistence cleanup
-- Stable entities use explicit uniqueness/upsert keys. Telemetry and product
-- history remain append-only and are separated at the schema level.

-- === ACTIVE GOAL INVARIANT ===
-- Preserve the profile-selected goal where possible and archive other active
-- goals instead of deleting domain history.
with ranked_active_goals as (
  select
    goal.id,
    row_number() over (
      partition by goal.user_id
      order by
        case when profile.active_goal_id = goal.id then 0 else 1 end,
        goal.updated_at desc nulls last,
        goal.created_at desc,
        goal.id
    ) as position
  from public.admission_goals goal
  left join public.profiles profile on profile.user_id = goal.user_id
  where goal.status = 'active'
)
update public.admission_goals goal
set
  status = 'archived',
  archived_at = coalesce(goal.archived_at, now()),
  updated_at = now()
from ranked_active_goals ranked
where goal.id = ranked.id
  and ranked.position > 1;

create unique index if not exists admission_goals_one_active_per_user
  on public.admission_goals(user_id)
  where status = 'active';

-- === PLAN LIFECYCLE ===
alter table public.plans
  add column if not exists university text,
  add column if not exists profession text,
  add column if not exists city text;

update public.plans
set plan_type = 'general'
where plan_type is null;

alter table public.plans
  alter column plan_type set default 'general',
  alter column plan_type set not null;

create temporary table plan_dedup_map on commit drop as
select duplicate.id as duplicate_id, duplicate.keep_id
from (
  select
    id,
    first_value(id) over (
      partition by user_id, goal_id, coalesce(plan_type, 'general')
      order by updated_at desc nulls last, created_at desc, id
    ) as keep_id,
    row_number() over (
      partition by user_id, goal_id, coalesce(plan_type, 'general')
      order by updated_at desc nulls last, created_at desc, id
    ) as position
  from public.plans
  where goal_id is not null
) duplicate
where duplicate.position > 1;

update public.roadmaps roadmap
set plan_id = mapping.keep_id
from plan_dedup_map mapping
where roadmap.plan_id = mapping.duplicate_id;

update public.daily_plans daily_plan
set plan_id = mapping.keep_id
from plan_dedup_map mapping
where daily_plan.plan_id = mapping.duplicate_id;

delete from public.plans plan
using plan_dedup_map mapping
where plan.id = mapping.duplicate_id;

alter table public.plans
  drop constraint if exists plans_user_goal_type_unique;

alter table public.plans
  add constraint plans_user_goal_type_unique
  unique (user_id, goal_id, plan_type);

-- === INTERVIEW LIFECYCLE ===
alter table public.interviews
  add column if not exists goal_id uuid references public.admission_goals(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

with ranked_interviews as (
  select
    id,
    row_number() over (
      partition by user_id, nct_code
      order by updated_at desc, created_at desc, id
    ) as position
  from public.interviews
)
delete from public.interviews interview
using ranked_interviews ranked
where interview.id = ranked.id
  and ranked.position > 1;

alter table public.interviews
  drop constraint if exists interviews_user_nct_code_unique;

alter table public.interviews
  add constraint interviews_user_nct_code_unique unique (user_id, nct_code);

create index if not exists interviews_goal_id_idx on public.interviews(goal_id);

-- === IDEMPOTENT APPEND-ONLY TELEMETRY ===
alter table public.activity_events
  add column if not exists client_event_id text,
  add column if not exists occurred_at timestamptz;

update public.activity_events
set occurred_at = created_at
where occurred_at is null;

alter table public.activity_events
  alter column occurred_at set default now(),
  alter column occurred_at set not null;

alter table public.activity_events
  drop constraint if exists activity_events_user_client_event_unique;

alter table public.activity_events
  add constraint activity_events_user_client_event_unique
  unique (user_id, client_event_id);

create index if not exists activity_events_user_occurred_at_idx
  on public.activity_events(user_id, occurred_at desc);

-- === RECOMMENDATION DECISION SNAPSHOT ===
create table if not exists public.recommendation_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.admission_goals(id) on delete cascade,
  nct_code text not null,
  rank integer,
  explanation jsonb not null default '{}'::jsonb,
  related_codes jsonb not null default '[]'::jsonb,
  input_context jsonb not null default '{}'::jsonb,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recommendation_snapshots_goal_unique unique (goal_id)
);

create index if not exists recommendation_snapshots_user_id_idx
  on public.recommendation_snapshots(user_id);

-- === PRODUCT HISTORY (DOMAIN), SEPARATE FROM TELEMETRY ===
create table if not exists public.product_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.admission_goals(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  title text not null,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  client_event_id text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint product_history_user_client_event_unique unique (user_id, client_event_id)
);

create index if not exists product_history_user_occurred_at_idx
  on public.product_history(user_id, occurred_at desc);
create index if not exists product_history_goal_occurred_at_idx
  on public.product_history(goal_id, occurred_at desc);

-- Repair the old text[] columns from the initial coach migration and make the
-- persisted representation match the JSON arrays used by the application.
alter table public.daily_plans
  alter column completed_task_ids drop default,
  alter column completed_task_ids type jsonb using to_jsonb(completed_task_ids),
  alter column skipped_task_ids drop default,
  alter column skipped_task_ids type jsonb using to_jsonb(skipped_task_ids);

update public.daily_plans
set
  completed_task_ids = coalesce(completed_task_ids, '[]'::jsonb),
  skipped_task_ids = coalesce(skipped_task_ids, '[]'::jsonb);

alter table public.daily_plans
  alter column completed_task_ids set default '[]'::jsonb,
  alter column completed_task_ids set not null,
  alter column skipped_task_ids set default '[]'::jsonb,
  alter column skipped_task_ids set not null;

-- === RLS AND DATA API ACCESS ===
alter table public.recommendation_snapshots enable row level security;
alter table public.product_history enable row level security;

drop policy if exists "Users can update own bookmarks" on public.bookmarks;
create policy "Users can update own bookmarks"
  on public.bookmarks
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own achievements" on public.achievements;
create policy "Users can update own achievements"
  on public.achievements
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own interviews" on public.interviews;
create policy "Users can update own interviews"
  on public.interviews
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their recommendation snapshots" on public.recommendation_snapshots;
create policy "Users can manage their recommendation snapshots"
  on public.recommendation_snapshots
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their product history" on public.product_history;
create policy "Users can read their product history"
  on public.product_history
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can append their product history" on public.product_history;
create policy "Users can append their product history"
  on public.product_history
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.recommendation_snapshots to authenticated;
grant select, insert on table public.product_history to authenticated;

-- Trigger helpers are internal implementation details, not public RPCs.
revoke execute on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists trg_interviews_updated_at on public.interviews;
create trigger trg_interviews_updated_at
  before update on public.interviews
  for each row execute function public.set_updated_at();

drop trigger if exists trg_recommendation_snapshots_updated_at on public.recommendation_snapshots;
create trigger trg_recommendation_snapshots_updated_at
  before update on public.recommendation_snapshots
  for each row execute function public.set_updated_at();
