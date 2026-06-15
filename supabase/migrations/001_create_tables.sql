-- T-067: Profiles
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  session_id text,
  email text,
  name text,
  level text default 'beginner',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- T-068: Plans
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  nct_code text not null,
  nct_title text not null,
  level text,
  goals jsonb default '[]'::jsonb,
  stages jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- T-069: History (analyses)
create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  nct_code text,
  nct_title text,
  categories text[],
  recommendation jsonb,
  created_at timestamptz default now()
);

-- T-070: Interviews
create table if not exists interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  nct_code text not null,
  nct_title text not null,
  questions jsonb default '[]'::jsonb,
  summary text,
  level text,
  created_at timestamptz default now()
);

-- T-071: Bookmarks
create table if not exists bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  nct_code text not null,
  nct_title text not null,
  institution text,
  city text,
  created_at timestamptz default now(),
  unique (user_id, nct_code)
);

-- T-072: Achievements
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  achievement_id text not null,
  title text not null,
  description text,
  unlocked_at timestamptz default now(),
  unique (user_id, achievement_id)
);

-- T-073: Activity Events
create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  event_type text not null,
  label text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- indexes for performance
create index if not exists idx_profiles_user_id on profiles(user_id);
create index if not exists idx_profiles_session_id on profiles(session_id);
create index if not exists idx_plans_user_id on plans(user_id);
create index if not exists idx_analyses_user_id on analyses(user_id);
create index if not exists idx_interviews_user_id on interviews(user_id);
create index if not exists idx_bookmarks_user_id on bookmarks(user_id);
create index if not exists idx_achievements_user_id on achievements(user_id);
create index if not exists idx_activity_events_user_id on activity_events(user_id);
create index if not exists idx_activity_events_created_at on activity_events(created_at);
