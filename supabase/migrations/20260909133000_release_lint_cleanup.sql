-- Forward-only cleanup after the 1.0.5 backend deployment.
-- The loop variable is implicit in PL/pgSQL; declaring it separately caused
-- a shadowed/unused-variable lint warning without changing runtime behavior.

begin;

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

revoke execute on function private.refresh_home_milestone_keepsakes(uuid)
  from public, anon, authenticated;

commit;
