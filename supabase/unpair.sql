-- Hearth — privacy-safe leaving / unpairing
--
-- Safe to re-run. Leaving destroys the departed membership epoch: shared
-- signals, responses, drawings, and queued notifications are removed before a
-- surviving member can invite somebody else. Every surviving invite code is
-- rotated so a previously shared code cannot be reused, and the home age resets
-- so a future relationship starts a new progression epoch.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.new_invite_code()
returns text language plpgsql security definer volatile
set search_path = pg_catalog, public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  random_bytes bytea;
  candidate text;
  byte_index integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('hearth-invite-code', 0));
  loop
    random_bytes := gen_random_bytes(6);
    candidate := '';
    for byte_index in 0..5 loop
      candidate := candidate || substr(
        alphabet,
        (get_byte(random_bytes, byte_index) % length(alphabet)) + 1,
        1
      );
    end loop;
    exit when not exists (
      select 1 from public.couples where invite_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

create or replace function public.leave_couple()
returns void language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare
  uid uuid := auth.uid();
  home public.couples;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  -- Loop repairs identities that were accidentally admitted to multiple homes
  -- before the one-home invariant was enforced.
  for home in
    select * from public.couples
    where member_a = uid or member_b = uid
    order by created_at
    for update
  loop
    -- Relationship history must never become visible to a replacement member.
    -- Responses and notification_outbox rows cascade from signals.
    delete from public.signals where couple_id = home.id;
    if to_regclass('public.drawings') is not null then
      execute 'delete from public.drawings where couple_id = $1' using home.id;
    end if;

    if home.member_b = uid then
      update public.couples
      set member_b = null,
          invite_code = public.new_invite_code(),
          created_at = now()
      where id = home.id;
    elsif home.member_a = uid then
      if home.member_b is null then
        delete from public.couples where id = home.id;
      else
        update public.couples
        set member_a = home.member_b,
            member_b = null,
            invite_code = public.new_invite_code(),
            created_at = now()
        where id = home.id;
      end if;
    end if;
  end loop;
end;
$$;

revoke execute on function public.new_invite_code() from public, anon, authenticated;
revoke execute on function public.leave_couple() from public;
revoke execute on function public.leave_couple() from anon;
grant execute on function public.leave_couple() to authenticated;
