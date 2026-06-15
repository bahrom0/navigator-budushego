-- T-084: Fix RLS helper functions — add security definer to prevent recursion
create or replace function is_conversation_member(conv_id uuid, user_uuid uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from conversation_members
    where conversation_id = conv_id and user_id = user_uuid
  );
$$;

create or replace function has_username(user_uuid uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from profiles
    where user_id = user_uuid and username is not null
  );
$$;

create or replace function find_direct_conversation(p_user_id uuid, p_participant_id uuid)
returns uuid
language sql
stable
security definer
as $$
  select cm1.conversation_id
  from conversation_members cm1
  join conversation_members cm2
    on cm2.conversation_id = cm1.conversation_id
  join conversations c
    on c.id = cm1.conversation_id
  where cm1.user_id = p_user_id
    and cm2.user_id = p_participant_id
    and c.is_group = false
  limit 1;
$$;
