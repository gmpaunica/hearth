-- The client reads the user's profile and their partner's avatar_config. RLS
-- still limits those rows to the couple, while this table grant lets PostgREST
-- serve the permitted rows and lets the client hydrate saved appearances.
grant select on public.profiles to authenticated;

notify pgrst, 'reload schema';
