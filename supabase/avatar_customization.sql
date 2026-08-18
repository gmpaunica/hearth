-- Hearth avatar customization migration.
-- Safe to run after schema.sql; it preserves existing profile rows and defaults.

alter table public.profiles
  add column if not exists avatar_config jsonb not null default '{}'::jsonb;

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant update (display_name, avatar_config) on public.profiles to authenticated;
grant select on public.profiles to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
