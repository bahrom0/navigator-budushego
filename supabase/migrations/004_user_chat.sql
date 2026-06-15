-- T-076: User-to-User Chat
-- Add username to profiles
alter table if exists profiles add column if not exists username text unique;

-- T-077: Conversations
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_message_at timestamptz default now(),
  is_group boolean default false,
  title text
);

-- T-078: Conversation members
create table if not exists conversation_members (
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  last_read_at timestamptz,
  last_read_message_id uuid,
  role text not null default 'member' check (role in ('member', 'admin')),
  primary key (conversation_id, user_id)
);

-- T-079: Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  client_message_id text not null,
  content text,
  message_type text not null default 'text' check (message_type in ('text', 'image', 'video', 'audio', 'document', 'system')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint unique_client_message unique (client_message_id)
);

-- T-080: Attachments
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size integer,
  mime_type text,
  thumbnail_url text,
  created_at timestamptz default now()
);

-- T-081: Message edits history (audit trail)
create table if not exists message_edits (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  previous_content text not null,
  edited_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_conversation_members_user
  on conversation_members (user_id);
create index if not exists idx_conversation_members_conversation
  on conversation_members (conversation_id);
create index if not exists idx_messages_conversation_created
  on messages (conversation_id, created_at, id);
create index if not exists idx_messages_client_id
  on messages (client_message_id);
create index if not exists idx_messages_sender
  on messages (sender_id);
create index if not exists idx_attachments_message
  on attachments (message_id);
create index if not exists idx_message_edits_message
  on message_edits (message_id);
create index if not exists idx_conversations_last_message
  on conversations (last_message_at desc);
