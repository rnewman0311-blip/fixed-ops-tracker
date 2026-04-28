-- Fixed Ops Tracker Supabase setup
-- Safe to run more than once. Prototype version with open anon access.

create table if not exists public.dealer_users (
  id bigserial primary key,
  username text not null,
  password text not null,
  name text not null,
  role text not null,
  store text not null,
  updated_at timestamptz default now()
);

alter table public.dealer_users add column if not exists username text;
alter table public.dealer_users add column if not exists password text;
alter table public.dealer_users add column if not exists name text;
alter table public.dealer_users add column if not exists role text;
alter table public.dealer_users add column if not exists store text;
alter table public.dealer_users add column if not exists updated_at timestamptz default now();

create unique index if not exists dealer_users_username_key on public.dealer_users (username);

insert into public.dealer_users (username, password, name, role, store)
values
  ('richard', 'director123', 'Richard / Director', 'director', 'All Stores'),
  ('pasadena', 'pasadena123', 'Honda of Pasadena Login', 'dealer', 'Honda of Pasadena'),
  ('seattle', 'seattle123', 'CDJR Hyundai Seattle Login', 'dealer', 'CDJR Hyundai Seattle'),
  ('elcajon', 'elcajon123', 'El Cajon Ford Login', 'dealer', 'El Cajon Ford'),
  ('brandon', 'brandon123', 'Brandon Ford Login', 'dealer', 'Brandon Ford'),
  ('friendly', 'friendly123', 'Friendly Ford Login', 'dealer', 'Friendly Ford')
on conflict (username) do update set
  password = excluded.password,
  name = excluded.name,
  role = excluded.role,
  store = excluded.store,
  updated_at = now();

create table if not exists public.daily_entries (
  id bigserial primary key,
  store text not null,
  entry_date date not null,
  ros numeric default 0,
  hours numeric default 0,
  labor numeric default 0,
  labor_gross numeric default 0,
  parts numeric default 0,
  parts_gross numeric default 0,
  updated_at timestamptz default now()
);

alter table public.daily_entries add column if not exists store text;
alter table public.daily_entries add column if not exists entry_date date;
alter table public.daily_entries add column if not exists ros numeric default 0;
alter table public.daily_entries add column if not exists hours numeric default 0;
alter table public.daily_entries add column if not exists labor numeric default 0;
alter table public.daily_entries add column if not exists labor_gross numeric default 0;
alter table public.daily_entries add column if not exists parts numeric default 0;
alter table public.daily_entries add column if not exists parts_gross numeric default 0;
alter table public.daily_entries add column if not exists updated_at timestamptz default now();

create unique index if not exists daily_entries_store_entry_date_key on public.daily_entries (store, entry_date);

alter table public.dealer_users disable row level security;
alter table public.daily_entries disable row level security;
