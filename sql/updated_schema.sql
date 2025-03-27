-- Drop existing tables if they exist
drop table if exists messages;
drop table if exists sessions;

-- Create sessions table with our updated schema
create table sessions (
  id text primary key,
  user_id uuid references auth.users,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  duration integer default 0,
  insights text[] default '{}',
  summary jsonb,
  is_archived boolean default false
);

-- Create messages table with our updated schema
create table messages (
  id uuid default uuid_generate_v4() primary key,
  session_id text references sessions on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text,
  essence text,
  timestamp timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table sessions enable row level security;
alter table messages enable row level security;

-- Create policies
create policy "Users can view own sessions"
  on sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on sessions for delete
  using (auth.uid() = user_id);

create policy "Users can view own messages"
  on messages for select
  using (session_id in (
    select id from sessions where user_id = auth.uid()
  ));

create policy "Users can insert own messages"
  on messages for insert
  with check (session_id in (
    select id from sessions where user_id = auth.uid()
  ));

create policy "Users can update own messages"
  on messages for update
  using (session_id in (
    select id from sessions where user_id = auth.uid()
  ));

create policy "Users can delete own messages"
  on messages for delete
  using (session_id in (
    select id from sessions where user_id = auth.uid()
  ));

-- Create indexes for better performance
create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists messages_session_id_idx on messages(session_id); 