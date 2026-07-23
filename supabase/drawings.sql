-- Hearth — the daily drawing ritual (Phase: love notes)
--
-- Once a day each partner can leave a tiny pixel drawing for the other. It's
-- shown on an easel in the room and resets each day. Run once in the Supabase
-- dashboard: SQL Editor → paste → Run. Safe to re-run.

create table if not exists public.drawings (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  from_user  uuid not null references public.profiles (id) on delete cascade,
  day        date not null default current_date,
  -- The canvas: GRID*GRID characters, one per pixel ('.' = empty, else a
  -- palette index 0-9). Kept as text so a drawing is a few hundred bytes.
  grid       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One drawing per person per day (client upserts to redraw today's).
  unique (couple_id, from_user, day)
);

alter table public.drawings enable row level security;

-- Read any drawing in your couple; write only your own.
drop policy if exists drawings_select on public.drawings;
create policy drawings_select on public.drawings for select
  using (is_couple_member(couple_id));
drop policy if exists drawings_insert on public.drawings;
create policy drawings_insert on public.drawings for insert
  with check (is_couple_member(couple_id) and from_user = auth.uid());
drop policy if exists drawings_update on public.drawings;
create policy drawings_update on public.drawings for update
  using (from_user = auth.uid() and is_couple_member(couple_id));

-- Live updates so a fresh drawing lights up the partner's easel right away.
-- Idempotent: adding a table that's already in the publication raises 42710,
-- so only add it when it isn't a member yet (safe to re-run).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'drawings'
  ) then
    alter publication supabase_realtime add table public.drawings;
  end if;
end $$;
