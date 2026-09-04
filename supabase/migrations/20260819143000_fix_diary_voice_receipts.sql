-- Correct the Diary receipt projection discovered by linked schema lint after
-- the initial daily-media migration was applied.
create or replace function public.get_diary_page(
  p_before_date date default null,
  p_limit integer default 20
)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, private as $$
declare
  uid uuid := auth.uid();
  home record;
  result jsonb;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_limit not between 1 and 40 then raise exception 'Diary page size must be between 1 and 40'; end if;
  select * into home from private.home_context(uid);
  with dates as (
    select d.day as home_date from public.drawings d
    where d.couple_id = home.couple_id and (d.solo_owner_id is null or d.solo_owner_id = uid)
    union
    select dm.home_date from public.daily_media dm
    where dm.couple_id = home.couple_id and dm.medium = 'voice'
      and dm.deleted_at is null and dm.expired_at is null
      and (dm.solo_owner_id is null or dm.solo_owner_id = uid)
  ), page as (
    select home_date from dates
    where p_before_date is null or home_date < p_before_date
    order by home_date desc limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'home_date', page.home_date,
    'sketches', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id, 'author_id', d.from_user, 'grid', d.grid,
      'created_at', d.created_at, 'updated_at', d.updated_at
    ) order by d.created_at), '[]'::jsonb) from public.drawings d
      where d.couple_id = home.couple_id and d.day = page.home_date
        and (d.solo_owner_id is null or d.solo_owner_id = uid)),
    'voices', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', dm.id, 'author_id', dm.author_id, 'storage_path', dm.storage_path,
      'mime_type', dm.mime_type, 'duration_ms', dm.duration_ms,
      'submitted_at', dm.submitted_at,
      'receipt', (select r.occurred_at from private.daily_media_receipts r
        where r.media_id = dm.id and r.recipient_user_id = uid
          and r.receipt_kind = 'voice_playback_started')
    ) order by dm.submitted_at), '[]'::jsonb) from public.daily_media dm
      where dm.couple_id = home.couple_id and dm.home_date = page.home_date
        and dm.medium = 'voice' and dm.deleted_at is null and dm.expired_at is null
        and (dm.solo_owner_id is null or dm.solo_owner_id = uid))
  ) order by page.home_date desc), '[]'::jsonb) into result from page;
  return result;
end;
$$;
