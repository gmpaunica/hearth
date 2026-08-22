-- Fireplace bodies and the first bedroom family. Fireplace geometry is
-- catalog metadata only; reconciliation flame state remains in Moments.

alter table public.home_states
  alter column catalog_version set default 'home-catalog-v4';

with upgrades as (
  select * from jsonb_to_recordset($catalog$
  [
    {"id":"carved-stone-fireplace","category":"fireplace","renderer":"Fireplace","footprint":{"width":2,"depth":1.1,"height":3},"rooms":["living"],"palette":["wood","stone","metal"],"sockets":["mantel-left","mantel-center","mantel-right"],"clearance":0.1,"cost":21,"progression":{"day":14,"tier":2},"route":true,"functional":{"role":"fireplace","signals":["fireplace"],"poses":["floor-left","floor-right"],"approach":[[-2.55,-1.95],[-1.55,-1.95]],"exit":[[-2.55,-1.95],[-1.55,-1.95]],"cameraTarget":[-2.6,1.2,-3.6],"reactionAnchor":[1,2.3,0.6],"uiAnchor":[1,2.9,0.4],"clickBounds":{"width":2.5,"depth":1.5,"height":3.5},"effectSockets":["fire","mantel","floor-glow"]}},
    {"id":"grand-hearth-fireplace","category":"fireplace","renderer":"Fireplace","footprint":{"width":2,"depth":1.1,"height":3.5},"rooms":["living"],"palette":["wood","stone","metal"],"sockets":["mantel-left","mantel-center","mantel-right"],"clearance":0.1,"cost":25,"progression":{"day":90,"tier":3},"route":true,"functional":{"role":"fireplace","signals":["fireplace"],"poses":["floor-left","floor-right"],"approach":[[-2.55,-1.95],[-1.55,-1.95]],"exit":[[-2.55,-1.95],[-1.55,-1.95]],"cameraTarget":[-2.6,1.2,-3.6],"reactionAnchor":[1,2.3,0.6],"uiAnchor":[1,2.9,0.4],"clickBounds":{"width":2.5,"depth":1.5,"height":3.5},"effectSockets":["fire","mantel","floor-glow"]}},
    {"id":"cottage-double-bed","category":"bed","renderer":"BedroomCatalog","footprint":{"width":1.7,"depth":2.2,"height":1.45},"rooms":["bedroom","living"],"palette":["wood","fabric","metal"],"sockets":["bed-left","bed-right","headboard"],"clearance":0.15,"cost":15,"progression":{"day":21},"route":true,"functional":{"role":"romantic_rest_location","signals":["romantic"],"poses":["lie-left","lie-right"],"approach":[[-0.42,1.22],[0.42,1.22]],"exit":[[-0.42,1.22],[0.42,1.22]],"cameraTarget":[0,1,-0.32],"reactionAnchor":[0,1.9,-0.32],"uiAnchor":[0,2.2,-0.32],"clickBounds":{"width":1.9,"depth":2.4,"height":1.6},"effectSockets":["bed-left","bed-right","heart"]}},
    {"id":"four-poster-bed","category":"bed","renderer":"BedroomCatalog","footprint":{"width":1.8,"depth":2.25,"height":2.35},"rooms":["bedroom"],"palette":["wood","fabric","metal"],"sockets":["bed-left","bed-right","headboard"],"clearance":0.18,"cost":19,"progression":{"day":21},"route":true,"functional":{"role":"romantic_rest_location","signals":["romantic"],"poses":["lie-left","lie-right"],"approach":[[-0.42,1.22],[0.42,1.22]],"exit":[[-0.42,1.22],[0.42,1.22]],"cameraTarget":[0,1,-0.32],"reactionAnchor":[0,1.9,-0.32],"uiAnchor":[0,2.5,-0.32],"clickBounds":{"width":2,"depth":2.5,"height":2.5},"effectSockets":["bed-left","bed-right","heart"]}},
    {"id":"bedroom-settee","category":"seating","renderer":"BedroomCatalog","footprint":{"width":1.55,"depth":0.8,"height":1.05},"rooms":["bedroom","living"],"palette":["wood","fabric","metal"],"sockets":["seat-left","seat-right"],"clearance":0.1,"cost":10,"progression":{"day":21},"route":true,"functional":{"role":"conversation_seating","signals":["sofa"],"poses":["sit-left","sit-right"],"approach":[[-0.34,0.72],[0.34,0.72]],"exit":[[-0.34,0.72],[0.34,0.72]],"cameraTarget":[0,0.8,0],"reactionAnchor":[0,1.7,0],"uiAnchor":[0,2,0],"clickBounds":{"width":1.75,"depth":1.1,"height":1.3},"effectSockets":["seat-left","seat-right"]}},
    {"id":"slipper-chair","category":"seating","renderer":"BedroomCatalog","footprint":{"width":0.75,"depth":0.8,"height":1},"rooms":["bedroom","living"],"palette":["wood","fabric","metal"],"sockets":[],"clearance":0.08,"cost":7,"progression":{"day":21},"route":false,"functional":{}},
    {"id":"bedroom-writing-table","category":"surface","renderer":"BedroomCatalog","footprint":{"width":1.45,"depth":1.55,"height":1.05},"rooms":["bedroom","living"],"palette":["wood","fabric","metal"],"sockets":["tabletop"],"clearance":0.12,"cost":12,"progression":{"day":21},"route":true,"functional":{"role":"shared_table","signals":["table"],"poses":["sit-near","sit-far"],"approach":[[0.92,0.67],[0.92,-0.67]],"exit":[[0.92,0.67],[0.92,-0.67]],"cameraTarget":[0,0.7,0],"reactionAnchor":[0,1.7,0],"uiAnchor":[0,2,0],"clickBounds":{"width":1.7,"depth":1.8,"height":1.3},"effectSockets":["tabletop","chair-near","chair-far"]}},
    {"id":"oak-double-wardrobe","category":"storage","renderer":"BedroomCatalog","footprint":{"width":1.4,"depth":0.75,"height":2.25},"rooms":["bedroom","living"],"palette":["wood","metal","fabric"],"sockets":[],"clearance":0.1,"cost":11,"progression":{"day":21},"route":false,"functional":{}},
    {"id":"linen-press","category":"storage","renderer":"BedroomCatalog","footprint":{"width":1.15,"depth":0.65,"height":1.85},"rooms":["bedroom","living"],"palette":["wood","metal","fabric"],"sockets":["shelf-top"],"clearance":0.08,"cost":9,"progression":{"day":21},"route":false,"functional":{}}
  ]
  $catalog$::jsonb) as item(
    id text, category text, renderer text, footprint jsonb, rooms jsonb,
    palette jsonb, sockets jsonb, clearance numeric, cost integer, progression jsonb,
    route boolean, functional jsonb
  )
)
insert into public.home_catalog_assets (
  id, revision, catalog_version, category, renderer, footprint, rotations,
  compatible_rooms, compatible_surfaces, collision_clearance, palette_slots,
  attachment_sockets, render_cost, progression, functional, route_endpoint
)
select id, 1, 'home-catalog-v4', category, renderer, footprint,
  array[0,1,2,3]::smallint[],
  array(select jsonb_array_elements_text(rooms)), array['floor']::text[],
  clearance,
  array(select jsonb_array_elements_text(palette)),
  array(select jsonb_array_elements_text(sockets)), cost, progression,
  functional, route
from upgrades
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
set catalog_version = 'home-catalog-v4'
where retired_at is null;

update public.home_states
set catalog_version = 'home-catalog-v4', updated_at = now()
where catalog_version <> 'home-catalog-v4';

notify pgrst, 'reload schema';
