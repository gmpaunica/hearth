-- Hearth — leaving a home / unpairing (Phase 7)
--
-- Run once in the Supabase dashboard: SQL Editor → paste → Run. Safe to re-run.
--
-- leave_couple() lets the signed-in user leave their couple gracefully:
--   • The joiner (member_b) leaves  → the host keeps the home, back to waiting
--     with the same invite code.
--   • The host (member_a) leaves and a partner remains → the partner is promoted
--     to keep the home (so no one is stranded), back to waiting.
--   • The host leaves a solo home (no partner yet) → the home is dissolved.
-- Open signals are resolved first so the remaining person's room resets.
--
-- SECURITY DEFINER so it can adjust the couples row, but it only ever touches a
-- couple the caller actually belongs to (scoped by auth.uid()).

create or replace function public.leave_couple()
returns void language plpgsql security definer
set search_path = public as $$
declare c public.couples;
begin
  select * into c from public.couples
    where member_a = auth.uid() or member_b = auth.uid()
    limit 1;
  if c.id is null then
    return; -- not in a couple; nothing to do
  end if;

  -- Reset the shared room.
  update public.signals set resolved_at = now()
    where couple_id = c.id and resolved_at is null;

  if c.member_b = auth.uid() then
    update public.couples set member_b = null where id = c.id;
  elsif c.member_a = auth.uid() then
    if c.member_b is null then
      delete from public.couples where id = c.id;
    else
      update public.couples set member_a = c.member_b, member_b = null
        where id = c.id;
    end if;
  end if;
end;
$$;
