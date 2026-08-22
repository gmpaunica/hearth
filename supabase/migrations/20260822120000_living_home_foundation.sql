-- Hearth Living Home foundation
--
-- Additive, versioned storage for the modular cottage. Existing paired homes
-- receive the full 1.0.4 composition; homes paired after this migration start
-- with the compact cottage-v2 hub. Direct table writes stay closed: edits go
-- through apply_home_edit so a couple revision advances atomically.

begin;

alter table public.couples
  add column if not exists paired_at timestamptz;

update public.couples
set paired_at = created_at
where member_b is not null and paired_at is null;

create table if not exists public.home_catalog_assets (
  id                    text primary key,
  revision              integer not null default 1 check (revision > 0),
  catalog_version       text not null,
  category              text not null,
  renderer              text not null,
  footprint             jsonb not null,
  rotations             smallint[] not null default '{0,1,2,3}',
  compatible_rooms      text[] not null,
  compatible_surfaces   text[] not null default '{floor}',
  collision_clearance   numeric(5,2) not null default 0 check (collision_clearance >= 0),
  palette_slots         text[] not null default '{}',
  attachment_sockets    text[] not null default '{}',
  render_cost           integer not null default 1 check (render_cost > 0),
  progression           jsonb not null default '{}'::jsonb,
  functional            jsonb not null default '{}'::jsonb,
  route_endpoint        boolean not null default false,
  retired_at            timestamptz,
  check (jsonb_typeof(footprint) = 'object'),
  check (jsonb_typeof(progression) = 'object'),
  check (jsonb_typeof(functional) = 'object')
);

create table if not exists public.home_states (
  couple_id          uuid primary key references public.couples (id) on delete cascade,
  schema_version     integer not null default 2 check (schema_version > 0),
  layout_id          text not null default 'cottage-v2',
  catalog_version    text not null default 'home-catalog-v1',
  revision           bigint not null default 1 check (revision > 0),
  garden_tier        text not null default 'courtyard'
    check (garden_tier in ('courtyard', 'standard', 'large', 'grand')),
  finishes           jsonb not null default '{}'::jsonb,
  world_frozen_at    timestamptz,
  growth_seconds     bigint not null default 0 check (growth_seconds >= 0),
  growth_resumed_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (jsonb_typeof(finishes) = 'object')
);

create table if not exists public.home_rooms (
  id               uuid primary key default gen_random_uuid(),
  couple_id        uuid not null references public.couples (id) on delete cascade,
  module_id        text not null,
  socket_id        text not null,
  size_tier        text not null check (size_tier in ('compact', 'standard', 'large')),
  bounds           jsonb not null,
  finish           jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (couple_id, socket_id),
  unique (couple_id, id),
  check (jsonb_typeof(bounds) = 'object'),
  check (jsonb_typeof(finish) = 'object')
);

create table if not exists public.home_reserved_routes (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  room_id     uuid not null references public.home_rooms (id) on delete cascade,
  route_key   text not null,
  min_x       numeric(8,3) not null,
  max_x       numeric(8,3) not null,
  min_z       numeric(8,3) not null,
  max_z       numeric(8,3) not null,
  unique (couple_id, route_key),
  check (min_x < max_x and min_z < max_z)
);

create table if not exists public.home_objects (
  id                 uuid primary key default gen_random_uuid(),
  couple_id          uuid not null references public.couples (id) on delete cascade,
  room_id            uuid references public.home_rooms (id) on delete set null,
  seed_key           text,
  asset_id           text not null,
  asset_revision     integer not null default 1 check (asset_revision > 0),
  placement_state    text not null default 'placed'
    check (placement_state in ('placed', 'stored', 'needs_spot')),
  surface            text not null default 'floor',
  position_x         numeric(8,3) not null default 0,
  position_y         numeric(8,3) not null default 0,
  position_z         numeric(8,3) not null default 0,
  rotation           smallint not null default 0 check (rotation between 0 and 3),
  style              jsonb not null default '{}'::jsonb,
  parent_object_id   uuid references public.home_objects (id) on delete cascade,
  attachment_socket  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (couple_id, id),
  unique (couple_id, seed_key),
  check (jsonb_typeof(style) = 'object'),
  check ((parent_object_id is null) = (attachment_socket is null))
);

create table if not exists public.home_unlocks (
  couple_id    uuid not null references public.couples (id) on delete cascade,
  unlock_id    text not null,
  source       text not null default 'growth',
  unlocked_at  timestamptz not null default now(),
  primary key (couple_id, unlock_id)
);

create table if not exists public.home_keepsakes (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples (id) on delete cascade,
  source_kind   text not null,
  source_id     text not null,
  asset_id      text not null,
  object_id     uuid references public.home_objects (id) on delete set null,
  metadata      jsonb not null default '{}'::jsonb,
  minted_at     timestamptz not null default now(),
  unique (couple_id, source_kind, source_id),
  check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.home_edit_requests (
  couple_id         uuid not null references public.couples (id) on delete cascade,
  request_id        uuid not null,
  actor_id          uuid not null references public.profiles (id) on delete cascade,
  expected_revision bigint not null,
  result_revision   bigint not null,
  operations_hash   text not null,
  response           jsonb not null,
  created_at         timestamptz not null default now(),
  primary key (couple_id, request_id),
  check (jsonb_typeof(response) = 'object')
);

create index if not exists home_objects_scene_idx
  on public.home_objects (couple_id, placement_state, room_id);
create index if not exists home_objects_parent_idx
  on public.home_objects (parent_object_id) where parent_object_id is not null;
create index if not exists home_edit_requests_actor_idx
  on public.home_edit_requests (actor_id, created_at desc);

-- The foundation catalog mirrors every independently visible 1.0.4 piece.
-- Later catalog packs append rows without changing stored instances.
insert into public.home_catalog_assets (
  id, catalog_version, category, renderer, footprint, compatible_rooms,
  compatible_surfaces, collision_clearance, palette_slots, attachment_sockets,
  render_cost, progression, functional, route_endpoint
) values
  ('core-fireplace', 'home-catalog-v1', 'fireplace', 'Fireplace', '{"width":2.00,"depth":1.10,"height":2.80}', '{living}', '{floor}', 0.10, '{wood,stone,metal}', '{mantel-left,mantel-center,mantel-right}', 18, '{"day":0,"tier":1}', '{"role":"fireplace","signals":["fireplace"],"poses":["floor-left","floor-right"],"approach":[[-2.55,-1.95],[-1.55,-1.95]],"exit":[[-2.55,-1.95],[-1.55,-1.95]],"cameraTarget":[-2.6,1.2,-3.6],"reactionAnchor":[1.0,2.3,0.6],"uiAnchor":[1.0,2.9,0.4],"clickBounds":{"width":2.5,"depth":1.5,"height":3.0},"effectSockets":["fire","mantel","floor-glow"]}', true),
  ('cottage-sofa', 'home-catalog-v1', 'seating', 'Sofa', '{"width":2.20,"depth":0.90,"height":1.15}', '{living,bedroom}', '{floor}', 0.10, '{wood,fabric}', '{seat-left,seat-right}', 10, '{"day":0}', '{"role":"conversation_seating","signals":["sofa"],"poses":["sit-left","sit-right"],"approach":[[0.65,1.67],[1.55,1.67]],"exit":[[0.65,1.67],[1.55,1.67]],"cameraTarget":[1.1,0.8,0.6],"reactionAnchor":[1.1,1.8,0.5],"uiAnchor":[1.1,2.1,0.5],"clickBounds":{"width":2.8,"depth":1.4,"height":1.5},"effectSockets":["seat-left","seat-right","center"]}', true),
  ('shared-table', 'home-catalog-v1', 'surface', 'TableSet', '{"width":2.10,"depth":1.80,"height":1.10}', '{living,garden}', '{floor}', 0.15, '{wood,fabric,metal}', '{table-north,table-south,table-east,table-west}', 14, '{"day":0}', '{"role":"shared_table","signals":["table"],"poses":["sit-near","sit-far"],"approach":[[1.55,1.70],[1.55,-0.75]],"exit":[[1.55,1.70],[1.55,-0.75]],"cameraTarget":[0.6,0.7,0.5],"reactionAnchor":[0.6,1.7,0.5],"uiAnchor":[0.6,2.0,0.5],"clickBounds":{"width":2.4,"depth":3.2,"height":1.4},"effectSockets":["table-center","chair-near","chair-far"]}', true),
  ('rest-nook', 'home-catalog-v1', 'rest', 'RestNook', '{"width":1.60,"depth":0.90,"height":1.20}', '{living,bedroom,garden}', '{floor}', 0.10, '{wood,fabric}', '{cushion}', 9, '{"day":0}', '{"role":"rest_location","signals":["rest"],"poses":["rest-left","rest-right"],"approach":[[0.28,-0.45],[1.12,-0.45]],"exit":[[0.28,-0.45],[1.12,-0.45]],"cameraTarget":[0.7,0.7,0.3],"reactionAnchor":[0.7,1.5,0.3],"uiAnchor":[0.7,1.9,0.3],"clickBounds":{"width":1.7,"depth":1.1,"height":1.4},"effectSockets":["cushion","left","right"]}', true),
  ('romantic-daybed', 'home-catalog-v1', 'bed', 'Bed', '{"width":1.30,"depth":1.65,"height":1.30}', '{living,bedroom}', '{floor}', 0.15, '{wood,fabric}', '{bed-left,bed-right,headboard}', 13, '{"day":0,"fallback":true}', '{"role":"romantic_rest_location","signals":["romantic"],"poses":["lie-left","lie-right"],"approach":[[0.28,2.70],[1.46,2.70]],"exit":[[0.28,2.70],[1.46,2.70]],"cameraTarget":[0.88,1.0,1.1],"reactionAnchor":[0.88,1.9,1.1],"uiAnchor":[0.88,2.2,1.1],"clickBounds":{"width":1.9,"depth":2.4,"height":1.5},"effectSockets":["bed-left","bed-right","heart"]}', true),
  ('drawing-easel', 'home-catalog-v1', 'portal', 'Easel', '{"width":0.75,"depth":0.75,"height":1.60}', '{living,bedroom}', '{floor}', 0.05, '{wood,metal}', '{}', 8, '{"day":0}', '{"role":"drawing_portal","route":"/draw"}', true),
  ('daily-media-console', 'home-catalog-v1', 'portal', 'DailyMediaConsole', '{"width":0.65,"depth":0.55,"height":1.10}', '{living,bedroom}', '{floor,table,shelf}', 0.05, '{wood,metal,fabric}', '{}', 6, '{"day":0}', '{"role":"media_portal","route":"/daily"}', true),
  ('garden-threshold', 'home-catalog-v1', 'portal', 'GardenThreshold', '{"width":0.60,"depth":0.40,"height":2.40}', '{living,garden}', '{floor,terrain}', 0.00, '{wood,foliage,flower}', '{}', 6, '{"day":0}', '{"role":"garden_portal","signals":["garden"]}', true),
  ('cottage-bookshelf', 'home-catalog-v1', 'storage', 'Bookshelf', '{"width":0.70,"depth":0.55,"height":1.90}', '{living,bedroom}', '{floor}', 0.05, '{wood,metal}', '{shelf-1,shelf-2,shelf-3}', 8, '{"day":14}', '{}', false),
  ('potted-fern', 'home-catalog-v1', 'plant', 'Plant', '{"width":0.55,"depth":0.55,"height":1.20}', '{living,bedroom,garden}', '{floor,table,shelf}', 0.05, '{foliage,flower,stone}', '{}', 4, '{"day":3}', '{}', false),
  ('bedside-table', 'home-catalog-v1', 'surface', 'BedsideTable', '{"width":0.75,"depth":0.65,"height":0.90}', '{bedroom,living}', '{floor}', 0.05, '{wood,metal}', '{tabletop}', 5, '{"day":21}', '{}', false),
  ('paneled-wardrobe', 'home-catalog-v1', 'storage', 'Wardrobe', '{"width":1.25,"depth":0.80,"height":2.35}', '{bedroom,living}', '{floor}', 0.10, '{wood,metal}', '{}', 9, '{"day":21}', '{}', false),
  ('koi-pond-medium', 'home-catalog-v1', 'water', 'KoiPond', '{"width":3.60,"depth":2.40,"height":0.45}', '{garden}', '{terrain}', 0.25, '{stone,foliage,water}', '{pond-edge-north,pond-edge-south}', 28, '{"day":90,"major_water":true}', '{"interactionRig":"pond-edge","poses":["edge-left","edge-right"],"approach":[[0.7,-0.55],[2.8,-0.55]],"exit":[[0.7,-0.55],[2.8,-0.55]],"cameraTarget":[1.8,0.4,1.2],"reactionAnchor":[1.8,1.4,1.2],"uiAnchor":[1.8,1.8,1.2],"clickBounds":{"width":3.8,"depth":2.6,"height":0.8},"effectSockets":["water","fish","pond-edge-north","pond-edge-south"]}', true),
  ('blossom-tree', 'home-catalog-v1', 'tree', 'BlossomTree', '{"width":1.10,"depth":1.10,"height":4.25,"canopy":4.00}', '{garden}', '{terrain}', 0.65, '{wood,foliage,flower}', '{}', 20, '{"day":180,"large_tree":true}', '{}', false),
  ('rose-bush', 'home-catalog-v1', 'plant', 'RoseBush', '{"width":0.85,"depth":0.75,"height":0.70}', '{garden}', '{terrain}', 0.08, '{foliage,flower}', '{}', 4, '{"day":30}', '{}', false),
  ('garden-lantern', 'home-catalog-v1', 'lighting', 'GardenLantern', '{"width":0.55,"depth":0.55,"height":1.45}', '{garden}', '{terrain}', 0.05, '{wood,metal}', '{}', 5, '{"day":30}', '{}', false),
  ('garden-bench', 'home-catalog-v1', 'seating', 'Bench', '{"width":1.70,"depth":0.75,"height":1.10}', '{garden}', '{terrain}', 0.12, '{wood,metal,fabric}', '{seat-left,seat-right}', 8, '{"day":30}', '{"interactionRig":"garden-couple","poses":["sit-left","sit-right"],"approach":[[1.15,0.33],[1.15,1.17]],"exit":[[1.15,0.33],[1.15,1.17]],"cameraTarget":[0.4,0.8,0.75],"reactionAnchor":[0.4,1.7,0.75],"uiAnchor":[0.4,2.0,0.75],"clickBounds":{"width":1.0,"depth":1.7,"height":1.3},"effectSockets":["seat-left","seat-right","center"]}', true),
  ('greenhouse-portal', 'home-catalog-v1', 'structure', 'GardenGreenhousePortal', '{"width":1.35,"depth":1.05,"height":1.55}', '{garden}', '{terrain}', 0.10, '{wood,metal,foliage}', '{}', 12, '{"day":30}', '{"role":"greenhouse_portal","route":"/greenhouse"}', true)
on conflict (id) do update set
  revision = excluded.revision,
  catalog_version = excluded.catalog_version,
  category = excluded.category,
  renderer = excluded.renderer,
  footprint = excluded.footprint,
  rotations = excluded.rotations,
  compatible_rooms = excluded.compatible_rooms,
  compatible_surfaces = excluded.compatible_surfaces,
  collision_clearance = excluded.collision_clearance,
  palette_slots = excluded.palette_slots,
  attachment_sockets = excluded.attachment_sockets,
  render_cost = excluded.render_cost,
  progression = excluded.progression,
  functional = excluded.functional,
  route_endpoint = excluded.route_endpoint;

create or replace function private.seed_home_object(
  p_couple_id uuid,
  p_room_socket text,
  p_seed_key text,
  p_asset_id text,
  p_x numeric,
  p_z numeric,
  p_rotation smallint default 0
) returns void language plpgsql security definer
set search_path = pg_catalog, public, private as $$
begin
  insert into public.home_objects (
    couple_id, room_id, seed_key, asset_id, position_x, position_z, rotation,
    surface
  )
  select p_couple_id, r.id, p_seed_key, p_asset_id, p_x, p_z, p_rotation,
    case when r.module_id = 'garden' then 'terrain' else 'floor' end
  from public.home_rooms r
  where r.couple_id = p_couple_id and r.socket_id = p_room_socket
  on conflict (couple_id, seed_key) do nothing;
end;
$$;

create or replace function private.ensure_home_state(
  p_couple_id uuid,
  p_legacy_full boolean default false
) returns void language plpgsql security definer
set search_path = pg_catalog, public, private as $$
declare
  paired boolean;
  living_id uuid;
  garden_id uuid;
begin
  select member_b is not null into paired
  from public.couples where id = p_couple_id for share;
  if not coalesce(paired, false) then return; end if;

  insert into public.home_states (
    couple_id, garden_tier, growth_resumed_at
  ) values (
    p_couple_id, case when p_legacy_full then 'large' else 'courtyard' end, now()
  ) on conflict (couple_id) do nothing;

  if not found then return; end if;

  insert into public.home_rooms (couple_id, module_id, socket_id, size_tier, bounds)
  values (
    p_couple_id, 'living', 'hub',
    case when p_legacy_full then 'standard' else 'compact' end,
    case when p_legacy_full
      then '{"minX":-4.75,"maxX":5.25,"minZ":-4.50,"maxZ":4.25}'::jsonb
      else '{"minX":-4.75,"maxX":4.25,"minZ":-4.50,"maxZ":3.75}'::jsonb
    end
  ) returning id into living_id;

  insert into public.home_rooms (couple_id, module_id, socket_id, size_tier, bounds)
  values (
    p_couple_id, 'garden', 'garden-west',
    case when p_legacy_full then 'large' else 'compact' end,
    case when p_legacy_full
      then '{"minX":-15.75,"maxX":-4.00,"minZ":-3.75,"maxZ":7.75}'::jsonb
      else '{"minX":-8.75,"maxX":-4.00,"minZ":0.00,"maxZ":5.00}'::jsonb
    end
  ) returning id into garden_id;

  if p_legacy_full then
    insert into public.home_rooms (couple_id, module_id, socket_id, size_tier, bounds)
    values (p_couple_id, 'bedroom', 'bedroom-north', 'standard',
      '{"minX":1.75,"maxX":7.00,"minZ":-9.75,"maxZ":-4.25}'::jsonb);
  end if;

  -- Permanent clear strips protect authored doorway connections and the route
  -- from the garden threshold to the greenhouse.
  insert into public.home_reserved_routes
    (couple_id, room_id, route_key, min_x, max_x, min_z, max_z)
  values
    (p_couple_id, living_id, 'living-garden-door', -4.75, -3.70, 1.90, 2.45),
    (p_couple_id, living_id, 'living-bedroom-door', 4.55, 5.05, -4.50, 2.45),
    (p_couple_id, garden_id, 'garden-entry', -7.85, -4.25, 2.15, 2.85)
  on conflict (couple_id, route_key) do nothing;

  perform private.seed_home_object(p_couple_id, 'hub', 'fireplace', 'core-fireplace', -3.20, -3.85);
  perform private.seed_home_object(p_couple_id, 'hub', 'sofa', 'cottage-sofa', -0.40, -3.95);
  perform private.seed_home_object(p_couple_id, 'hub', 'table', 'shared-table', -0.35, 0.50);
  perform private.seed_home_object(p_couple_id, 'hub', 'rest', 'rest-nook', -3.15, 3.20);
  perform private.seed_home_object(p_couple_id, 'hub', 'easel', 'drawing-easel', -4.28, 1.08, 1);
  perform private.seed_home_object(p_couple_id, 'hub', 'media', 'daily-media-console', 3.55, 2.95);
  perform private.seed_home_object(p_couple_id, 'garden-west', 'garden-threshold', 'garden-threshold', -4.45, 2.50);

  if p_legacy_full then
    insert into public.home_reserved_routes
      (couple_id, room_id, route_key, min_x, max_x, min_z, max_z)
    values
      (p_couple_id, garden_id, 'garden-greenhouse-turn', -8.25, -7.75, 0.25, 2.50),
      (p_couple_id, garden_id, 'garden-greenhouse-approach', -13.75, -8.00, -0.10, 0.60),
      (p_couple_id, garden_id, 'garden-bench-approach', -13.10, -12.50, 0.25, 3.60),
      (p_couple_id, garden_id, 'garden-pond-approach', -9.30, -8.00, 2.40, 3.35)
    on conflict (couple_id, route_key) do nothing;

    perform private.seed_home_object(p_couple_id, 'hub', 'bookshelf', 'cottage-bookshelf', -4.18, -2.35);
    perform private.seed_home_object(p_couple_id, 'hub', 'fern', 'potted-fern', 4.15, 0.70);
    perform private.seed_home_object(p_couple_id, 'bedroom-north', 'bed', 'romantic-daybed', 3.625, -8.75);
    perform private.seed_home_object(p_couple_id, 'bedroom-north', 'bedside', 'bedside-table', 2.45, -8.50);
    perform private.seed_home_object(p_couple_id, 'bedroom-north', 'wardrobe', 'paneled-wardrobe', 5.70, -8.75);
    perform private.seed_home_object(p_couple_id, 'garden-west', 'pond', 'koi-pond-medium', -9.20, 4.55);
    perform private.seed_home_object(p_couple_id, 'garden-west', 'tree', 'blossom-tree', -14.50, -2.70);
    perform private.seed_home_object(p_couple_id, 'garden-west', 'rose-west', 'rose-bush', -14.70, 5.20);
    perform private.seed_home_object(p_couple_id, 'garden-west', 'rose-east', 'rose-bush', -5.80, -2.20, 1);
    perform private.seed_home_object(p_couple_id, 'garden-west', 'lantern-west', 'garden-lantern', -10.70, 1.70);
    perform private.seed_home_object(p_couple_id, 'garden-west', 'lantern-east', 'garden-lantern', -7.00, 1.80);
    perform private.seed_home_object(p_couple_id, 'garden-west', 'bench', 'garden-bench', -12.80, 3.60);
    perform private.seed_home_object(p_couple_id, 'garden-west', 'greenhouse', 'greenhouse-portal', -13.75, 0.25);
  else
    -- The compact daybed is the day-zero romantic signal fallback.
    perform private.seed_home_object(p_couple_id, 'hub', 'bed', 'romantic-daybed', 2.75, -1.60, 1);
  end if;
end;
$$;

-- Seed all homes that were already paired when this migration landed. The
-- inserts are idempotent and retain every independently visible 1.0.4 piece.
do $$ declare home record; begin
  for home in select id from public.couples where member_b is not null order by id
  loop perform private.ensure_home_state(home.id, true); end loop;
end $$;

create or replace function private.home_has_active_moment(p_couple_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.moment_sessions
    where couple_id = p_couple_id and terminal_at is null
  );
$$;

create or replace function private.home_capabilities(p_couple_id uuid)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public, private as $$
  select jsonb_build_object(
    'view', true,
    'useCoreSignals', true,
    'mutateHistoryMedia', hs.world_frozen_at is null,
    'edit', hs.world_frozen_at is null and not private.home_has_active_moment(p_couple_id),
    'expand', hs.world_frozen_at is null and not private.home_has_active_moment(p_couple_id),
    'earnUnlocks', hs.world_frozen_at is null,
    'blockedByMoment', private.home_has_active_moment(p_couple_id),
    'frozen', hs.world_frozen_at is not null
  )
  from public.home_states hs where hs.couple_id = p_couple_id;
$$;

create or replace function private.home_snapshot(p_couple_id uuid)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public, private as $$
  select jsonb_build_object(
    'schemaVersion', hs.schema_version,
    'layoutId', hs.layout_id,
    'catalogVersion', hs.catalog_version,
    'revision', hs.revision,
    'pairedAt', c.paired_at,
    'gardenTier', hs.garden_tier,
    'finishes', hs.finishes,
    'rooms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'moduleId', r.module_id, 'socketId', r.socket_id,
        'sizeTier', r.size_tier, 'bounds', r.bounds, 'finish', r.finish
      ) order by r.socket_id)
      from public.home_rooms r where r.couple_id = hs.couple_id
    ), '[]'::jsonb),
    'reservedRoutes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', rr.id, 'roomId', rr.room_id, 'key', rr.route_key,
        'minX', rr.min_x, 'maxX', rr.max_x, 'minZ', rr.min_z, 'maxZ', rr.max_z
      ) order by rr.route_key)
      from public.home_reserved_routes rr where rr.couple_id = hs.couple_id
    ), '[]'::jsonb),
    'objects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'roomId', o.room_id, 'assetId', o.asset_id,
        'assetRevision', o.asset_revision, 'placementState', o.placement_state,
        'surface', o.surface,
        'position', jsonb_build_array(o.position_x, o.position_y, o.position_z),
        'rotation', o.rotation, 'style', o.style,
        'parentObjectId', o.parent_object_id, 'attachmentSocket', o.attachment_socket,
        'renderer', coalesce(a.renderer, 'UnknownHomeAsset'),
        'retired', a.retired_at is not null,
        'unknown', a.id is null
      ) order by o.created_at, o.id)
      from public.home_objects o
      left join public.home_catalog_assets a on a.id = o.asset_id
      where o.couple_id = hs.couple_id
    ), '[]'::jsonb),
    'keepsakes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', k.id, 'sourceKind', k.source_kind, 'sourceId', k.source_id,
        'assetId', k.asset_id, 'objectId', k.object_id,
        'metadata', k.metadata, 'mintedAt', k.minted_at
      ) order by k.minted_at, k.id)
      from public.home_keepsakes k where k.couple_id = hs.couple_id
    ), '[]'::jsonb),
    'unlocks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', u.unlock_id, 'source', u.source, 'unlockedAt', u.unlocked_at
      ) order by u.unlocked_at, u.unlock_id)
      from public.home_unlocks u where u.couple_id = hs.couple_id
    ), '[]'::jsonb),
    'capabilities', private.home_capabilities(hs.couple_id)
  )
  from public.home_states hs
  join public.couples c on c.id = hs.couple_id
  where hs.couple_id = p_couple_id;
$$;

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
  return private.home_snapshot(home.id) || jsonb_build_object('paired', true);
end;
$$;

create or replace function private.authored_home_bounds(
  p_module text,
  p_size text,
  p_garden_tier text default null
) returns jsonb language sql immutable security definer
set search_path = pg_catalog as $$
  select case
    when p_module = 'living' and p_size = 'compact' then '{"minX":-4.75,"maxX":4.25,"minZ":-4.50,"maxZ":3.75}'::jsonb
    when p_module = 'living' and p_size = 'standard' then '{"minX":-4.75,"maxX":5.25,"minZ":-4.50,"maxZ":4.25}'::jsonb
    when p_module = 'living' and p_size = 'large' then '{"minX":-5.75,"maxX":6.25,"minZ":-5.50,"maxZ":5.25}'::jsonb
    when p_module = 'bedroom' and p_size = 'compact' then '{"minX":2.25,"maxX":6.50,"minZ":-9.25,"maxZ":-4.25}'::jsonb
    when p_module = 'bedroom' and p_size = 'standard' then '{"minX":1.75,"maxX":7.00,"minZ":-9.75,"maxZ":-4.25}'::jsonb
    when p_module = 'bedroom' and p_size = 'large' then '{"minX":1.25,"maxX":7.75,"minZ":-10.75,"maxZ":-4.25}'::jsonb
    when p_module = 'future-room' and p_size = 'compact' then '{"minX":5.00,"maxX":9.00,"minZ":-1.50,"maxZ":2.50}'::jsonb
    when p_module = 'future-room' and p_size = 'standard' then '{"minX":5.00,"maxX":10.00,"minZ":-2.50,"maxZ":3.50}'::jsonb
    when p_module = 'future-room' and p_size = 'large' then '{"minX":5.00,"maxX":11.00,"minZ":-3.50,"maxZ":4.50}'::jsonb
    when p_module = 'garden' and p_garden_tier = 'courtyard' and p_size = 'compact' then '{"minX":-8.75,"maxX":-4.00,"minZ":0.00,"maxZ":5.00}'::jsonb
    when p_module = 'garden' and p_garden_tier = 'standard' and p_size = 'standard' then '{"minX":-11.75,"maxX":-4.00,"minZ":-2.00,"maxZ":6.00}'::jsonb
    when p_module = 'garden' and p_garden_tier = 'large' and p_size = 'large' then '{"minX":-15.75,"maxX":-4.00,"minZ":-3.75,"maxZ":7.75}'::jsonb
    when p_module = 'garden' and p_garden_tier = 'grand' and p_size = 'large' then '{"minX":-18.75,"maxX":-4.00,"minZ":-5.75,"maxZ":9.75}'::jsonb
    else null
  end;
$$;

create or replace function private.validate_home_scene(p_couple_id uuid)
returns void language plpgsql stable security definer
set search_path = pg_catalog, public, private as $$
declare
  missing_role text;
  scene_cost integer;
  tier text;
  water_count integer;
begin
  -- Unknown/retired assets remain renderable from old snapshots, but a newly
  -- saved scene cannot make an unresolved component part of the active layout.
  if exists (
    select 1 from public.home_objects o
    left join public.home_catalog_assets a on a.id = o.asset_id
    where o.couple_id = p_couple_id and o.placement_state = 'placed'
      and (a.id is null or a.retired_at is not null)
  ) then raise exception 'Placeholders must be moved to Needs a new spot before saving'; end if;

  select sum(a.render_cost) into scene_cost
  from public.home_objects o join public.home_catalog_assets a on a.id = o.asset_id
  where o.couple_id = p_couple_id and o.placement_state = 'placed';
  if coalesce(scene_cost, 0) > 480 then raise exception 'Home scene exceeds the render budget'; end if;

  select required.role into missing_role from (
    values ('fireplace'), ('conversation_seating'), ('shared_table'),
      ('rest_location'), ('romantic_rest_location'), ('drawing_portal'),
      ('media_portal'), ('garden_portal')
  ) as required(role)
  where not exists (
    select 1 from public.home_objects o
    join public.home_catalog_assets a on a.id = o.asset_id
    where o.couple_id = p_couple_id and o.placement_state = 'placed'
      and a.functional ->> 'role' = required.role
  ) limit 1;
  if missing_role is not null then
    raise exception 'Required home role is missing: %', missing_role;
  end if;

  -- Every placed object must fit its authored room mask and use an allowed
  -- room/surface/rotation combination.
  if exists (
    select 1 from public.home_objects o
    join public.home_rooms r on r.id = o.room_id and r.couple_id = o.couple_id
    join public.home_catalog_assets a on a.id = o.asset_id
    cross join lateral (
      select case when o.rotation % 2 = 0
        then (a.footprint ->> 'width')::numeric
        else (a.footprint ->> 'depth')::numeric end as width,
      case when o.rotation % 2 = 0
        then (a.footprint ->> 'depth')::numeric
        else (a.footprint ->> 'width')::numeric end as depth
    ) size
    where o.couple_id = p_couple_id and o.placement_state = 'placed' and (
      not (r.module_id = any(a.compatible_rooms))
      or not (o.surface = any(a.compatible_surfaces))
      or not (o.rotation = any(a.rotations))
      or o.position_x - size.width / 2 < (r.bounds ->> 'minX')::numeric
      or o.position_x + size.width / 2 > (r.bounds ->> 'maxX')::numeric
      or o.position_z - size.depth / 2 < (r.bounds ->> 'minZ')::numeric
      or o.position_z + size.depth / 2 > (r.bounds ->> 'maxZ')::numeric
    )
  ) then raise exception 'An object is outside its compatible room or surface'; end if;

  -- Axis-aligned clearance is deterministic for the four supported rotations.
  if exists (
    select 1
    from public.home_objects a_obj
    join public.home_catalog_assets a on a.id = a_obj.asset_id
    join public.home_objects b_obj on b_obj.couple_id = a_obj.couple_id
      and b_obj.room_id = a_obj.room_id and b_obj.id > a_obj.id
      and b_obj.placement_state = 'placed'
    join public.home_catalog_assets b on b.id = b_obj.asset_id
    where a_obj.couple_id = p_couple_id and a_obj.placement_state = 'placed'
      and a_obj.parent_object_id is null and b_obj.parent_object_id is null
      and abs(a_obj.position_x - b_obj.position_x) < (
        (case when a_obj.rotation % 2 = 0 then (a.footprint->>'width')::numeric else (a.footprint->>'depth')::numeric end
        + case when b_obj.rotation % 2 = 0 then (b.footprint->>'width')::numeric else (b.footprint->>'depth')::numeric end) / 2
        + greatest(a.collision_clearance, b.collision_clearance)
      )
      and abs(a_obj.position_z - b_obj.position_z) < (
        (case when a_obj.rotation % 2 = 0 then (a.footprint->>'depth')::numeric else (a.footprint->>'width')::numeric end
        + case when b_obj.rotation % 2 = 0 then (b.footprint->>'depth')::numeric else (b.footprint->>'width')::numeric end) / 2
        + greatest(a.collision_clearance, b.collision_clearance)
      )
  ) then raise exception 'Objects overlap or do not have enough clearance'; end if;

  if exists (
    select 1 from public.home_objects o
    join public.home_catalog_assets a on a.id = o.asset_id
    join public.home_reserved_routes rr on rr.couple_id = o.couple_id and rr.room_id = o.room_id
    where o.couple_id = p_couple_id and o.placement_state = 'placed'
      and not a.route_endpoint
      and o.position_x + (case when o.rotation % 2 = 0 then (a.footprint->>'width')::numeric else (a.footprint->>'depth')::numeric end) / 2 > rr.min_x
      and o.position_x - (case when o.rotation % 2 = 0 then (a.footprint->>'width')::numeric else (a.footprint->>'depth')::numeric end) / 2 < rr.max_x
      and o.position_z + (case when o.rotation % 2 = 0 then (a.footprint->>'depth')::numeric else (a.footprint->>'width')::numeric end) / 2 > rr.min_z
      and o.position_z - (case when o.rotation % 2 = 0 then (a.footprint->>'depth')::numeric else (a.footprint->>'width')::numeric end) / 2 < rr.max_z
  ) then raise exception 'An object blocks a protected travel route'; end if;

  if exists (
    select 1 from public.home_objects child
    join public.home_objects parent on parent.id = child.parent_object_id
    join public.home_catalog_assets asset on asset.id = parent.asset_id
    where child.couple_id = p_couple_id and (
      parent.couple_id <> child.couple_id
      or not (child.attachment_socket = any(asset.attachment_sockets))
    )
  ) then raise exception 'An attachment does not match its parent socket'; end if;

  select garden_tier into tier from public.home_states where couple_id = p_couple_id;
  select count(*) into water_count
  from public.home_objects o join public.home_catalog_assets a on a.id = o.asset_id
  where o.couple_id = p_couple_id and o.placement_state = 'placed'
    and a.category = 'water' and coalesce((a.progression ->> 'major_water')::boolean, false);
  if water_count > case when tier = 'grand' then 2 when tier in ('standard', 'large') then 1 else 0 end
  then raise exception 'This garden tier has no free major water-feature socket'; end if;
end;
$$;

create or replace function public.apply_home_edit(
  request_id uuid,
  expected_revision bigint,
  catalog_version text,
  operations jsonb
) returns jsonb language plpgsql volatile security definer
set search_path = pg_catalog, public, private as $$
declare
  uid uuid := auth.uid();
  home public.couples;
  state public.home_states;
  op jsonb;
  action text;
  object_uuid uuid;
  parent_uuid uuid;
  room_uuid uuid;
  asset public.home_catalog_assets;
  existing public.home_edit_requests;
  request_hash text;
  result jsonb;
  affected integer;
  room_module text;
  authored_bounds jsonb;
  requested_garden_tier text;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if request_id is null then raise exception 'request_id is required'; end if;
  if jsonb_typeof(operations) <> 'array' or jsonb_array_length(operations) > 256
  then raise exception 'operations must be an array of at most 256 commands'; end if;

  select * into home from public.couples
  where member_a = uid or member_b = uid order by created_at limit 1 for update;
  if home.id is null or home.member_b is null then
    raise exception 'A paired home is required' using errcode = '42501';
  end if;
  perform private.ensure_home_state(home.id, false);
  select * into state from public.home_states where couple_id = home.id for update;

  request_hash := md5(catalog_version || ':' || operations::text);
  select * into existing from public.home_edit_requests
  where couple_id = home.id and home_edit_requests.request_id = apply_home_edit.request_id;
  if existing.request_id is not null then
    if existing.operations_hash <> request_hash then
      raise exception 'request_id was already used for different operations';
    end if;
    return existing.response;
  end if;

  if state.catalog_version <> catalog_version then
    return jsonb_build_object('ok', false, 'code', 'catalog_version_mismatch',
      'catalogVersion', state.catalog_version, 'currentRevision', state.revision);
  end if;
  if state.revision <> expected_revision then
    return jsonb_build_object('ok', false, 'code', 'revision_conflict',
      'currentRevision', state.revision, 'snapshot', private.home_snapshot(home.id));
  end if;
  if state.world_frozen_at is not null then raise exception 'This shared world is frozen'; end if;
  if private.home_has_active_moment(home.id) then raise exception 'Finish the active Moment before editing the home'; end if;

  for op in select value from jsonb_array_elements(operations)
  loop
    action := op ->> 'type';
    if action = 'add' then
      select * into asset from public.home_catalog_assets
      where id = op ->> 'assetId' and retired_at is null;
      if asset.id is null then raise exception 'Unknown home asset: %', op ->> 'assetId'; end if;
      room_uuid := (op ->> 'roomId')::uuid;
      if not exists (select 1 from public.home_rooms where id = room_uuid and couple_id = home.id)
      then raise exception 'Room is not part of this home'; end if;
      insert into public.home_objects (
        id, couple_id, room_id, asset_id, asset_revision, placement_state, surface,
        position_x, position_y, position_z, rotation, style
      ) values (
        coalesce((op ->> 'objectId')::uuid, gen_random_uuid()), home.id, room_uuid,
        asset.id, asset.revision, 'placed', coalesce(op ->> 'surface', 'floor'),
        coalesce((op #>> '{position,0}')::numeric, 0),
        coalesce((op #>> '{position,1}')::numeric, 0),
        coalesce((op #>> '{position,2}')::numeric, 0),
        coalesce((op ->> 'rotation')::smallint, 0), coalesce(op -> 'style', '{}'::jsonb)
      );
    elsif action = 'move' then
      object_uuid := (op ->> 'objectId')::uuid;
      room_uuid := coalesce((op ->> 'roomId')::uuid,
        (select room_id from public.home_objects where id = object_uuid and couple_id = home.id));
      update public.home_objects set
        room_id = room_uuid, placement_state = 'placed',
        surface = coalesce(op ->> 'surface', surface),
        position_x = coalesce((op #>> '{position,0}')::numeric, position_x),
        position_y = coalesce((op #>> '{position,1}')::numeric, position_y),
        position_z = coalesce((op #>> '{position,2}')::numeric, position_z),
        updated_at = now()
      where id = object_uuid and couple_id = home.id;
      get diagnostics affected = row_count;
      if affected = 0 then raise exception 'Object is not part of this home'; end if;
    elsif action = 'rotate' then
      object_uuid := (op ->> 'objectId')::uuid;
      update public.home_objects set rotation = (op ->> 'rotation')::smallint, updated_at = now()
      where id = object_uuid and couple_id = home.id;
      get diagnostics affected = row_count;
      if affected = 0 then raise exception 'Object is not part of this home'; end if;
    elsif action = 'restyle' then
      object_uuid := (op ->> 'objectId')::uuid;
      if jsonb_typeof(op -> 'style') <> 'object' then raise exception 'style must be an object'; end if;
      update public.home_objects set style = style || (op -> 'style'), updated_at = now()
      where id = object_uuid and couple_id = home.id;
      get diagnostics affected = row_count;
      if affected = 0 then raise exception 'Object is not part of this home'; end if;
    elsif action = 'attach' then
      object_uuid := (op ->> 'objectId')::uuid;
      parent_uuid := (op ->> 'parentObjectId')::uuid;
      if not exists (select 1 from public.home_objects where id = parent_uuid and couple_id = home.id)
      then raise exception 'Attachment parent is not part of this home'; end if;
      update public.home_objects set parent_object_id = parent_uuid,
        attachment_socket = op ->> 'socket', updated_at = now()
      where id = object_uuid and couple_id = home.id and id <> parent_uuid;
      get diagnostics affected = row_count;
      if affected = 0 then raise exception 'Attachment object is invalid'; end if;
    elsif action = 'store' then
      object_uuid := (op ->> 'objectId')::uuid;
      with recursive family as (
        select id from public.home_objects where id = object_uuid and couple_id = home.id
        union all
        select child.id from public.home_objects child join family parent
          on child.parent_object_id = parent.id where child.couple_id = home.id
      )
      update public.home_objects set placement_state = 'stored', room_id = null, updated_at = now()
      where id in (select id from family);
      get diagnostics affected = row_count;
      if affected = 0 then raise exception 'Object is not part of this home'; end if;
    elsif action = 'replace' then
      object_uuid := (op ->> 'objectId')::uuid;
      select * into asset from public.home_catalog_assets
      where id = op ->> 'assetId' and retired_at is null;
      if asset.id is null then raise exception 'Unknown replacement asset'; end if;
      update public.home_objects set asset_id = asset.id, asset_revision = asset.revision,
        style = coalesce(op -> 'style', '{}'::jsonb), updated_at = now()
      where id = object_uuid and couple_id = home.id;
      get diagnostics affected = row_count;
      if affected = 0 then raise exception 'Object is not part of this home'; end if;
    elsif action = 'resize' then
      room_uuid := (op ->> 'roomId')::uuid;
      select module_id into room_module from public.home_rooms
      where id = room_uuid and couple_id = home.id;
      if room_module is null then raise exception 'Room is not part of this home'; end if;
      requested_garden_tier := op ->> 'gardenTier';
      authored_bounds := private.authored_home_bounds(
        room_module, op ->> 'sizeTier', requested_garden_tier
      );
      if authored_bounds is null or op -> 'bounds' is distinct from authored_bounds then
        raise exception 'Room resize must use an authored cottage-v2 mask';
      end if;
      update public.home_rooms set size_tier = op ->> 'sizeTier',
        bounds = authored_bounds, updated_at = now()
      where id = room_uuid and couple_id = home.id
        and op ->> 'sizeTier' in ('compact', 'standard', 'large')
        and jsonb_typeof(op -> 'bounds') = 'object';
      get diagnostics affected = row_count;
      if affected = 0 then raise exception 'Room resize request is invalid'; end if;
      if room_module = 'garden' then
        update public.home_states set garden_tier = requested_garden_tier, updated_at = now()
        where couple_id = home.id;
      end if;
      -- Objects outside the smaller authored mask are preserved for relocation.
      update public.home_objects o set placement_state = 'needs_spot', updated_at = now()
      from public.home_catalog_assets a, public.home_rooms r
      where o.couple_id = home.id and o.room_id = room_uuid and o.placement_state = 'placed'
        and a.id = o.asset_id and r.id = room_uuid
        and (
          o.position_x - (case when o.rotation % 2 = 0
            then (a.footprint ->> 'width')::numeric else (a.footprint ->> 'depth')::numeric end) / 2
            < (r.bounds ->> 'minX')::numeric
          or o.position_x + (case when o.rotation % 2 = 0
            then (a.footprint ->> 'width')::numeric else (a.footprint ->> 'depth')::numeric end) / 2
            > (r.bounds ->> 'maxX')::numeric
          or o.position_z - (case when o.rotation % 2 = 0
            then (a.footprint ->> 'depth')::numeric else (a.footprint ->> 'width')::numeric end) / 2
            < (r.bounds ->> 'minZ')::numeric
          or o.position_z + (case when o.rotation % 2 = 0
            then (a.footprint ->> 'depth')::numeric else (a.footprint ->> 'width')::numeric end) / 2
            > (r.bounds ->> 'maxZ')::numeric
        );
    elsif action in ('change_terrain', 'change_finish') then
      update public.home_states set finishes = finishes || jsonb_build_object(
        coalesce(op ->> 'target', case when action = 'change_terrain' then 'terrain' else 'home' end),
        op -> 'value'
      ), updated_at = now() where couple_id = home.id;
    elsif action = 'attach_module' then
      if (op ->> 'moduleId', op ->> 'socketId') not in (
        ('bedroom', 'bedroom-north'), ('future-room', 'future-east')
      )
      then raise exception 'Module does not match an authored cottage-v2 socket'; end if;
      authored_bounds := private.authored_home_bounds(
        op ->> 'moduleId', op ->> 'sizeTier', null
      );
      if authored_bounds is null or op -> 'bounds' is distinct from authored_bounds then
        raise exception 'Module must use an authored cottage-v2 mask';
      end if;
      insert into public.home_rooms (id, couple_id, module_id, socket_id, size_tier, bounds)
      values ((op ->> 'roomId')::uuid, home.id, op ->> 'moduleId', op ->> 'socketId',
        op ->> 'sizeTier', authored_bounds);
    else
      raise exception 'Unsupported home operation: %', coalesce(action, '<missing>');
    end if;
  end loop;

  perform private.validate_home_scene(home.id);
  update public.home_states set revision = revision + 1, updated_at = now()
  where couple_id = home.id returning * into state;
  result := jsonb_build_object('ok', true, 'revision', state.revision,
    'snapshot', private.home_snapshot(home.id));
  insert into public.home_edit_requests (
    couple_id, request_id, actor_id, expected_revision, result_revision,
    operations_hash, response
  ) values (home.id, request_id, uid, expected_revision, state.revision, request_hash, result);
  return result;
end;
$$;

-- Pairing completion owns the growth clock. A membership epoch change purges
-- the shared home before the surviving couple row can be reused.
create or replace function private.maintain_home_couple_epoch()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private as $$
begin
  if old.member_b is null and new.member_b is not null and new.member_a = old.member_a then
    new.paired_at := now();
    return new;
  end if;
  if old.member_a is distinct from new.member_a or old.member_b is distinct from new.member_b then
    delete from public.home_edit_requests where couple_id = old.id;
    delete from public.home_keepsakes where couple_id = old.id;
    delete from public.home_unlocks where couple_id = old.id;
    delete from public.home_objects where couple_id = old.id;
    delete from public.home_reserved_routes where couple_id = old.id;
    delete from public.home_rooms where couple_id = old.id;
    delete from public.home_states where couple_id = old.id;
    new.paired_at := null;
  end if;
  return new;
end;
$$;

create or replace function private.purge_home_on_couple_delete()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private as $$
begin
  delete from public.home_edit_requests where couple_id = old.id;
  delete from public.home_keepsakes where couple_id = old.id;
  delete from public.home_unlocks where couple_id = old.id;
  delete from public.home_objects where couple_id = old.id;
  delete from public.home_reserved_routes where couple_id = old.id;
  delete from public.home_rooms where couple_id = old.id;
  delete from public.home_states where couple_id = old.id;
  return old;
end;
$$;

drop trigger if exists maintain_home_couple_epoch on public.couples;
create trigger maintain_home_couple_epoch
  before update of member_a, member_b on public.couples
  for each row execute function private.maintain_home_couple_epoch();
drop trigger if exists purge_home_on_couple_delete on public.couples;
create trigger purge_home_on_couple_delete
  before delete on public.couples
  for each row execute function private.purge_home_on_couple_delete();

alter table public.home_catalog_assets enable row level security;
alter table public.home_states enable row level security;
alter table public.home_rooms enable row level security;
alter table public.home_reserved_routes enable row level security;
alter table public.home_objects enable row level security;
alter table public.home_unlocks enable row level security;
alter table public.home_keepsakes enable row level security;
alter table public.home_edit_requests enable row level security;

drop policy if exists home_catalog_assets_select on public.home_catalog_assets;
create policy home_catalog_assets_select on public.home_catalog_assets
  for select to authenticated using (true);
drop policy if exists home_states_select on public.home_states;
create policy home_states_select on public.home_states
  for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists home_rooms_select on public.home_rooms;
create policy home_rooms_select on public.home_rooms
  for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists home_reserved_routes_select on public.home_reserved_routes;
create policy home_reserved_routes_select on public.home_reserved_routes
  for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists home_objects_select on public.home_objects;
create policy home_objects_select on public.home_objects
  for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists home_unlocks_select on public.home_unlocks;
create policy home_unlocks_select on public.home_unlocks
  for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists home_keepsakes_select on public.home_keepsakes;
create policy home_keepsakes_select on public.home_keepsakes
  for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists home_edit_requests_select on public.home_edit_requests;
create policy home_edit_requests_select on public.home_edit_requests
  for select to authenticated using (public.is_couple_member(couple_id) and actor_id = auth.uid());

revoke all on table public.home_catalog_assets, public.home_states, public.home_rooms,
  public.home_reserved_routes, public.home_objects, public.home_unlocks,
  public.home_keepsakes, public.home_edit_requests from public, anon, authenticated;
grant select on table public.home_catalog_assets, public.home_states, public.home_rooms,
  public.home_reserved_routes, public.home_objects, public.home_unlocks,
  public.home_keepsakes, public.home_edit_requests to authenticated;

revoke execute on function public.get_home_snapshot() from public, anon;
revoke execute on function public.apply_home_edit(uuid,bigint,text,jsonb) from public, anon;
grant execute on function public.get_home_snapshot() to authenticated;
grant execute on function public.apply_home_edit(uuid,bigint,text,jsonb) to authenticated;
revoke execute on function private.seed_home_object(uuid,text,text,text,numeric,numeric,smallint) from public, anon, authenticated;
revoke execute on function private.ensure_home_state(uuid,boolean) from public, anon, authenticated;
revoke execute on function private.home_has_active_moment(uuid) from public, anon, authenticated;
revoke execute on function private.home_capabilities(uuid) from public, anon, authenticated;
revoke execute on function private.home_snapshot(uuid) from public, anon, authenticated;
revoke execute on function private.authored_home_bounds(text,text,text) from public, anon, authenticated;
revoke execute on function private.validate_home_scene(uuid) from public, anon, authenticated;

alter table public.home_states replica identity full;
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'home_states'
  ) then alter publication supabase_realtime add table public.home_states; end if;
end $$;

notify pgrst, 'reload schema';
commit;
