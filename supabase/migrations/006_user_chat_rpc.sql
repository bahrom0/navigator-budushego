-- T-083: Find existing direct conversation between two users
create or replace function find_direct_conversation(p_user_id uuid, p_participant_id uuid)
returns uuid
language sql
stable
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
