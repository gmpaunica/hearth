-- Keep attachment groups coherent during atomic Home Studio edits.

begin;

create unique index if not exists home_objects_attachment_socket_key
  on public.home_objects (parent_object_id, attachment_socket)
  where parent_object_id is not null;

create or replace function private.guard_home_attachment()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private as $$
declare
  parent public.home_objects;
  sockets text[];
begin
  if new.parent_object_id is null then return new; end if;
  if new.parent_object_id = new.id then
    raise exception 'An object cannot attach to itself';
  end if;

  select p.* into parent
  from public.home_objects p where p.id = new.parent_object_id;
  if parent.id is null or parent.couple_id <> new.couple_id then
    raise exception 'Attachment parent is not part of this home';
  end if;
  select a.attachment_sockets into sockets
  from public.home_catalog_assets a where a.id = parent.asset_id;
  if new.attachment_socket is null or not (new.attachment_socket = any(sockets)) then
    raise exception 'Attachment socket is not available on its parent';
  end if;
  if new.placement_state = 'placed' and (
    parent.placement_state <> 'placed' or parent.room_id is distinct from new.room_id
  ) then
    raise exception 'Placed attachments must share their parent room';
  end if;
  if exists (
    with recursive ancestors as (
      select p.id, p.parent_object_id
      from public.home_objects p where p.id = new.parent_object_id
      union all
      select p.id, p.parent_object_id
      from public.home_objects p
      join ancestors a on p.id = a.parent_object_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'Attachments cannot form a cycle';
  end if;
  return new;
end;
$$;

create or replace function private.carry_home_attachments()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private as $$
begin
  if (old.position_x, old.position_y, old.position_z, old.room_id)
    is not distinct from
    (new.position_x, new.position_y, new.position_z, new.room_id)
  then return new; end if;

  update public.home_objects child set
    room_id = new.room_id,
    placement_state = new.placement_state,
    position_x = child.position_x + (new.position_x - old.position_x),
    position_y = child.position_y + (new.position_y - old.position_y),
    position_z = child.position_z + (new.position_z - old.position_z),
    updated_at = now()
  where child.parent_object_id = new.id;
  return new;
end;
$$;

create or replace function private.sync_home_attachment_placement()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private as $$
declare
  root_id uuid;
begin
  if old.placement_state is not distinct from new.placement_state then return new; end if;
  with recursive ancestors as (
    select o.id, o.parent_object_id
    from public.home_objects o where o.id = new.id
    union all
    select parent.id, parent.parent_object_id
    from public.home_objects parent
    join ancestors child on parent.id = child.parent_object_id
  )
  select id into root_id from ancestors where parent_object_id is null limit 1;

  with recursive family as (
    select o.id from public.home_objects o where o.id = root_id
    union all
    select child.id from public.home_objects child
    join family parent on child.parent_object_id = parent.id
  )
  update public.home_objects object set
    placement_state = new.placement_state,
    room_id = case when new.placement_state = 'stored' then null else object.room_id end,
    updated_at = now()
  where object.id in (select id from family)
    and object.placement_state is distinct from new.placement_state;
  return new;
end;
$$;

drop trigger if exists guard_home_attachment on public.home_objects;
create trigger guard_home_attachment
  before insert or update of parent_object_id, attachment_socket, room_id, placement_state
  on public.home_objects for each row
  execute function private.guard_home_attachment();

drop trigger if exists carry_home_attachments on public.home_objects;
create trigger carry_home_attachments
  after update of position_x, position_y, position_z, room_id
  on public.home_objects for each row
  execute function private.carry_home_attachments();

drop trigger if exists sync_home_attachment_placement on public.home_objects;
create trigger sync_home_attachment_placement
  after update of placement_state
  on public.home_objects for each row
  execute function private.sync_home_attachment_placement();

revoke all on function private.guard_home_attachment() from public, anon, authenticated;
revoke all on function private.carry_home_attachments() from public, anon, authenticated;
revoke all on function private.sync_home_attachment_placement() from public, anon, authenticated;

commit;
