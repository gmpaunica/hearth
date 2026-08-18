-- Add synchronized avatar customization without changing stable A/B identity.
alter table public.profiles
  add column if not exists avatar_config jsonb not null default '{}'::jsonb;

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

-- Ask PostgREST to refresh its schema cache immediately after this migration.
notify pgrst, 'reload schema';
