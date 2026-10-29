create extension if not exists pgcrypto;

create table if not exists wa_numbers (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  phone text,
  phone_number_id text unique,
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  wa_number_id uuid references wa_numbers(id) on delete set null,
  name text,
  child_name text,
  child_age text,
  source text default 'Direct',
  campaign text,
  status text default 'new',
  notes text,
  last_message text,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (phone, wa_number_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  direction text not null,
  body text,
  created_at timestamptz default now()
);

create table if not exists call_reminders (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  call_no int not null check (call_no between 1 and 3),
  due_at timestamptz not null,
  status text default 'pending',
  outcome text,
  done_at timestamptz,
  unique (lead_id, call_no)
);

-- Lock the tables from the public internet. Only our server (service role key) can read/write.
alter table wa_numbers enable row level security;
alter table leads enable row level security;
alter table messages enable row level security;
alter table call_reminders enable row level security;
