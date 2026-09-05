-- Hearth relationship safety and account ownership
-- Additive only. Do not deploy without the owner's explicit authorization.

begin;

create table if not exists public.privacy_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notification_privacy text not null default 'generic'
    check (notification_privacy in ('generic', 'gentle')),
  updated_at timestamptz not null default now()
);

create table if not exists private.pairing_blocks (
  blocker_user_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  blocked_label text,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);

alter table public.privacy_preferences enable row level security;
alter table private.pairing_blocks enable row level security;
revoke all on table public.privacy_preferences from public, anon, authenticated;
revoke all on table private.pairing_blocks from public, anon, authenticated;

create or replace function public.get_privacy_center_snapshot()
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, private as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'account', jsonb_build_object(
      'email', u.email,
      'email_verified', u.email_confirmed_at is not null,
      'anonymous', u.email is null
    ),
    'preferences', jsonb_build_object(
      'notification_privacy', coalesce(p.notification_privacy, 'generic')
    ),
    'blocked_former_partners', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', b.blocked_user_id,
        'label', coalesce(nullif(b.blocked_label, ''), 'Former partner'),
        'blocked_at', b.created_at
      ) order by b.created_at desc)
      from private.pairing_blocks b where b.blocker_user_id = uid
    ), '[]'::jsonb)
  ) into result
  from auth.users u
  left join public.privacy_preferences p on p.user_id = u.id
  where u.id = uid;
  return coalesce(result, '{}'::jsonb);
end;
$$;

create or replace function public.set_privacy_preferences(p_notification_privacy text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_notification_privacy not in ('generic', 'gentle') then
    raise exception 'Invalid notification privacy setting' using errcode = '22023';
  end if;
  insert into public.privacy_preferences(user_id, notification_privacy, updated_at)
  values (uid, p_notification_privacy, now())
  on conflict (user_id) do update set
    notification_privacy = excluded.notification_privacy,
    updated_at = excluded.updated_at;
  return jsonb_build_object('notification_privacy', p_notification_privacy);
end;
$$;

-- Pairing is blocked in either direction. The check is server-owned and occurs
-- while the invite row is locked, before any membership mutation.
create or replace function public.join_couple(code text)
returns public.couples language plpgsql security definer
set search_path = pg_catalog, public, private, extensions as $$
declare
  uid uuid := auth.uid();
  target public.couples;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select * into target from public.couples
  where invite_code = upper(trim(code)) for update;
  if target.id is null then raise exception 'No home found for that code'; end if;
  if target.member_a = uid or target.member_b = uid then return target; end if;
  if exists (select 1 from public.couples where member_a = uid or member_b = uid) then
    raise exception 'Leave your current home before joining another';
  end if;
  if target.member_b is not null then raise exception 'This home is already full'; end if;
  if exists (
    select 1 from private.pairing_blocks b
    where (b.blocker_user_id = uid and b.blocked_user_id = target.member_a)
       or (b.blocker_user_id = target.member_a and b.blocked_user_id = uid)
  ) then
    raise exception 'This pairing is unavailable' using errcode = '42501';
  end if;
  update public.couples set member_b = uid
  where id = target.id and member_b is null returning * into target;
  if target.id is null then raise exception 'This home is already full'; end if;
  return target;
end;
$$;

create or replace function public.block_and_leave_couple()
returns void language plpgsql security definer
set search_path = pg_catalog, public, private as $$
declare
  uid uuid := auth.uid();
  home public.couples;
  partner uuid;
  partner_label text;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select * into home from public.couples
  where member_a = uid or member_b = uid order by created_at limit 1 for update;
  if home.id is null then return; end if;
  partner := case when home.member_a = uid then home.member_b else home.member_a end;
  if partner is not null then
    select display_name into partner_label from public.profiles where id = partner;
    insert into private.pairing_blocks(blocker_user_id, blocked_user_id, blocked_label)
    values (uid, partner, left(nullif(trim(partner_label), ''), 80))
    on conflict (blocker_user_id, blocked_user_id) do nothing;
  end if;
  perform public.leave_couple();
end;
$$;

create or replace function public.unblock_former_partner(p_blocked_user_id uuid)
returns boolean language plpgsql security definer
set search_path = pg_catalog, private as $$
declare uid uuid := auth.uid(); removed integer;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  delete from private.pairing_blocks
  where blocker_user_id = uid and blocked_user_id = p_blocked_user_id;
  get diagnostics removed = row_count;
  return removed = 1;
end;
$$;

-- The export contains the requester's profile and authored records. Shared
-- session/home facts are included only for a home they currently belong to;
-- partner notes, partner media paths, receipts, push tokens, invite codes, and
-- private completion choices are deliberately absent.
create or replace function public.request_account_export()
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, private as $$
declare
  uid uuid := auth.uid();
  home_id uuid;
  result jsonb;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select id into home_id from public.couples
  where member_a = uid or member_b = uid order by created_at desc limit 1;

  select jsonb_build_object(
    'version', 1,
    'generated_at', now(),
    'account', jsonb_build_object('user_id', uid, 'email', u.email, 'created_at', u.created_at),
    'profile', jsonb_build_object('display_name', p.display_name, 'avatar_key', p.avatar_key, 'created_at', p.created_at),
    'authored', jsonb_build_object(
      'signals', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'type', s.type, 'created_at', s.created_at, 'resolved_at', s.resolved_at
      ) order by s.created_at) from public.signals s where s.from_user = uid), '[]'::jsonb),
      'responses', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'signal_id', r.signal_id, 'choice', r.choice, 'created_at', r.created_at
      ) order by r.created_at) from public.responses r where r.from_user = uid), '[]'::jsonb),
      'drawings', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'home_date', d.day, 'grid', d.grid, 'created_at', d.created_at, 'updated_at', d.updated_at
      ) order by d.day) from public.drawings d where d.from_user = uid), '[]'::jsonb),
      'daily_media', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'medium', m.medium, 'home_date', m.home_date, 'mime_type', m.mime_type,
        'byte_size', m.byte_size, 'duration_ms', m.duration_ms, 'width', m.width,
        'height', m.height, 'submitted_at', m.submitted_at
      ) order by m.submitted_at) from public.daily_media m
        where m.author_id = uid and m.deleted_at is null), '[]'::jsonb),
      'moment_participation', coalesce((select jsonb_agg(jsonb_build_object(
        'signal_id', mp.signal_id, 'role', mp.participant_role, 'note', mp.note,
        'response_action', mp.response_action, 'responded_at', mp.responded_at,
        'completion_choice', mp.completion_choice, 'completion_chosen_at', mp.completion_chosen_at,
        'created_at', mp.created_at
      ) order by mp.created_at) from public.moment_participants mp where mp.user_id = uid), '[]'::jsonb)
    ),
    'shared', jsonb_build_object(
      'moment_sessions', coalesce((select jsonb_agg(jsonb_build_object(
        'signal_id', ms.signal_id, 'destination', ms.destination, 'intent', ms.intent,
        'phase', ms.phase, 'terminal_reason', ms.terminal_reason,
        'created_at', ms.created_at, 'terminal_at', ms.terminal_at
      ) order by ms.created_at) from public.moment_sessions ms where ms.couple_id = home_id), '[]'::jsonb),
      'greenhouse_days', coalesce((select jsonb_agg(jsonb_build_object(
        'home_date', gm.home_date, 'planted_at', gm.planted_at
      ) order by gm.home_date) from public.greenhouse_memories gm
        where gm.couple_id = home_id and gm.unplanted_at is null
          and (gm.solo_owner_id is null or gm.solo_owner_id = uid)), '[]'::jsonb)
    ),
    '_media_objects', coalesce((select jsonb_agg(jsonb_build_object(
      'id', m.id, 'path', m.storage_path, 'medium', m.medium
    )) from public.daily_media m where m.author_id = uid and m.deleted_at is null), '[]'::jsonb)
  ) into result
  from auth.users u join public.profiles p on p.id = u.id where u.id = uid;
  return result;
end;
$$;

-- Called by the authenticated deletion endpoint before auth.admin.deleteUser.
-- Existing leave semantics remove requester-owned artifacts, preserve only the
-- survivor's material, reset the home epoch, and rotate invite credentials.
create or replace function public.prepare_account_deletion()
returns text[] language plpgsql security definer
set search_path = pg_catalog, public as $$
declare uid uuid := auth.uid(); paths text[];
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select coalesce(array_agg(storage_path), array[]::text[]) into paths
  from public.daily_media where author_id = uid and deleted_at is null;
  -- prepare_sign_out clears push registration and invokes the canonical
  -- leave_couple transaction. A failed admin deletion can safely retry this
  -- function after the home has already been reset.
  perform public.prepare_sign_out();
  return paths;
end;
$$;

revoke execute on function public.get_privacy_center_snapshot() from public, anon;
revoke execute on function public.set_privacy_preferences(text) from public, anon;
revoke execute on function public.block_and_leave_couple() from public, anon;
revoke execute on function public.unblock_former_partner(uuid) from public, anon;
revoke execute on function public.request_account_export() from public, anon;
revoke execute on function public.prepare_account_deletion() from public, anon;
grant execute on function public.get_privacy_center_snapshot() to authenticated;
grant execute on function public.set_privacy_preferences(text) to authenticated;
grant execute on function public.block_and_leave_couple() to authenticated;
grant execute on function public.unblock_former_partner(uuid) to authenticated;
grant execute on function public.request_account_export() to authenticated;
grant execute on function public.prepare_account_deletion() to authenticated;
revoke execute on function public.join_couple(text) from public, anon;
grant execute on function public.join_couple(text) to authenticated;

commit;
