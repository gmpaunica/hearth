-- The complete 52-piece garden taxonomy. Six already-installed pieces retain
-- their stable IDs; this migration adds the remaining 46 contracts.

alter table public.home_states
  alter column catalog_version set default 'home-catalog-v3';

with garden as (
  select * from jsonb_to_recordset($catalog$
  [
    {"id":"straight-path","category":"path","footprint":{"width":1,"depth":1,"height":0.05},"palette":["stone","terrain"],"surfaces":["path"],"day":30,"cost":3,"progression":{"walkable":true,"path_connector":true,"connectors":"north,south"}},
    {"id":"corner-path","category":"path","footprint":{"width":1,"depth":1,"height":0.05},"palette":["stone","terrain"],"surfaces":["path"],"day":30,"cost":3,"progression":{"walkable":true,"path_connector":true,"connectors":"north,east"}},
    {"id":"junction-path","category":"path","footprint":{"width":1,"depth":1,"height":0.05},"palette":["stone","terrain"],"surfaces":["path"],"day":30,"cost":4,"progression":{"walkable":true,"path_connector":true,"connectors":"north,east,south,west"}},
    {"id":"stepping-stones","category":"path","footprint":{"width":1,"depth":1.25,"height":0.06},"palette":["stone","terrain"],"surfaces":["path"],"day":30,"cost":3,"progression":{"walkable":true,"path_connector":true,"connectors":"north,south"}},
    {"id":"gravel-patch","category":"hardscape","footprint":{"width":1.5,"depth":1.5,"height":0.04},"palette":["stone","terrain"],"surfaces":["terrain"],"day":30,"cost":3,"progression":{"walkable":true}},
    {"id":"patio-tile","category":"hardscape","footprint":{"width":1.25,"depth":1.25,"height":0.05},"palette":["stone"],"surfaces":["terrain"],"day":30,"cost":3,"progression":{"walkable":true}},
    {"id":"low-fence","category":"boundary","footprint":{"width":1.5,"depth":0.25,"height":0.8},"palette":["wood","metal"],"surfaces":["border"],"day":30,"cost":5},
    {"id":"garden-gate","category":"boundary","footprint":{"width":1.5,"depth":0.3,"height":1.25},"palette":["wood","metal"],"surfaces":["border"],"day":30,"cost":6,"route":true},
    {"id":"round-flower-bed","category":"planting","footprint":{"width":1.4,"depth":1.4,"height":0.55},"palette":["flower","foliage","stone"],"surfaces":["terrain"],"day":30,"cost":7},
    {"id":"long-flower-bed","category":"planting","footprint":{"width":2.2,"depth":0.8,"height":0.55},"palette":["flower","foliage","stone"],"surfaces":["terrain"],"day":30,"cost":8},
    {"id":"hydrangea","category":"plant","footprint":{"width":1,"depth":0.9,"height":1.05},"palette":["flower","foliage"],"surfaces":["terrain"],"day":30,"cost":7},
    {"id":"lavender","category":"plant","footprint":{"width":0.9,"depth":0.7,"height":0.7},"palette":["flower","foliage"],"surfaces":["terrain"],"day":30,"cost":5},
    {"id":"hedge","category":"plant","footprint":{"width":1.6,"depth":0.55,"height":1.1},"palette":["foliage"],"surfaces":["terrain"],"day":30,"cost":7},
    {"id":"topiary","category":"plant","footprint":{"width":0.75,"depth":0.75,"height":1.65},"palette":["foliage","stone"],"surfaces":["terrain"],"day":30,"cost":7},
    {"id":"planter-pot","category":"planting","footprint":{"width":0.6,"depth":0.6,"height":0.75},"palette":["stone","flower","foliage"],"surfaces":["terrain"],"day":3,"cost":5},
    {"id":"planter-box","category":"planting","footprint":{"width":1.35,"depth":0.55,"height":0.7},"palette":["wood","flower","foliage"],"surfaces":["terrain"],"day":3,"cost":6},
    {"id":"fern-cluster","category":"plant","footprint":{"width":1,"depth":0.85,"height":0.85},"palette":["foliage"],"surfaces":["terrain"],"day":30,"cost":6},
    {"id":"fruit-tree","category":"tree","footprint":{"width":1.2,"depth":1.2,"height":3.6,"canopy":3.4},"palette":["wood","foliage","flower"],"surfaces":["terrain"],"day":180,"cost":18,"clearance":0.6,"progression":{"large_tree":true}},
    {"id":"willow","category":"tree","footprint":{"width":1.4,"depth":1.4,"height":4.1,"canopy":4.2},"palette":["wood","foliage"],"surfaces":["terrain"],"day":180,"cost":21,"clearance":0.7,"progression":{"large_tree":true}},
    {"id":"small-evergreen","category":"tree","footprint":{"width":1,"depth":1,"height":2.5,"canopy":2.1},"palette":["wood","foliage"],"surfaces":["terrain"],"day":60,"cost":12,"clearance":0.35},
    {"id":"raised-vegetable-bed","category":"planting","footprint":{"width":1.8,"depth":1.1,"height":0.65},"palette":["wood","foliage","terrain"],"surfaces":["terrain"],"day":60,"cost":9},
    {"id":"bistro-table","category":"surface","footprint":{"width":0.8,"depth":0.8,"height":0.8},"palette":["metal","wood"],"surfaces":["terrain"],"sockets":["tabletop"],"day":30,"cost":6},
    {"id":"bistro-chair","category":"seating","footprint":{"width":0.65,"depth":0.65,"height":1},"palette":["metal","wood","fabric"],"surfaces":["terrain"],"day":30,"cost":5},
    {"id":"lounge-chair","category":"seating","footprint":{"width":0.85,"depth":1.5,"height":0.75},"palette":["wood","fabric","metal"],"surfaces":["terrain"],"day":30,"cost":8},
    {"id":"picnic-blanket","category":"seating","footprint":{"width":1.8,"depth":1.5,"height":0.04},"palette":["fabric"],"surfaces":["terrain"],"day":30,"cost":5,"route":true,"progression":{"walkable":true},"functional":{"interactionRig":"garden-couple"}},
    {"id":"swing-bench","category":"seating","footprint":{"width":1.9,"depth":1.1,"height":2.2},"palette":["wood","metal","fabric"],"surfaces":["terrain"],"day":60,"cost":13,"route":true,"functional":{"interactionRig":"garden-couple"}},
    {"id":"garden-stool","category":"seating","footprint":{"width":0.55,"depth":0.55,"height":0.55},"palette":["wood","metal","stone"],"surfaces":["terrain"],"day":30,"cost":4},
    {"id":"trellis-arch","category":"structure","footprint":{"width":1.6,"depth":0.55,"height":2.35},"palette":["wood","metal","flower","foliage"],"surfaces":["terrain"],"day":60,"cost":11,"route":true},
    {"id":"pergola","category":"structure","footprint":{"width":2.6,"depth":2.1,"height":2.5},"palette":["wood","metal","foliage"],"surfaces":["terrain"],"day":60,"cost":18,"route":true},
    {"id":"gazebo","category":"structure","footprint":{"width":3.2,"depth":3,"height":3.1},"palette":["wood","metal","fabric"],"surfaces":["terrain"],"day":180,"cost":24,"clearance":0.25,"route":true,"functional":{"interactionRig":"garden-couple"}},
    {"id":"potting-bench","category":"surface","footprint":{"width":1.5,"depth":0.7,"height":1.45},"palette":["wood","metal","stone"],"surfaces":["terrain"],"sockets":["shelf-1","tabletop"],"day":60,"cost":9},
    {"id":"tool-shed","category":"structure","footprint":{"width":2.3,"depth":1.8,"height":2.6},"palette":["wood","metal","stone"],"surfaces":["terrain"],"day":60,"cost":17,"clearance":0.18},
    {"id":"birdbath","category":"water","footprint":{"width":0.8,"depth":0.8,"height":1.1},"palette":["stone","water"],"surfaces":["terrain"],"day":30,"cost":7},
    {"id":"small-pond","category":"water","footprint":{"width":2,"depth":1.4,"height":0.3},"palette":["stone","water","foliage"],"surfaces":["terrain"],"day":30,"cost":12,"route":true,"functional":{"effectSockets":["water","pond-edge"]}},
    {"id":"koi-pond-large","category":"water","footprint":{"width":4.4,"depth":3,"height":0.5},"palette":["stone","water","foliage"],"surfaces":["terrain"],"day":90,"cost":34,"clearance":0.3,"route":true,"progression":{"major_water":true},"functional":{"interactionRig":"pond-edge","effectSockets":["water","fish","pond-edge"]}},
    {"id":"fountain","category":"water","footprint":{"width":2,"depth":2,"height":2.6},"palette":["stone","water","metal"],"surfaces":["terrain"],"day":90,"cost":20,"clearance":0.2,"route":true,"progression":{"major_water":true,"style_variants":"low,tall"},"functional":{"effectSockets":["water","spray","basin"]}},
    {"id":"string-light-set","category":"lighting","footprint":{"width":2.4,"depth":0.35,"height":2.1},"palette":["metal","wood"],"surfaces":["terrain"],"day":60,"cost":8},
    {"id":"ground-light","category":"lighting","footprint":{"width":0.35,"depth":0.35,"height":0.35},"palette":["metal","stone"],"surfaces":["terrain"],"day":30,"cost":4},
    {"id":"stone-statue","category":"decoration","footprint":{"width":0.85,"depth":0.75,"height":1.7},"palette":["stone"],"surfaces":["terrain"],"day":180,"cost":9},
    {"id":"sundial","category":"decoration","footprint":{"width":0.75,"depth":0.75,"height":1},"palette":["stone","metal"],"surfaces":["terrain"],"day":60,"cost":6},
    {"id":"birdhouse","category":"decoration","footprint":{"width":0.55,"depth":0.55,"height":1.65},"palette":["wood","metal"],"surfaces":["terrain"],"day":30,"cost":6},
    {"id":"wind-chime","category":"decoration","footprint":{"width":0.45,"depth":0.45,"height":1.25},"palette":["wood","metal"],"surfaces":["terrain"],"day":30,"cost":6,"progression":{"motion":true}},
    {"id":"watering-can","category":"decoration","footprint":{"width":0.65,"depth":0.4,"height":0.55},"palette":["metal","flower"],"surfaces":["terrain"],"day":30,"cost":4},
    {"id":"wheelbarrow","category":"decoration","footprint":{"width":1.25,"depth":0.65,"height":0.7},"palette":["wood","metal","flower"],"surfaces":["terrain"],"day":30,"cost":7},
    {"id":"garden-gnome","category":"decoration","footprint":{"width":0.4,"depth":0.4,"height":0.75},"palette":["fabric","stone"],"surfaces":["terrain"],"day":30,"cost":5},
    {"id":"scarecrow","category":"decoration","footprint":{"width":1.2,"depth":0.45,"height":2.1},"palette":["wood","fabric"],"surfaces":["terrain"],"day":60,"cost":8}
  ]
  $catalog$::jsonb) as item(
    id text, category text, footprint jsonb, palette jsonb, surfaces jsonb,
    sockets jsonb, day integer, cost integer, clearance numeric,
    progression jsonb, functional jsonb, route boolean
  )
)
insert into public.home_catalog_assets (
  id, revision, catalog_version, category, renderer, footprint, rotations,
  compatible_rooms, compatible_surfaces, collision_clearance, palette_slots,
  attachment_sockets, render_cost, progression, functional, route_endpoint
)
select id, 1, 'home-catalog-v3', category, 'GardenCatalog', footprint,
  array[0,1,2,3]::smallint[], array['garden']::text[],
  array(select jsonb_array_elements_text(surfaces)), coalesce(
    clearance,
    case when coalesce((progression->>'walkable')::boolean, false) then 0 else 0.06 end
  ),
  array(select jsonb_array_elements_text(palette)),
  coalesce(array(select jsonb_array_elements_text(sockets)), '{}'::text[]), cost,
  jsonb_build_object('day', day) || coalesce(progression, '{}'::jsonb),
  coalesce(functional, '{}'::jsonb), coalesce(route, false)
from garden
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

update public.home_catalog_assets set catalog_version = 'home-catalog-v3'
where retired_at is null;

update public.home_states
set catalog_version = 'home-catalog-v3', updated_at = now()
where catalog_version <> 'home-catalog-v3';
