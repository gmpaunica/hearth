-- Presence-only v2 calls must not advance a moment phase. Romantic shared time
-- begins only inside the validated `come_close` response transaction.

begin;

create or replace function public.move_to_moment(p_signal_id uuid)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  target public.moment_sessions;
  participant public.moment_participants;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select ms.* into target
  from public.moment_sessions ms
  join public.couples c on c.id = ms.couple_id
  where ms.signal_id = p_signal_id and uid in (c.member_a, c.member_b);
  if target.signal_id is null or target.terminal_at is not null then
    return false;
  end if;
  select * into participant from public.moment_participants
  where signal_id = target.signal_id and user_id = uid;

  if participant.participant_role = 'partner' and not coalesce((
      public.moment_response_moves_to_destination(target.destination, participant.response_action)
      or (
        target.destination = 'table'
        and participant.response_action = 'talk_later'
        and target.scheduled_for <= now()
      )
    ), false) then
    raise exception 'That response does not enter this destination';
  end if;
  if target.destination in ('garden', 'rest') and participant.participant_role = 'partner' then
    raise exception 'This destination remains private for the author';
  end if;

  perform public.move_interaction_presence_internal(uid, target.couple_id, target.signal_id);
  return true;
end;
$$;

commit;
