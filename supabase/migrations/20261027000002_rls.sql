-- today: row-level security on every table, no exceptions.
-- signed-in users can only ever see and change their own rows. the anon role
-- gets nothing at all. the service-role key (seed script + assistant api)
-- bypasses rls by design and only ever lives in server-side env vars.

alter table public.settings enable row level security;
alter table public.projects enable row level security;
alter table public.routines enable row level security;
alter table public.tasks enable row level security;

revoke all on public.settings, public.projects, public.routines, public.tasks from anon;
grant select, insert, update, delete on public.settings, public.projects, public.routines, public.tasks to authenticated;

create policy "own settings" on public.settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own projects" on public.projects
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own routines" on public.routines
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own tasks" on public.tasks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
