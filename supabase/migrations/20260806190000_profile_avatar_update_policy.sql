-- Allow signed-in people to save their own profile customization only.
-- The column grant fixes PostgREST's "permission denied for table profiles";
-- RLS still prevents either partner from updating the other person's row.

alter table public.profiles enable row level security;

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant update (display_name, avatar_config) on public.profiles to authenticated;
