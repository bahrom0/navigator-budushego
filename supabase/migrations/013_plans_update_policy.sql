-- T-075: Add UPDATE policy for plans table
drop policy if exists "Users can update own plans" on plans;
create policy "Users can update own plans" on plans
  for update
  to authenticated
  using (auth.uid() = user_id);

-- Also add UPDATE policy for interviews (was missing too)
drop policy if exists "Users can update own interviews" on interviews;
create policy "Users can update own interviews" on interviews
  for update
  to authenticated
  using (auth.uid() = user_id);
