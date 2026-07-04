-- T-075: Priority activity tracking

alter table if exists activity_events
  add column if not exists is_priority boolean not null default false,
  add column if not exists priority_rank smallint not null default 0;

update activity_events
set
  is_priority = case
    when event_type in (
      'choose_category',
      'start_analysis',
      'start_interview',
      'finish_interview',
      'generate_plan',
      'save_plan',
      'complete_plan_step',
      'test_plan',
      'complete_plan',
      'regenerate_plan',
      'use_teacher',
      'coach_goal_set',
      'coach_diagnostic_taken',
      'coach_roadmap_created',
      'coach_day_completed',
      'coach_task_completed',
      'coach_mini_test_taken',
      'coach_streak_milestone',
      'coach_goal_achieved'
    ) then true
    else false
  end,
  priority_rank = case
    when event_type in (
      'choose_category',
      'start_analysis',
      'start_interview',
      'finish_interview',
      'generate_plan',
      'save_plan',
      'complete_plan_step',
      'test_plan',
      'complete_plan',
      'regenerate_plan',
      'use_teacher',
      'coach_goal_set',
      'coach_diagnostic_taken',
      'coach_roadmap_created',
      'coach_day_completed',
      'coach_task_completed',
      'coach_mini_test_taken',
      'coach_streak_milestone',
      'coach_goal_achieved'
    ) then 1
    else 0
  end
where is_priority is distinct from true or priority_rank is distinct from 1;

create index if not exists idx_activity_events_user_priority_created_at
  on activity_events(user_id, is_priority, created_at desc);
