-- T-085: Enable Realtime for user-chat tables
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
