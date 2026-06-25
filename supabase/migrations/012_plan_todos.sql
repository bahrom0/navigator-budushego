-- T-074: Add plan tracking columns
alter table if exists plans
  add column if not exists completed_steps jsonb default '[]'::jsonb,
  add column if not exists status text default 'active';

create index if not exists idx_plans_status on plans(status);
create index if not exists idx_plans_nct_code on plans(nct_code);
