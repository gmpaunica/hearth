-- Source-linked home keepsakes ------------------------------------------------
--
-- Keepsakes are irreversible relationship milestones. The source artifact may
-- later be removed from its normal surface, but the shared keepsake remains
-- until the couple is unpaired (the home epoch purge owns that lifecycle).

create or replace function private.mint_home_keepsake(
  p_couple_id uuid,
  p_source_kind text,
  p_source_id text,
  p_asset_id text,
  p_metadata jsonb default '{}'::jsonb,
  p_once_per_kind boolean default true
) returns uuid language plpgsql volatile security definer
set search_path = pg_catalog, public, private as $$
declare
  existing_id uuid;
  object_uuid uuid;
  world_is_frozen boolean;
begin
  select hs.world_frozen_at is not null into world_is_frozen
  from public.home_states hs where hs.couple_id = p_couple_id;
  if world_is_frozen is null or world_is_frozen then return null; end if;

  -- Serialise first-of-kind milestones so two partners cannot mint twins.
  perform pg_advisory_xact_lock(hashtextextended(
    'home-keepsake:' || p_couple_id::text || ':' || p_source_kind, 0
  ));

  if p_once_per_kind then
    select k.id into existing_id from public.home_keepsakes k
    where k.couple_id = p_couple_id and k.source_kind = p_source_kind
    order by k.minted_at, k.id limit 1;
  else
    select k.id into existing_id from public.home_keepsakes k
    where k.couple_id = p_couple_id and k.source_kind = p_source_kind
      and k.source_id = p_source_id;
  end if;
  if existing_id is not null then return existing_id; end if;

  insert into public.home_objects (
    couple_id, seed_key, asset_id, placement_state, surface, style
  ) values (
    p_couple_id,
    'keepsake:' || p_source_kind || ':' || p_source_id,
    p_asset_id,
    'stored',
    'shelf',
    jsonb_build_object('sourceLinked', true, 'sourceKind', p_source_kind)
  ) returning id into object_uuid;

  insert into public.home_keepsakes (
    couple_id, source_kind, source_id, asset_id, object_id, metadata
  ) values (
    p_couple_id, p_source_kind, p_source_id, p_asset_id, object_uuid,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into existing_id;

  -- Home Studio drafts now conflict safely and realtime subscribers refetch.
  update public.home_states
  set revision = revision + 1, updated_at = now()
  where couple_id = p_couple_id;
  return existing_id;
end;
$$;

create or replace function private.refresh_home_milestone_keepsakes(p_couple_id uuid)
returns void language plpgsql volatile security definer
set search_path = pg_catalog, public, private as $$
declare
  source_uuid text;
  source_date date;
  source_time timestamptz;
  drawing_uuid text;
  drawing_date date;
  drawing_time timestamptz;
  active_seconds bigint;
  anniversary_count integer;
  anniversary_number integer;
begin
  if exists (
    select 1 from public.home_states hs
    where hs.couple_id = p_couple_id and hs.world_frozen_at is not null
  ) then return; end if;

  select gm.id::text, gm.home_date into source_uuid, source_date
  from public.greenhouse_memories gm
  where gm.couple_id = p_couple_id and gm.solo_owner_id is null
  order by gm.planted_at, gm.id limit 1;
  if source_uuid is not null then
    perform private.mint_home_keepsake(
      p_couple_id, 'first-planted-memory', source_uuid, 'flower-vase',
      jsonb_build_object('milestone', 'first planted memory', 'homeDate', source_date)
    );
  end if;

  source_uuid := null; source_date := null;
  select dm.id::text, dm.home_date into source_uuid, source_date
  from public.daily_media dm
  where dm.couple_id = p_couple_id and dm.medium = 'photo'
    and dm.solo_owner_id is null
  order by dm.submitted_at, dm.id limit 1;
  if source_uuid is not null then
    perform private.mint_home_keepsake(
      p_couple_id, 'first-shared-photo', source_uuid, 'memory-frame',
      jsonb_build_object('milestone', 'first shared photo', 'homeDate', source_date)
    );
  end if;

  -- Diary pages contain drawings and shared voice notes. Resolve whichever was
  -- genuinely first without recording which partner authored it.
  source_uuid := null; source_date := null; source_time := null;
  select dm.id::text, dm.home_date, dm.submitted_at
    into source_uuid, source_date, source_time
  from public.daily_media dm
  where dm.couple_id = p_couple_id and dm.medium = 'voice'
    and dm.solo_owner_id is null
  order by dm.submitted_at, dm.id limit 1;

  if to_regclass('public.drawings') is not null then
    execute $query$
      select d.id::text, d.day, d.created_at from public.drawings d
      where d.couple_id = $1 order by d.created_at, d.id limit 1
    $query$ into drawing_uuid, drawing_date, drawing_time using p_couple_id;
    if drawing_uuid is not null and (source_time is null or drawing_time < source_time) then
      source_uuid := drawing_uuid;
      source_date := drawing_date;
      source_time := drawing_time;
    end if;
  end if;
  if source_uuid is not null then
    perform private.mint_home_keepsake(
      p_couple_id, 'first-diary-entry', source_uuid, 'book-stack',
      jsonb_build_object('milestone', 'first diary entry', 'homeDate', source_date)
    );
  end if;

  active_seconds := private.active_home_growth_seconds(p_couple_id);
  anniversary_count := least(100, floor(coalesce(active_seconds, 0)::numeric / 31536000)::integer);
  if anniversary_count > 0 then
    for anniversary_number in 1..anniversary_count loop
      perform private.mint_home_keepsake(
        p_couple_id, 'pairing-anniversary', anniversary_number::text,
        'couple-statuette',
        jsonb_build_object('milestone', 'pairing anniversary', 'year', anniversary_number),
        false
      );
    end loop;
  end if;
end;
$$;

create or replace function private.mint_home_keepsake_from_daily_media()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private as $$
begin
  if new.solo_owner_id is not null then return new; end if;
  if new.medium = 'photo' then
    perform private.mint_home_keepsake(
      new.couple_id, 'first-shared-photo', new.id::text, 'memory-frame',
      jsonb_build_object('milestone', 'first shared photo', 'homeDate', new.home_date)
    );
  elsif new.medium = 'voice' then
    perform private.mint_home_keepsake(
      new.couple_id, 'first-diary-entry', new.id::text, 'book-stack',
      jsonb_build_object('milestone', 'first diary entry', 'homeDate', new.home_date)
    );
  end if;
  return new;
end;
$$;

create or replace function private.mint_home_keepsake_from_greenhouse()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private as $$
begin
  if new.solo_owner_id is null then
    perform private.mint_home_keepsake(
      new.couple_id, 'first-planted-memory', new.id::text, 'flower-vase',
      jsonb_build_object('milestone', 'first planted memory', 'homeDate', new.home_date)
    );
  end if;
  return new;
end;
$$;

create or replace function private.mint_home_keepsake_from_drawing()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private as $$
begin
  perform private.mint_home_keepsake(
    new.couple_id, 'first-diary-entry', new.id::text, 'book-stack',
    jsonb_build_object('milestone', 'first diary entry', 'homeDate', new.day)
  );
  return new;
end;
$$;

drop trigger if exists mint_home_keepsake_daily_media on public.daily_media;
create trigger mint_home_keepsake_daily_media after insert on public.daily_media
for each row execute function private.mint_home_keepsake_from_daily_media();

drop trigger if exists mint_home_keepsake_greenhouse on public.greenhouse_memories;
create trigger mint_home_keepsake_greenhouse after insert on public.greenhouse_memories
for each row execute function private.mint_home_keepsake_from_greenhouse();

do $$ begin
  if to_regclass('public.drawings') is not null then
    execute 'drop trigger if exists mint_home_keepsake_drawing on public.drawings';
    execute 'create trigger mint_home_keepsake_drawing after insert on public.drawings '
      || 'for each row execute function private.mint_home_keepsake_from_drawing()';
  end if;
end $$;

-- Refresh milestone state before returning any snapshot. This backfills
-- artifacts created before the home system and catches anniversaries without a
-- scheduler. Repeated calls are no-ops after each unique keepsake is minted.
create or replace function public.get_home_snapshot()
returns jsonb language plpgsql volatile security definer
set search_path = pg_catalog, public, private as $$
declare
  uid uuid := auth.uid();
  home public.couples;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into home from public.couples
  where member_a = uid or member_b = uid order by created_at limit 1;
  if home.id is null then raise exception 'No home found' using errcode = 'P0002'; end if;
  if home.member_b is null then
    return jsonb_build_object(
      'paired', false, 'layoutId', 'cottage-v2', 'revision', 0,
      'rooms', '[]'::jsonb, 'objects', '[]'::jsonb,
      'capabilities', jsonb_build_object('view', false, 'edit', false, 'expand', false)
    );
  end if;
  perform private.ensure_home_state(home.id, false);
  perform private.refresh_home_growth_unlocks(home.id);
  perform private.refresh_home_milestone_keepsakes(home.id);
  return private.home_snapshot(home.id) || jsonb_build_object('paired', true);
end;
$$;

revoke execute on function private.mint_home_keepsake(uuid,text,text,text,jsonb,boolean)
  from public, anon, authenticated;
revoke execute on function private.refresh_home_milestone_keepsakes(uuid)
  from public, anon, authenticated;
revoke execute on function private.mint_home_keepsake_from_daily_media()
  from public, anon, authenticated;
revoke execute on function private.mint_home_keepsake_from_greenhouse()
  from public, anon, authenticated;
revoke execute on function private.mint_home_keepsake_from_drawing()
  from public, anon, authenticated;
