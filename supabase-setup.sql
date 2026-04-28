create table if not exists dealer_users (
  username text primary key,
  password text not null,
  name text not null,
  role text not null,
  store text not null
);

create table if not exists daily_entries (
  id bigserial primary key,
  store text not null,
  entry_date date not null,
  ros numeric default 0,
  hours numeric default 0,
  labor numeric default 0,
  labor_gross numeric default 0,
  parts numeric default 0,
  parts_gross numeric default 0,
  updated_at timestamptz default now(),
  unique(store, entry_date)
);

insert into dealer_users (username, password, name, role, store) values
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
  store = excluded.store;

alter table dealer_users enable row level security;
alter table daily_entries enable row level security;

drop policy if exists "public read dealer users" on dealer_users;
drop policy if exists "public update dealer users" on dealer_users;
drop policy if exists "public insert dealer users" on dealer_users;
drop policy if exists "public read daily entries" on daily_entries;
drop policy if exists "public insert daily entries" on daily_entries;
drop policy if exists "public update daily entries" on daily_entries;

create policy "public read dealer users" on dealer_users for select using (true);
create policy "public update dealer users" on dealer_users for update using (true) with check (true);
create policy "public insert dealer users" on dealer_users for insert with check (true);
create policy "public read daily entries" on daily_entries for select using (true);
create policy "public insert daily entries" on daily_entries for insert with check (true);
create policy "public update daily entries" on daily_entries for update using (true) with check (true);
