-- Preserve confirmed notes in today's typed outcomes. This is especially
-- important for Sofa care and remote Romantic responses, which close in the
-- same transaction as the response.

begin;

alter function public.get_moment_snapshot_v2()
  rename to get_moment_snapshot_v2_base;

revoke execute on function public.get_moment_snapshot_v2_base()
  from public, anon, authenticated;

create function public.get_moment_snapshot_v2()
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  home_id uuid;
  base jsonb;
  outcomes jsonb;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  base := public.get_moment_snapshot_v2_base();
  select c.id into home_id
  from public.couples c
  where uid in (c.member_a, c.member_b)
  order by c.created_at desc
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'signal_id', ms.signal_id,
    'destination', ms.destination,
    'intent', ms.intent,
    'author_id', ms.author_id,
    'response_action', partner.response_action,
    'terminal_reason', ms.terminal_reason,
    'completed_at', ms.terminal_at,
    'completion_event_id', ms.completion_event_id,
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', mp.user_id,
        'role', mp.participant_role,
        'note', mp.note,
        'note_removed', mp.note_removed_at is not null
      ) order by mp.participant_role)
      from public.moment_participants mp
      where mp.signal_id = ms.signal_id
        and (mp.note is not null or mp.note_removed_at is not null)
    ), '[]'::jsonb)
  ) order by ms.terminal_at desc), '[]'::jsonb)
  into outcomes
  from public.moment_sessions ms
  left join public.moment_participants partner
    on partner.signal_id = ms.signal_id
   and partner.participant_role = 'partner'
  where ms.couple_id = home_id
    and ms.terminal_at >= date_trunc('day', now())
    and ms.terminal_reason <> 'withdrawn';

  return jsonb_set(base, '{today_outcomes}', outcomes, false);
end;
$$;

revoke execute on function public.get_moment_snapshot_v2() from public, anon;
grant execute on function public.get_moment_snapshot_v2() to authenticated;

commit;
