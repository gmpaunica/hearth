-- Hearth indoor content pack. Geometry remains reviewed client code; this
-- registry is the authoritative compatibility, placement, and cost contract.

alter table public.home_states
  alter column catalog_version set default 'home-catalog-v2';

with indoor as (
  select * from jsonb_to_recordset($catalog$
  [
    {"id":"cottage-wardrobe","category":"storage","footprint":{"width":1.2,"depth":0.7,"height":2.2},"palette":["wood","metal"],"surfaces":["floor"],"sockets":[],"day":21,"cost":9},
    {"id":"paneled-armoire","category":"storage","footprint":{"width":1.4,"depth":0.75,"height":2.25},"palette":["wood","metal"],"surfaces":["floor"],"sockets":[],"day":21,"cost":10},
    {"id":"clothes-rail","category":"storage","footprint":{"width":1.35,"depth":0.55,"height":1.75},"palette":["wood","metal","fabric"],"surfaces":["floor"],"sockets":[],"day":21,"cost":7},
    {"id":"low-cubby","category":"storage","footprint":{"width":1.4,"depth":0.55,"height":0.85},"palette":["wood","fabric"],"surfaces":["floor"],"sockets":["shelf-left","shelf-right"],"day":21,"cost":7},
    {"id":"blanket-chest","category":"storage","footprint":{"width":1.15,"depth":0.65,"height":0.65},"palette":["wood","fabric","metal"],"surfaces":["floor"],"sockets":["chest-top"],"day":21,"cost":6},
    {"id":"reading-chair","category":"seating","footprint":{"width":0.9,"depth":0.9,"height":1.15},"palette":["wood","fabric"],"surfaces":["floor"],"sockets":[],"day":3,"cost":7},
    {"id":"rocking-chair","category":"seating","footprint":{"width":0.9,"depth":1.05,"height":1.25},"palette":["wood","fabric"],"surfaces":["floor"],"sockets":[],"day":3,"cost":8},
    {"id":"pouf","category":"seating","footprint":{"width":0.7,"depth":0.7,"height":0.5},"palette":["fabric"],"surfaces":["floor"],"sockets":[],"day":3,"cost":4},
    {"id":"side-table","category":"surface","footprint":{"width":0.65,"depth":0.65,"height":0.72},"palette":["wood","metal","stone"],"surfaces":["floor"],"sockets":["tabletop"],"day":3,"cost":5},
    {"id":"narrow-bench","category":"seating","footprint":{"width":1.35,"depth":0.55,"height":0.78},"palette":["wood","fabric","metal"],"surfaces":["floor"],"sockets":["bench-top"],"day":3,"cost":6},
    {"id":"teddy-bear","category":"keepsake","footprint":{"width":0.45,"depth":0.4,"height":0.6},"palette":["fabric"],"surfaces":["floor","shelf","table","bed"],"sockets":[],"day":3,"cost":4},
    {"id":"trophy-cup","category":"keepsake","footprint":{"width":0.3,"depth":0.3,"height":0.5},"palette":["metal","wood"],"surfaces":["shelf","table","mantel"],"sockets":[],"day":3,"cost":3},
    {"id":"rosette","category":"keepsake","footprint":{"width":0.35,"depth":0.12,"height":0.55},"palette":["fabric","metal"],"surfaces":["wall","shelf"],"sockets":[],"day":3,"cost":3},
    {"id":"couple-statuette","category":"keepsake","footprint":{"width":0.4,"depth":0.3,"height":0.65},"palette":["stone","metal"],"surfaces":["shelf","table","mantel"],"sockets":[],"day":3,"cost":4},
    {"id":"animal-figurine","category":"keepsake","footprint":{"width":0.4,"depth":0.28,"height":0.35},"palette":["stone","wood"],"surfaces":["shelf","table","mantel"],"sockets":[],"day":3,"cost":3},
    {"id":"snow-globe","category":"keepsake","footprint":{"width":0.38,"depth":0.38,"height":0.5},"palette":["glass","stone","metal"],"surfaces":["shelf","table","mantel"],"sockets":[],"day":3,"cost":5},
    {"id":"travel-trunk","category":"keepsake","footprint":{"width":1.05,"depth":0.65,"height":0.65},"palette":["wood","fabric","metal"],"surfaces":["floor"],"sockets":["trunk-top"],"day":3,"cost":6},
    {"id":"shell-jar","category":"keepsake","footprint":{"width":0.32,"depth":0.32,"height":0.5},"palette":["glass","stone"],"surfaces":["shelf","table","mantel"],"sockets":[],"day":3,"cost":4},
    {"id":"book-stack","category":"keepsake","footprint":{"width":0.48,"depth":0.36,"height":0.3},"palette":["fabric","paper"],"surfaces":["shelf","table","mantel","bed"],"sockets":[],"day":3,"cost":3},
    {"id":"botanical-print","category":"wall","footprint":{"width":0.85,"depth":0.12,"height":1.05},"palette":["wood","foliage","paper"],"surfaces":["wall"],"sockets":[],"day":3,"cost":4},
    {"id":"landscape-print","category":"wall","footprint":{"width":1.15,"depth":0.12,"height":0.8},"palette":["wood","wall","foliage"],"surfaces":["wall"],"sockets":[],"day":3,"cost":5},
    {"id":"heart-print","category":"wall","footprint":{"width":0.7,"depth":0.12,"height":0.85},"palette":["wood","fabric","paper"],"surfaces":["wall"],"sockets":[],"day":3,"cost":4},
    {"id":"memory-frame","category":"wall","footprint":{"width":0.65,"depth":0.12,"height":0.75},"palette":["wood","metal","paper"],"surfaces":["wall"],"sockets":[],"day":3,"cost":4},
    {"id":"tall-mirror","category":"wall","footprint":{"width":0.7,"depth":0.16,"height":1.75},"palette":["wood","metal","glass"],"surfaces":["wall"],"sockets":[],"day":3,"cost":6},
    {"id":"table-lamp","category":"lighting","footprint":{"width":0.42,"depth":0.42,"height":0.72},"palette":["metal","fabric"],"surfaces":["table","shelf"],"sockets":[],"day":3,"cost":5},
    {"id":"floor-lamp","category":"lighting","footprint":{"width":0.5,"depth":0.5,"height":1.75},"palette":["metal","fabric","wood"],"surfaces":["floor"],"sockets":[],"day":3,"cost":6},
    {"id":"lantern","category":"lighting","footprint":{"width":0.42,"depth":0.42,"height":0.62},"palette":["metal","glass"],"surfaces":["floor","table","shelf"],"sockets":[],"day":3,"cost":5},
    {"id":"round-rug","category":"textile","footprint":{"width":1.8,"depth":1.8,"height":0.04},"palette":["fabric"],"surfaces":["floor"],"sockets":[],"day":3,"cost":4,"walkable":true},
    {"id":"runner","category":"textile","footprint":{"width":0.8,"depth":2.3,"height":0.04},"palette":["fabric"],"surfaces":["floor"],"sockets":[],"day":3,"cost":4,"walkable":true},
    {"id":"cushion-basket","category":"textile","footprint":{"width":0.65,"depth":0.6,"height":0.65},"palette":["wood","fabric"],"surfaces":["floor"],"sockets":[],"day":3,"cost":5},
    {"id":"flower-vase","category":"plant","footprint":{"width":0.38,"depth":0.38,"height":0.65},"palette":["flower","foliage","stone"],"surfaces":["table","shelf","mantel"],"sockets":[],"day":3,"cost":5}
  ]
  $catalog$::jsonb) as item(
    id text, category text, footprint jsonb, palette jsonb, surfaces jsonb,
    sockets jsonb, day integer, cost integer, walkable boolean
  )
)
insert into public.home_catalog_assets (
  id, revision, catalog_version, category, renderer, footprint, rotations,
  compatible_rooms, compatible_surfaces, collision_clearance, palette_slots,
  attachment_sockets, render_cost, progression, functional, route_endpoint
)
select id, 1, 'home-catalog-v2', category, 'IndoorCatalog', footprint,
  array[0,1,2,3]::smallint[], array['living','bedroom']::text[],
  array(select jsonb_array_elements_text(surfaces)),
  case when coalesce(walkable, false) then 0 else 0.05 end,
  array(select jsonb_array_elements_text(palette)),
  array(select jsonb_array_elements_text(sockets)), cost,
  jsonb_build_object('day', day) || case when coalesce(walkable, false)
    then '{"walkable":true}'::jsonb else '{}'::jsonb end,
  '{}'::jsonb, false
from indoor
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
  route_endpoint = excluded.route_endpoint,
  retired_at = null;

update public.home_catalog_assets
set catalog_version = 'home-catalog-v2'
where retired_at is null;

update public.home_states
set catalog_version = 'home-catalog-v2', updated_at = now()
where catalog_version <> 'home-catalog-v2';
