-- T-082: User-to-User Chat RLS Policies
-- Helper function: check if user is member of conversation
create or replace function is_conversation_member(conv_id uuid, user_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from conversation_members
    where conversation_id = conv_id and user_id = user_uuid
  );
$$;

-- Helper function: check username is set
create or replace function has_username(user_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from profiles
    where user_id = user_uuid and username is not null
  );
$$;

-- Enable RLS
alter table if exists conversations enable row level security;
alter table if exists conversation_members enable row level security;
alter table if exists messages enable row level security;
alter table if exists attachments enable row level security;
alter table if exists message_edits enable row level security;

-- ========== CONVERSATIONS ==========
drop policy if exists "Members can view conversations" on conversations;
create policy "Members can view conversations" on conversations
  for select
  to authenticated
  using (is_conversation_member(id, auth.uid()));

drop policy if exists "Authenticated users can create conversations" on conversations;
create policy "Authenticated users can create conversations" on conversations
  for insert
  to authenticated
  with check (has_username(auth.uid()));

drop policy if exists "Members can update conversations" on conversations;
create policy "Members can update conversations" on conversations
  for update
  to authenticated
  using (is_conversation_member(id, auth.uid()))
  with check (is_conversation_member(id, auth.uid()));

-- ========== CONVERSATION MEMBERS ==========
drop policy if exists "Members can view conversation members" on conversation_members;
create policy "Members can view conversation members" on conversation_members
  for select
  to authenticated
  using (is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "Users can insert self as member" on conversation_members;
create policy "Users can insert self as member" on conversation_members
  for insert
  to authenticated
  with check (
    has_username(auth.uid())
    and user_id = auth.uid()
    and exists (
      select 1 from conversations
      where id = conversation_id
    )
  );

drop policy if exists "Members can update own membership" on conversation_members;
create policy "Members can update own membership" on conversation_members
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ========== MESSAGES ==========
drop policy if exists "Members can view messages" on messages;
create policy "Members can view messages" on messages
  for select
  to authenticated
  using (is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "Members can insert messages" on messages;
create policy "Members can insert messages" on messages
  for insert
  to authenticated
  with check (
    has_username(auth.uid())
    and sender_id = auth.uid()
    and is_conversation_member(conversation_id, auth.uid())
  );

drop policy if exists "Senders can update own messages" on messages;
create policy "Senders can update own messages" on messages
  for update
  to authenticated
  using (sender_id = auth.uid() and deleted_at is null)
  with check (sender_id = auth.uid() and deleted_at is null);

drop policy if exists "Senders can soft-delete own messages" on messages;
create policy "Senders can soft-delete own messages" on messages
  for delete
  to authenticated
  using (sender_id = auth.uid() and deleted_at is null);

-- ========== ATTACHMENTS ==========
drop policy if exists "Members can view attachments" on attachments;
create policy "Members can view attachments" on attachments
  for select
  to authenticated
  using (
    exists (
      select 1 from messages
      where messages.id = attachments.message_id
      and is_conversation_member(messages.conversation_id, auth.uid())
    )
  );

drop policy if exists "Senders can insert attachments" on attachments;
create policy "Senders can insert attachments" on attachments
  for insert
  to authenticated
  with check (
    exists (
      select 1 from messages
      where messages.id = attachments.message_id
      and messages.sender_id = auth.uid()
    )
  );

-- ========== MESSAGE EDITS ==========
drop policy if exists "Members can view message edits" on message_edits;
create policy "Members can view message edits" on message_edits
  for select
  to authenticated
  using (
    exists (
      select 1 from messages
      where messages.id = message_edits.message_id
      and is_conversation_member(messages.conversation_id, auth.uid())
    )
  );

drop policy if exists "Senders can insert message edits" on message_edits;
create policy "Senders can insert message edits" on message_edits
  for insert
  to authenticated
  with check (
    exists (
      select 1 from messages
      where messages.id = message_edits.message_id
      and messages.sender_id = auth.uid()
    )
  );

-- ========== PROFILES (username) ==========
drop policy if exists "Authenticated users can view profiles" on profiles;
create policy "Authenticated users can view profiles" on profiles
  for select
  to authenticated
  using (true);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
