-- Fixed Ops Tracker Supabase setup
-- Paste this whole file into Supabase > SQL Editor > New Query, then click Run.
-- This prototype keeps demo passwords in a table for easy setup. For a production app, switch to Supabase Auth.

drop table if exists public.daily_entries;
drop table if exists public.dealer_users;

create table public.dealer_users (
  username text primary key,
  password_plain text not null,
  name text not null,
  role text not null check (role in ('director', 'dealer')),
  store text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.dealer_users (username, password_plain, name, role, store) values
('richard', 'director123', 'Richard / Director', 'director', 'All Stores'),
('pasadena', 'pasadena123', 'Honda of Pasadena Login', 'dealer', 'Honda of Pasadena'),
('seattle', 'seattle123', 'CDJR Hyundai Seattle Login', 'dealer', 'CDJR Hyundai Seattle'),
('elcajon', 'elcajon123', 'El Cajon Ford Login', 'dealer', 'El Cajon Ford'),
('brandon', 'brandon123', 'Brandon Ford Login', 'dealer', 'Brandon Ford'),
('friendly', 'friendly123', 'Friendly Ford Login', 'dealer', 'Friendly Ford');

create table public.daily_entries (
  id bigint generated always as identity primary key,
  store text not null,
  entry_date date not null,
  ros numeric not null default 0,
  hours numeric not null default 0,
  labor numeric not null default 0,
  labor_gross numeric not null default 0,
  parts numeric not null default 0,
  parts_gross numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store, entry_date),
  constraint labor_gross_not_over_labor check (labor_gross <= labor),
  constraint parts_gross_not_over_parts check (parts_gross <= parts)
);

-- Simple prototype access:
-- RLS is OFF so the Vercel website can read/write using the public anon key.
-- Do not store sensitive customer, employee, or financial account data in this prototype setup.
alter table public.dealer_users disable row level security;
alter table public.daily_entries disable row level security;