-- T-074: RLS Policies
-- Enable RLS on all tables
alter table if exists profiles enable row level security;
alter table if exists plans enable row level security;
alter table if exists analyses enable row level security;
alter table if exists interviews enable row level security;
alter table if exists bookmarks enable row level security;
alter table if exists achievements enable row level security;
alter table if exists activity_events enable row level security;

-- ========== PROFILES ==========
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile" on profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" on profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Anonymous can view own profile" on profiles;
create policy "Anonymous can view own profile" on profiles
  for select
  to anon
  using (session_id = current_setting('app.session_id', true));

-- ========== PLANS ==========
drop policy if exists "Users can view own plans" on plans;
create policy "Users can view own plans" on plans
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own plans" on plans;
create policy "Users can insert own plans" on plans
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own plans" on plans;
create policy "Users can delete own plans" on plans
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ========== ANALYSES ==========
drop policy if exists "Users can view own analyses" on analyses;
create policy "Users can view own analyses" on analyses
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own analyses" on analyses;
create policy "Users can insert own analyses" on analyses
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ========== INTERVIEWS ==========
drop policy if exists "Users can view own interviews" on interviews;
create policy "Users can view own interviews" on interviews
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own interviews" on interviews;
create policy "Users can insert own interviews" on interviews
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own interviews" on interviews;
create policy "Users can delete own interviews" on interviews
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ========== BOOKMARKS ==========
drop policy if exists "Users can view own bookmarks" on bookmarks;
create policy "Users can view own bookmarks" on bookmarks
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own bookmarks" on bookmarks;
create policy "Users can insert own bookmarks" on bookmarks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own bookmarks" on bookmarks;
create policy "Users can delete own bookmarks" on bookmarks
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ========== ACHIEVEMENTS ==========
drop policy if exists "Users can view own achievements" on achievements;
create policy "Users can view own achievements" on achievements
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own achievements" on achievements;
create policy "Users can insert own achievements" on achievements
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ========== ACTIVITY EVENTS ==========
drop policy if exists "Users can view own activity" on activity_events;
create policy "Users can view own activity" on activity_events
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own activity" on activity_events;
create policy "Users can insert own activity" on activity_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);
