-- A return delegates to the presence-only move first. If the moment is already
-- terminal, preserve the participant row and report the idempotent no-op.

begin;

create or replace function public.return_to_moment(p_signal_id uuid)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  uid uuid := auth.uid();
  was_present boolean;
  moved boolean;
begin
  select exists (
    select 1 from public.signal_presence
    where signal_id = p_signal_id and user_id = uid and is_current
  ) into was_present;

  moved := public.move_to_moment(p_signal_id);
  if not moved then
    return false;
  end if;
  if not was_present then
    update public.moment_participants
    set returned_at = coalesce(returned_at, now()),
        updated_at = now()
    where signal_id = p_signal_id and user_id = uid;
  end if;
  return true;
end;
$$;

commit;
