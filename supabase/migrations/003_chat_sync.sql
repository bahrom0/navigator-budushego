-- T-075: Chat tables RLS and indexes

alter table if exists chat_sessions enable row level security;
alter table if exists chat_messages enable row level security;

drop policy if exists "Users can view own sessions" on chat_sessions;
create policy "Users can view own sessions" on chat_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own sessions" on chat_sessions;
create policy "Users can insert own sessions" on chat_sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own sessions" on chat_sessions;
create policy "Users can update own sessions" on chat_sessions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sessions" on chat_sessions;
create policy "Users can delete own sessions" on chat_sessions
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can view messages in own sessions" on chat_messages;
create policy "Users can view messages in own sessions" on chat_messages
  for select
  to authenticated
  using (
    exists (
      select 1 from chat_sessions
      where chat_sessions.id = chat_messages.session_id
      and chat_sessions.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert messages in own sessions" on chat_messages;
create policy "Users can insert messages in own sessions" on chat_messages
  for insert
  to authenticated
  with check (
    exists (
      select 1 from chat_sessions
      where chat_sessions.id = chat_messages.session_id
      and chat_sessions.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete messages in own sessions" on chat_messages;
create policy "Users can delete messages in own sessions" on chat_messages
  for delete
  to authenticated
  using (
    exists (
      select 1 from chat_sessions
      where chat_sessions.id = chat_messages.session_id
      and chat_sessions.user_id = auth.uid()
    )
  );

create index if not exists idx_chat_messages_session_cursor
  on chat_messages (session_id, created_at, id);
