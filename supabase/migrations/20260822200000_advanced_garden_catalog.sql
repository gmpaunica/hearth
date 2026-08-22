-- Grand-garden landmarks, seasonal planting, and architectural variants.

alter table public.home_states
  alter column catalog_version set default 'home-catalog-v5';

with advanced as (
  select * from jsonb_to_recordset($catalog$
  [
    {"id":"rose-gazebo","category":"structure","footprint":{"width":3.2,"depth":3,"height":3.2},"palette":["wood","metal","fabric","flower","foliage"],"clearance":0.25,"cost":27,"progression":{"day":180},"route":true,"functional":{"interactionRig":"garden-couple","poses":["sit-left","sit-right"],"approach":[[-0.34,0.72],[0.34,0.72]],"exit":[[-0.34,0.72],[0.34,0.72]],"cameraTarget":[0,1,0],"reactionAnchor":[0,2,0],"uiAnchor":[0,2.5,0],"clickBounds":{"width":3.2,"depth":3,"height":3.2},"effectSockets":["seat-left","seat-right","canopy-lights"]}},
    {"id":"stone-pergola","category":"structure","footprint":{"width":2.8,"depth":2.2,"height":2.65},"palette":["stone","metal","foliage"],"clearance":0.22,"cost":21,"progression":{"day":180},"route":true,"functional":{}},
    {"id":"moon-gate-sculpture","category":"structure","footprint":{"width":2.2,"depth":0.7,"height":2.7},"palette":["stone","metal","foliage"],"clearance":0.18,"cost":18,"progression":{"day":180},"route":true,"functional":{}},
    {"id":"dove-garden-sculpture","category":"decoration","footprint":{"width":1,"depth":0.85,"height":1.8},"palette":["stone","metal"],"clearance":0.1,"cost":11,"progression":{"day":180},"route":false,"functional":{}},
    {"id":"spring-tulip-bed","category":"planting","footprint":{"width":1.6,"depth":1,"height":0.75},"palette":["flower","foliage","stone"],"clearance":0.06,"cost":8,"progression":{"day":60,"season":"spring"},"route":false,"functional":{}},
    {"id":"summer-sunflower-bed","category":"planting","footprint":{"width":1.6,"depth":1,"height":1.25},"palette":["flower","foliage","stone"],"clearance":0.06,"cost":9,"progression":{"day":60,"season":"summer"},"route":false,"functional":{}},
    {"id":"autumn-mum-bed","category":"planting","footprint":{"width":1.6,"depth":1,"height":0.8},"palette":["flower","foliage","stone"],"clearance":0.06,"cost":8,"progression":{"day":60,"season":"autumn"},"route":false,"functional":{}},
    {"id":"winter-holly-planter","category":"planting","footprint":{"width":1.2,"depth":0.8,"height":1.05},"palette":["flower","foliage","wood","stone"],"clearance":0.06,"cost":8,"progression":{"day":60,"season":"winter"},"route":false,"functional":{}}
  ]
  $catalog$::jsonb) as item(
    id text, category text, footprint jsonb, palette jsonb, clearance numeric,
    cost integer, progression jsonb, route boolean, functional jsonb
  )
)
insert into public.home_catalog_assets (
  id, revision, catalog_version, category, renderer, footprint, rotations,
  compatible_rooms, compatible_surfaces, collision_clearance, palette_slots,
  attachment_sockets, render_cost, progression, functional, route_endpoint
)
select id, 1, 'home-catalog-v5', category, 'GardenCatalog', footprint,
  array[0,1,2,3]::smallint[], array['garden']::text[], array['terrain']::text[],
  clearance, array(select jsonb_array_elements_text(palette)), '{}'::text[],
  cost, progression, functional, route
from advanced
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
set progression = progression || '{"style_variants":"cottage,brass,forest"}'::jsonb
where id = 'greenhouse-portal';

update public.home_catalog_assets
set catalog_version = 'home-catalog-v5'
where retired_at is null;

update public.home_states
set catalog_version = 'home-catalog-v5', updated_at = now()
where catalog_version <> 'home-catalog-v5';

notify pgrst, 'reload schema';
