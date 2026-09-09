-- Hearth first-party, content-free product metrics.
-- Additive only. Do not deploy without the owner's explicit authorization.
--
-- Privacy invariant: one successful shared-home load may create at most one
-- row per user, couple, and home day. Never add names, notes, media paths,
-- invite codes, Moment destinations, payloads, screen time, or navigation.

begin;

create table if not exists private.home_user_activity_days (
  activity_day date not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  recorded_at timestamptz not null default statement_timestamp(),
  primary key (activity_day, user_id, couple_id)
);

comment on table private.home_user_activity_days is
  'Content-free daily home presence only. No names, notes, media, invite codes, destinations, navigation, or screen time.';

create index if not exists home_user_activity_days_retention_idx
  on private.home_user_activity_days(activity_day);

alter table private.home_user_activity_days enable row level security;
revoke all on table private.home_user_activity_days from public, anon, authenticated;

create or replace function public.record_active_home_day()
returns jsonb language plpgsql security definer volatile
set search_path = pg_catalog, public, private as $$
declare
  uid uuid := auth.uid();
  home record;
  inserted_count integer := 0;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into home from private.home_context(uid);
  if home.couple_id is null or home.member_b is null then
    return jsonb_build_object('recorded', false);
  end if;

  insert into private.home_user_activity_days(activity_day, user_id, couple_id)
  values (home.home_date, uid, home.couple_id)
  on conflict (activity_day, user_id, couple_id) do nothing;
  get diagnostics inserted_count = row_count;

  return jsonb_build_object(
    'recorded', true,
    'activity_day', home.home_date,
    'first_record_for_day', inserted_count = 1
  );
end
$$;

create or replace function private.purge_home_user_activity_days()
returns bigint language plpgsql security definer volatile
set search_path = pg_catalog, private as $$
declare
  removed bigint;
begin
  with expired as (
    delete from private.home_user_activity_days
    where activity_day < ((statement_timestamp() at time zone 'UTC')::date - 89)
    returning 1
  )
  select count(*) into removed from expired;
  return removed;
end
$$;

create or replace function private.get_content_free_product_metrics(
  p_start_day date default ((statement_timestamp() at time zone 'UTC')::date - 29),
  p_end_day date default (statement_timestamp() at time zone 'UTC')::date
)
returns table(
  metric_day date,
  active_users bigint,
  active_homes bigint,
  newly_paired_homes bigint,
  moments_started bigint,
  moments_completed bigint,
  sketches_created bigint,
  daily_media_created bigint
)
language plpgsql security definer stable
set search_path = pg_catalog, public, private as $$
begin
  if p_start_day is null or p_end_day is null
     or p_start_day > p_end_day
     or p_end_day - p_start_day > 365 then
    raise exception 'Invalid metric range' using errcode = '22023';
  end if;

  return query
  with days as (
    select generate_series(p_start_day, p_end_day, interval '1 day')::date as day
  )
  select
    days.day,
    (select count(distinct activity.user_id)
       from private.home_user_activity_days activity
      where activity.activity_day = days.day),
    (select count(distinct activity.couple_id)
       from private.home_user_activity_days activity
      where activity.activity_day = days.day),
    (select count(*) from public.couples couples
      where couples.paired_at is not null
        and couples.paired_at >= (days.day::timestamp at time zone 'UTC')
        and couples.paired_at < ((days.day + 1)::timestamp at time zone 'UTC')),
    (select count(*) from public.moment_sessions moments
      where moments.created_at >= (days.day::timestamp at time zone 'UTC')
        and moments.created_at < ((days.day + 1)::timestamp at time zone 'UTC')),
    (select count(*) from public.moment_sessions moments
      where moments.terminal_at >= (days.day::timestamp at time zone 'UTC')
        and moments.terminal_at < ((days.day + 1)::timestamp at time zone 'UTC')),
    (select count(*) from public.drawings drawings where drawings.day = days.day),
    (select count(*) from public.daily_media media where media.home_date = days.day)
  from days
  order by days.day;
end
$$;

revoke execute on function public.record_active_home_day() from public, anon;
grant execute on function public.record_active_home_day() to authenticated;

revoke execute on function private.purge_home_user_activity_days()
  from public, anon, authenticated;
revoke execute on function private.get_content_free_product_metrics(date,date)
  from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.purge_home_user_activity_days() to service_role;
grant execute on function private.get_content_free_product_metrics(date,date) to service_role;

do $$ declare existing_job bigint; begin
  for existing_job in
    select jobid from cron.job where jobname = 'hearth-content-free-metrics-retention'
  loop
    perform cron.unschedule(existing_job);
  end loop;
  perform cron.schedule(
    'hearth-content-free-metrics-retention',
    '41 3 * * *',
    'select private.purge_home_user_activity_days();'
  );
end $$;

notify pgrst, 'reload schema';
commit;
