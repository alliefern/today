-- today: schema
-- one user, but every table still carries user_id so row-level security can
-- be strict (see the next migration). dates are plain `date`s in the user's
-- own time zone; there is deliberately no time-of-day column anywhere.

create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  carry_over text not null default 'ask' check (carry_over in ('auto', 'ask', 'never')),
  week_start smallint not null default 1 check (week_start between 0 and 6), -- 0 = sunday
  timezone text not null default 'Europe/London',
  gwd_scheduled_through date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  color text not null default '#FF6FA8' check (color ~ '^#[0-9a-fA-F]{6}$'),
  emoji text not null default '✨' check (char_length(emoji) between 1 and 16),
  link text check (link is null or link ~* '^https?://'),
  helper text check (helper is null or char_length(helper) <= 80),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  schedule_type text not null default 'daily'
    check (schedule_type in ('daily', 'weekdays', 'weekly', 'monthly', 'bonus')),
  weekdays smallint[] not null default '{}'
    check (weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]), -- 0 = sunday
  day_of_month smallint check (day_of_month between 1 and 31),
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  -- a routine and its project must belong to the same user
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  check (schedule_type <> 'weekdays' or cardinality(weekdays) >= 1),
  check (schedule_type <> 'weekly' or cardinality(weekdays) = 1),
  check (schedule_type <> 'monthly' or day_of_month is not null)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid,
  routine_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  date date not null,                         -- the day it lives on
  bonus boolean not null default false,       -- "if you have extra time"; never counts as unfinished
  sticky boolean not null default false,      -- shows every day from `date` until it is ticked
  done_at timestamptz,
  dismissed_at timestamptz,                   -- let go from the "from yesterday?" tray
  created_at timestamptz not null default now(),
  -- a routine only ever has one row per day (null routine_id = one-off, never clashes)
  unique (routine_id, date),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  foreign key (routine_id, user_id) references public.routines (id, user_id) on delete set null (routine_id)
);

create index tasks_user_date_idx on public.tasks (user_id, date);
create index tasks_open_sticky_idx on public.tasks (user_id) where sticky and done_at is null;
create index routines_user_project_idx on public.routines (user_id, project_id);

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();
