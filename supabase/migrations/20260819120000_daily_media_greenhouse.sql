-- Hearth daily record, prompted photo, Diary, and persistent Memory Greenhouse.
--
-- Media objects live in the private `daily-media` Storage bucket. Postgres owns
-- prompt/slot/visibility truth; object deletion is queued here and performed by
-- the cleanup-daily-media Edge Function through the Storage API.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Prompt pack ----------------------------------------------------------------

create table if not exists public.daily_prompts (
  id             uuid primary key default gen_random_uuid(),
  medium         text not null check (medium in ('voice', 'photo')),
  pack_position  smallint not null check (pack_position between 1 and 30),
  prompt         text not null check (char_length(prompt) between 1 and 240),
  created_at     timestamptz not null default now(),
  unique (medium, pack_position),
  unique (medium, prompt)
);

insert into public.daily_prompts (medium, pack_position, prompt) values
  ('photo', 1, 'Photograph something nearby that reminds you of us.'),
  ('photo', 2, 'Find the silliest object within reach.'),
  ('photo', 3, 'Show the coziest thing you can see.'),
  ('photo', 4, 'Photograph a color that feels like us today.'),
  ('photo', 5, 'Show something small you would share with me.'),
  ('photo', 6, 'Find a shape that almost looks like a heart.'),
  ('photo', 7, 'Make your snack or drink look like a five-star meal.'),
  ('photo', 8, 'Photograph something you think I would notice first.'),
  ('photo', 9, 'Show the most charmingly chaotic little corner near you.'),
  ('photo', 10, 'Find an object that matches my vibe.'),
  ('photo', 11, 'Show the view you wish I could see beside you.'),
  ('photo', 12, 'Photograph something ordinary you are fond of.'),
  ('photo', 13, 'Recreate one of our inside jokes with whatever is nearby.'),
  ('photo', 14, 'Show something that you think would make me laugh.'),
  ('photo', 15, 'Photograph one little thing that made today nicer.'),
  ('photo', 16, 'Find the cutest thing near you.'),
  ('photo', 17, 'Show something that belongs in our imaginary museum.'),
  ('photo', 18, 'Photograph an object that looks like it has a personality.'),
  ('photo', 19, 'Give an ordinary object a dramatic portrait.'),
  ('photo', 20, 'Show something you would give me a ridiculous nickname for.'),
  ('photo', 21, 'Photograph a texture you think I would want to touch.'),
  ('photo', 22, 'Show something that feels like a tiny celebration.'),
  ('photo', 23, 'Find two things that look like a couple.'),
  ('photo', 24, 'Show something you would save me the last bite of.'),
  ('photo', 25, 'Photograph your comfiest view right now.'),
  ('photo', 26, 'Find something matching one of our Hearth avatar colors.'),
  ('photo', 27, 'Show what “thinking of you” looks like without words.'),
  ('photo', 28, 'Photograph a tiny detail you want me to notice.'),
  ('photo', 29, 'Arrange two nearby objects as if they are on a date.'),
  ('photo', 30, 'Show the nearby thing most likely to make us laugh.'),
  ('voice', 1, 'Tell me one tiny thing about me that made you smile recently.'),
  ('voice', 2, 'Finish: “If you were here right now, we would…”'),
  ('voice', 3, 'Give our day a ridiculous movie title.'),
  ('voice', 4, 'Tell me one ordinary moment with me you would happily repeat.'),
  ('voice', 5, 'Describe me as a snack and defend your answer.'),
  ('voice', 6, 'Name one thing you are looking forward to doing together.'),
  ('voice', 7, 'Choose a fictional creature to be our pet and explain why.'),
  ('voice', 8, 'Finish: “A small thing I love about us is…”'),
  ('voice', 9, 'Give me a dramatic five-star review.'),
  ('voice', 10, 'Name a sound, smell, or place that reminds you of us.'),
  ('voice', 11, 'Choose our imaginary team name.'),
  ('voice', 12, 'Say the nicest true thing you can fit in one sentence.'),
  ('voice', 13, 'Tell me a funny memory of us in 30 seconds.'),
  ('voice', 14, 'Invent a tiny holiday just for us.'),
  ('voice', 15, 'Tell me what you would bring to a ten-minute picnic with me.'),
  ('voice', 16, 'Finish: “You make ordinary days better when…”'),
  ('voice', 17, 'Give me a ridiculous award and a tiny acceptance speech.'),
  ('voice', 18, 'Describe our ideal lazy Sunday in three details.'),
  ('voice', 19, 'Tell me one thing you wish I could see from where you are.'),
  ('voice', 20, 'Do a tiny impression you think only I will understand.'),
  ('voice', 21, 'Pick a song title for us today and say why.'),
  ('voice', 22, 'Tell me the smallest thing that feels romantic to you.'),
  ('voice', 23, 'Make up a one-sentence bedtime story starring us.'),
  ('voice', 24, 'Tell me something I do that feels like home.'),
  ('voice', 25, 'Plan a completely impractical five-minute date.'),
  ('voice', 26, 'Finish: “Today I wanted to tell you…”'),
  ('voice', 27, 'Tell me the most unserious reason we make a good team.'),
  ('voice', 28, 'Choose one memory of us to put in a snow globe.'),
  ('voice', 29, 'Say hello as if we have not met in a hundred years.'),
  ('voice', 30, 'Give future-us one tiny piece of advice.')
on conflict (medium, pack_position) do update set prompt = excluded.prompt;

create table if not exists public.daily_prompt_assignments (
  id               uuid primary key default gen_random_uuid(),
  couple_id        uuid not null references public.couples(id) on delete cascade,
  home_date        date not null,
  photo_prompt_id  uuid not null references public.daily_prompts(id),
  voice_prompt_id  uuid not null references public.daily_prompts(id),
  created_at       timestamptz not null default now(),
  unique (couple_id, home_date)
);

-- Immutable artifact slots ---------------------------------------------------

alter table if exists public.drawings
  add column if not exists solo_owner_id uuid references public.profiles(id) on delete cascade;

create table if not exists public.daily_media (
  id                    uuid primary key,
  couple_id             uuid not null references public.couples(id) on delete cascade,
  author_id             uuid not null references public.profiles(id) on delete cascade,
  solo_owner_id         uuid references public.profiles(id) on delete cascade,
  prompt_assignment_id  uuid not null references public.daily_prompt_assignments(id),
  medium                text not null check (medium in ('voice', 'photo')),
  home_date             date not null,
  storage_path          text not null unique,
  mime_type             text not null,
  byte_size             integer not null check (byte_size > 0),
  duration_ms           integer,
  audio_channels        smallint,
  audio_bit_rate        integer,
  width                 integer,
  height                integer,
  submitted_at          timestamptz not null default now(),
  visibility_expires_at timestamptz,
  deleted_at            timestamptz,
  expired_at            timestamptz,
  check ((solo_owner_id is null) or (solo_owner_id = author_id)),
  check (
    (medium = 'voice' and duration_ms between 1 and 30000 and audio_channels = 1
      and audio_bit_rate = 64000 and width is null and height is null)
    or
    (medium = 'photo' and duration_ms is null and audio_channels is null
      and audio_bit_rate is null and width > 0 and height > 0 and width * 5 = height * 4)
  )
);

create unique index if not exists daily_media_shared_slot_unique
  on public.daily_media(couple_id, author_id, home_date, medium)
  where solo_owner_id is null;
create unique index if not exists daily_media_solo_slot_unique
  on public.daily_media(couple_id, author_id, home_date, medium, solo_owner_id)
  where solo_owner_id is not null;
create index if not exists daily_media_today_idx
  on public.daily_media(couple_id, home_date, medium, submitted_at);
create index if not exists daily_media_cleanup_idx
  on public.daily_media(visibility_expires_at)
  where medium = 'photo' and deleted_at is null and expired_at is null;

create table if not exists public.greenhouse_memories (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references public.couples(id) on delete cascade,
  home_date       date not null,
  solo_owner_id   uuid references public.profiles(id) on delete cascade,
  planted_at      timestamptz not null default now(),
  unplanted_at    timestamptz,
  check (unplanted_at is null or unplanted_at >= planted_at)
);

create unique index if not exists greenhouse_shared_day_unique
  on public.greenhouse_memories(couple_id, home_date)
  where solo_owner_id is null;
create unique index if not exists greenhouse_solo_day_unique
  on public.greenhouse_memories(couple_id, home_date, solo_owner_id)
  where solo_owner_id is not null;
create index if not exists greenhouse_page_idx
  on public.greenhouse_memories(couple_id, home_date desc, id)
  where unplanted_at is null;

create table if not exists private.daily_media_receipts (
  media_id          uuid not null references public.daily_media(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  receipt_kind      text not null check (receipt_kind in ('photo_viewed', 'voice_playback_started')),
  occurred_at       timestamptz not null default now(),
  primary key (media_id, recipient_user_id, receipt_kind)
);

create table if not exists private.deleted_drawing_slots (
  couple_id uuid not null,
  author_id uuid not null,
  home_date date not null,
  deleted_at timestamptz not null default now(),
  primary key (couple_id, author_id, home_date)
);

create table if not exists private.media_cleanup_jobs (
  id            uuid primary key default gen_random_uuid(),
  media_id      uuid references public.daily_media(id) on delete set null,
  bucket_id     text not null default 'daily-media',
  object_path   text not null,
  reason        text not null check (reason in ('expired', 'orphan', 'author_deleted', 'unplanted', 'departed')),
  status        text not null default 'pending' check (status in ('pending', 'processing', 'complete', 'permanent_failure')),
  attempts      integer not null default 0,
  available_at  timestamptz not null default now(),
  claimed_at    timestamptz,
  last_error    text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz,
  unique (bucket_id, object_path)
);

create table if not exists private.daily_media_notification_outbox (
  media_id       uuid primary key references public.daily_media(id) on delete cascade,
  couple_id      uuid not null,
  sender_user_id uuid not null,
  recipient_user_id uuid not null,
  surface        text not null check (surface in ('daily-record', 'daily-photo')),
  status         text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'permanent_failure')),
  attempts       integer not null default 0,
  available_at   timestamptz not null default now(),
  claimed_at     timestamptz,
  last_error     text,
  updated_at     timestamptz not null default now()
);

-- Shared home/date helpers ---------------------------------------------------

create or replace function private.home_context(p_uid uuid)
returns table(couple_id uuid, member_a uuid, member_b uuid, home_timezone text,
              home_date date, next_midnight timestamptz)
language sql security definer stable
set search_path = pg_catalog, public as $$
  select c.id, c.member_a, c.member_b, coalesce(c.home_timezone, 'UTC'),
         (statement_timestamp() at time zone coalesce(c.home_timezone, 'UTC'))::date,
         ((((statement_timestamp() at time zone coalesce(c.home_timezone, 'UTC'))::date + 1)::timestamp)
           at time zone coalesce(c.home_timezone, 'UTC'))
  from public.couples c
  where p_uid in (c.member_a, c.member_b)
  order by c.created_at desc
  limit 1
$$;

create or replace function private.ensure_daily_prompt_assignment(
  p_couple_id uuid,
  p_home_date date
)
returns public.daily_prompt_assignments
language plpgsql security definer volatile
set search_path = pg_catalog, public as $$
declare
  existing public.daily_prompt_assignments;
  selected_photo uuid;
  selected_voice uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_couple_id::text || ':' || p_home_date::text, 0));
  select * into existing from public.daily_prompt_assignments
  where couple_id = p_couple_id and home_date = p_home_date;
  if existing.id is not null then return existing; end if;

  select p.id into selected_photo
  from public.daily_prompts p
  where p.medium = 'photo'
    and not exists (
      select 1 from public.daily_prompt_assignments a
      where a.couple_id = p_couple_id
        and a.home_date >= p_home_date - 29
        and a.home_date < p_home_date
        and a.photo_prompt_id = p.id
    )
  order by md5(p_couple_id::text || p_home_date::text || p.id::text)
  limit 1;

  select p.id into selected_voice
  from public.daily_prompts p
  where p.medium = 'voice'
    and not exists (
      select 1 from public.daily_prompt_assignments a
      where a.couple_id = p_couple_id
        and a.home_date >= p_home_date - 29
        and a.home_date < p_home_date
        and a.voice_prompt_id = p.id
    )
  order by md5('voice:' || p_couple_id::text || p_home_date::text || p.id::text)
  limit 1;

  if selected_photo is null or selected_voice is null then
    raise exception 'The approved 30-day prompt pack is incomplete';
  end if;

  insert into public.daily_prompt_assignments(couple_id, home_date, photo_prompt_id, voice_prompt_id)
  values (p_couple_id, p_home_date, selected_photo, selected_voice)
  returning * into existing;
  return existing;
end;
$$;

create or replace function public.get_today_daily_media()
returns jsonb language plpgsql security definer volatile
set search_path = pg_catalog, public, private as $$
declare
  uid uuid := auth.uid();
  home record;
  assignment public.daily_prompt_assignments;
  photo_prompt text;
  voice_prompt text;
  submissions jsonb;
  planted boolean;
  planting_final boolean;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into home from private.home_context(uid);
  if home.couple_id is null or home.member_b is null then
    raise exception 'A paired home is required' using errcode = '42501';
  end if;
  assignment := private.ensure_daily_prompt_assignment(home.couple_id, home.home_date);
  select prompt into photo_prompt from public.daily_prompts where id = assignment.photo_prompt_id;
  select prompt into voice_prompt from public.daily_prompts where id = assignment.voice_prompt_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', dm.id,
    'author_id', dm.author_id,
    'medium', dm.medium,
    'home_date', dm.home_date,
    'storage_path', dm.storage_path,
    'mime_type', dm.mime_type,
    'byte_size', dm.byte_size,
    'duration_ms', dm.duration_ms,
    'width', dm.width,
    'height', dm.height,
    'submitted_at', dm.submitted_at,
    'receipt', case when dm.author_id = uid then null else (
      select r.occurred_at from private.daily_media_receipts r
      where r.media_id = dm.id and r.recipient_user_id = uid
        and r.receipt_kind = case when dm.medium = 'photo' then 'photo_viewed' else 'voice_playback_started' end
    ) end
  ) order by dm.submitted_at), '[]'::jsonb) into submissions
  from public.daily_media dm
  where dm.couple_id = home.couple_id
    and dm.home_date = home.home_date
    and dm.deleted_at is null and dm.expired_at is null
    and dm.solo_owner_id is null;

  select (gm.id is not null), (gm.unplanted_at is not null)
  into planted, planting_final
  from public.greenhouse_memories gm
  where gm.couple_id = home.couple_id and gm.home_date = home.home_date
    and gm.solo_owner_id is null
  order by gm.planted_at desc limit 1;

  return jsonb_build_object(
    'assignment_id', assignment.id,
    'home_date', home.home_date,
    'home_timezone', home.home_timezone,
    'next_refresh_at', home.next_midnight,
    'photo_prompt', photo_prompt,
    'voice_prompt', voice_prompt,
    'shared_prompt_copy', 'Today''s shared prompt — you both have the same one.',
    'submissions', submissions,
    'greenhouse_planted', coalesce(planted and not planting_final, false),
    'greenhouse_planting_final', coalesce(planting_final, false)
  );
end;
$$;

create or replace function public.finalize_daily_submission(
  p_assignment_id uuid,
  p_media_id uuid,
  p_medium text,
  p_storage_path text,
  p_mime_type text,
  p_byte_size integer,
  p_duration_ms integer default null,
  p_audio_channels smallint default null,
  p_audio_bit_rate integer default null,
  p_width integer default null,
  p_height integer default null
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, private, storage as $$
declare
  uid uuid := auth.uid();
  home record;
  assignment public.daily_prompt_assignments;
  expected_path text;
  expected_extension text;
  inserted_id uuid;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into home from private.home_context(uid);
  if home.couple_id is null or home.member_b is null then raise exception 'A paired home is required' using errcode = '42501'; end if;
  if p_medium not in ('voice', 'photo') then raise exception 'Invalid medium'; end if;

  select * into assignment from public.daily_prompt_assignments
  where id = p_assignment_id and couple_id = home.couple_id and home_date = home.home_date;
  if assignment.id is null then raise exception 'Prompt assignment is not today''s shared prompt'; end if;

  expected_extension := case when p_medium = 'photo' then '.jpg' else '.m4a' end;
  expected_path := home.couple_id::text || '/' || uid::text || '/' || p_medium || '/'
    || home.home_date::text || '/' || p_media_id::text || expected_extension;
  if p_storage_path <> expected_path then raise exception 'Invalid media object path'; end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'daily-media' and o.name = p_storage_path
  ) then raise exception 'Uploaded media object was not found'; end if;

  if p_medium = 'voice' then
    if p_mime_type not in ('audio/mp4', 'audio/m4a', 'audio/x-m4a')
       or p_byte_size > 768000 or p_duration_ms not between 1 and 30000
       or p_audio_channels <> 1 or p_audio_bit_rate <> 64000
       or p_width is not null or p_height is not null then
      raise exception 'Voice media does not meet the mono AAC/M4A limits';
    end if;
  else
    if p_mime_type <> 'image/jpeg' or p_byte_size > 3145728
       or p_width is null or p_height is null or p_width > 1600 or p_height > 2000
       or p_width * 5 <> p_height * 4 or p_duration_ms is not null
       or p_audio_channels is not null or p_audio_bit_rate is not null then
      raise exception 'Photo media does not meet the 4:5 JPEG limits';
    end if;
  end if;

  insert into public.daily_media(
    id, couple_id, author_id, prompt_assignment_id, medium, home_date,
    storage_path, mime_type, byte_size, duration_ms, audio_channels,
    audio_bit_rate, width, height, visibility_expires_at
  ) values (
    p_media_id, home.couple_id, uid, assignment.id, p_medium, home.home_date,
    p_storage_path, p_mime_type, p_byte_size, p_duration_ms, p_audio_channels,
    p_audio_bit_rate, p_width, p_height,
    case when p_medium = 'photo' then home.next_midnight else null end
  ) returning id into inserted_id;
  return inserted_id;
exception when unique_violation then
  raise exception 'Today''s submission slot is already finalized';
end;
$$;

create or replace function public.mark_daily_media_received(p_media_id uuid, p_kind text)
returns timestamptz language plpgsql security definer
set search_path = pg_catalog, public, private as $$
declare
  uid uuid := auth.uid();
  media public.daily_media;
  occurred timestamptz;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select dm.* into media from public.daily_media dm
  join public.couples c on c.id = dm.couple_id
  where dm.id = p_media_id and uid in (c.member_a, c.member_b)
    and dm.author_id <> uid and dm.deleted_at is null and dm.expired_at is null
    and (dm.solo_owner_id is null or dm.solo_owner_id = uid);
  if media.id is null then raise exception 'Media is not available' using errcode = '42501'; end if;
  if (media.medium = 'photo' and p_kind <> 'photo_viewed')
     or (media.medium = 'voice' and p_kind <> 'voice_playback_started') then
    raise exception 'Receipt kind does not match media';
  end if;
  if media.medium = 'photo' and statement_timestamp() >= media.visibility_expires_at
     and not exists (
       select 1 from public.greenhouse_memories gm
       where gm.couple_id = media.couple_id and gm.home_date = media.home_date
         and gm.unplanted_at is null
         and (gm.solo_owner_id is null or gm.solo_owner_id = uid)
     ) then raise exception 'Photo has expired'; end if;

  insert into private.daily_media_receipts(media_id, recipient_user_id, receipt_kind)
  values (media.id, uid, p_kind)
  on conflict (media_id, recipient_user_id, receipt_kind)
  do update set occurred_at = private.daily_media_receipts.occurred_at
  returning occurred_at into occurred;
  return occurred;
end;
$$;

create or replace function public.plant_photo_day(p_home_date date)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, private as $$
declare
  uid uuid := auth.uid();
  home record;
  memory public.greenhouse_memories;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into home from private.home_context(uid);
  if p_home_date <> home.home_date then raise exception 'Only today can be planted'; end if;
  if not exists (
    select 1 from public.daily_media dm
    where dm.couple_id = home.couple_id and dm.home_date = home.home_date
      and dm.medium = 'photo' and dm.deleted_at is null and dm.expired_at is null
      and dm.solo_owner_id is null
  ) then raise exception 'There is no photo to plant'; end if;

  select * into memory from public.greenhouse_memories
  where couple_id = home.couple_id and home_date = home.home_date and solo_owner_id is null;
  if memory.unplanted_at is not null then raise exception 'This photo-day was permanently unplanted'; end if;
  if memory.id is not null then return memory.id; end if;
  insert into public.greenhouse_memories(couple_id, home_date)
  values (home.couple_id, home.home_date) returning * into memory;
  return memory.id;
end;
$$;

create or replace function private.queue_media_object(
  p_media_id uuid, p_path text, p_reason text
)
returns void language plpgsql security definer
set search_path = pg_catalog, private as $$
begin
  insert into private.media_cleanup_jobs(media_id, object_path, reason)
  values (p_media_id, p_path, p_reason)
  on conflict (bucket_id, object_path) do update set
    reason = excluded.reason,
    status = case when private.media_cleanup_jobs.status = 'complete' then 'complete' else 'pending' end,
    available_at = case when private.media_cleanup_jobs.status = 'complete'
      then private.media_cleanup_jobs.available_at else now() end;
end;
$$;

create or replace function public.unplant_photo_day(p_home_date date)
returns void language plpgsql security definer
set search_path = pg_catalog, public, private as $$
declare
  uid uuid := auth.uid();
  home record;
  memory public.greenhouse_memories;
  item record;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into home from private.home_context(uid);
  select * into memory from public.greenhouse_memories gm
  where gm.couple_id = home.couple_id and gm.home_date = p_home_date
    and gm.unplanted_at is null
    and (gm.solo_owner_id is null or gm.solo_owner_id = uid)
  for update;
  if memory.id is null then raise exception 'Greenhouse memory not found'; end if;
  update public.greenhouse_memories set unplanted_at = now() where id = memory.id;
  for item in
    update public.daily_media dm set deleted_at = coalesce(dm.deleted_at, now())
    where dm.couple_id = home.couple_id and dm.home_date = p_home_date
      and dm.medium = 'photo' and dm.deleted_at is null
      and (dm.solo_owner_id is null or dm.solo_owner_id = uid)
    returning dm.id, dm.storage_path
  loop perform private.queue_media_object(item.id, item.storage_path, 'unplanted'); end loop;
end;
$$;

create or replace function public.delete_daily_artifact(p_kind text, p_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, private as $$
declare
  uid uuid := auth.uid();
  media public.daily_media;
  drawing public.drawings;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_kind in ('voice', 'photo') then
    select * into media from public.daily_media
    where id = p_id and author_id = uid and medium = p_kind for update;
    if media.id is null then raise exception 'Artifact not found' using errcode = '42501'; end if;
    if media.deleted_at is null then
      update public.daily_media set deleted_at = now() where id = media.id;
      perform private.queue_media_object(media.id, media.storage_path, 'author_deleted');
    end if;
    if p_kind = 'photo' and not exists (
      select 1 from public.daily_media other
      where other.couple_id = media.couple_id and other.home_date = media.home_date
        and other.medium = 'photo' and other.deleted_at is null and other.expired_at is null
    ) then
      update public.greenhouse_memories set unplanted_at = coalesce(unplanted_at, now())
      where couple_id = media.couple_id and home_date = media.home_date;
    end if;
  elsif p_kind = 'sketch' then
    select * into drawing from public.drawings where id = p_id and from_user = uid for update;
    if drawing.id is null then raise exception 'Artifact not found' using errcode = '42501'; end if;
    insert into private.deleted_drawing_slots(couple_id, author_id, home_date)
    values (drawing.couple_id, uid, drawing.day) on conflict do nothing;
    delete from public.drawings where id = drawing.id;
  else raise exception 'Invalid artifact kind';
  end if;
end;
$$;

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

create or replace function public.get_greenhouse_page(
  p_before_date date default null,
  p_limit integer default 12
)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog, public, private as $$
declare
  uid uuid := auth.uid();
  home record;
  result jsonb;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_limit not between 1 and 24 then raise exception 'Greenhouse page size must be between 1 and 24'; end if;
  select * into home from private.home_context(uid);
  with page as (
    select gm.* from public.greenhouse_memories gm
    where gm.couple_id = home.couple_id and gm.unplanted_at is null
      and (gm.solo_owner_id is null or gm.solo_owner_id = uid)
      and (p_before_date is null or gm.home_date < p_before_date)
    order by gm.home_date desc limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', page.id, 'home_date', page.home_date, 'planted_at', page.planted_at,
    'photos', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', dm.id, 'author_id', dm.author_id, 'storage_path', dm.storage_path,
      'mime_type', dm.mime_type, 'width', dm.width, 'height', dm.height,
      'submitted_at', dm.submitted_at
    ) order by dm.submitted_at), '[]'::jsonb) from public.daily_media dm
      where dm.couple_id = page.couple_id and dm.home_date = page.home_date
        and dm.medium = 'photo' and dm.deleted_at is null and dm.expired_at is null
        and (dm.solo_owner_id is null or dm.solo_owner_id = uid))
  ) order by page.home_date desc), '[]'::jsonb) into result from page;
  return result;
end;
$$;

-- Cleanup queue and Storage-API worker ---------------------------------------

create or replace function private.enqueue_due_daily_media_cleanup()
returns integer language plpgsql security definer
set search_path = pg_catalog, public, private, storage as $$
declare
  item record;
  queued integer := 0;
  orphan_count integer := 0;
begin
  for item in
    update public.daily_media dm set expired_at = now()
    where dm.medium = 'photo' and dm.deleted_at is null and dm.expired_at is null
      and dm.visibility_expires_at <= now()
      and not exists (
        select 1 from public.greenhouse_memories gm
        where gm.couple_id = dm.couple_id and gm.home_date = dm.home_date
          and gm.unplanted_at is null
          and (gm.solo_owner_id is not distinct from dm.solo_owner_id)
      )
    returning dm.id, dm.storage_path
  loop
    perform private.queue_media_object(item.id, item.storage_path, 'expired');
    queued := queued + 1;
  end loop;

  insert into private.media_cleanup_jobs(media_id, bucket_id, object_path, reason)
  select null, 'daily-media', o.name, 'orphan'
  from storage.objects o
  where o.bucket_id = 'daily-media' and o.created_at < now() - interval '1 hour'
    and not exists (select 1 from public.daily_media dm where dm.storage_path = o.name)
  on conflict (bucket_id, object_path) do nothing;
  get diagnostics orphan_count = row_count;
  queued := queued + orphan_count;
  return queued;
end;
$$;

create or replace function public.claim_daily_media_cleanup_jobs(p_limit integer default 25)
returns table(job_id uuid, bucket_id text, object_path text, attempt integer)
language plpgsql security definer
set search_path = pg_catalog, private as $$
begin
  perform private.enqueue_due_daily_media_cleanup();
  return query
  with candidates as (
    select j.id from private.media_cleanup_jobs j
    where j.attempts < 8 and j.available_at <= now()
      and (j.status = 'pending' or (j.status = 'processing' and j.claimed_at < now() - interval '10 minutes'))
    order by j.available_at, j.created_at
    for update skip locked limit least(greatest(p_limit, 1), 50)
  ), claimed as (
    update private.media_cleanup_jobs j set
      status = 'processing', attempts = attempts + 1, claimed_at = now(), last_error = null
    from candidates c where j.id = c.id
    returning j.id, j.bucket_id, j.object_path, j.attempts
  ) select claimed.id, claimed.bucket_id, claimed.object_path, claimed.attempts from claimed;
end;
$$;

create or replace function public.complete_daily_media_cleanup_job(p_job_id uuid, p_attempt integer)
returns void language plpgsql security definer
set search_path = pg_catalog, private as $$
begin
  update private.media_cleanup_jobs set status = 'complete', completed_at = now(), claimed_at = null
  where id = p_job_id and status = 'processing' and attempts = p_attempt;
  if not found then raise exception 'Cleanup lease is stale'; end if;
end;
$$;

create or replace function public.release_daily_media_cleanup_job(
  p_job_id uuid, p_attempt integer, p_error text
)
returns void language plpgsql security definer
set search_path = pg_catalog, private as $$
begin
  update private.media_cleanup_jobs set
    status = case when attempts >= 8 then 'permanent_failure' else 'pending' end,
    available_at = now() + make_interval(secs => least(3600, 15 * (2 ^ least(attempts, 8))::integer)),
    claimed_at = null, last_error = left(coalesce(p_error, 'unknown cleanup error'), 500)
  where id = p_job_id and status = 'processing' and attempts = p_attempt;
  if not found then raise exception 'Cleanup lease is stale'; end if;
end;
$$;

create or replace function public.dispatch_daily_media_cleanup()
returns bigint language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare webhook_secret text; request_id bigint;
begin
  select decrypted_secret into webhook_secret from vault.decrypted_secrets
  where name = 'hearth_notify_webhook_secret' limit 1;
  if nullif(webhook_secret, '') is null then return null; end if;
  select net.http_post(
    url := 'https://gtdigidqsczptqpbplar.supabase.co/functions/v1/cleanup-daily-media',
    headers := jsonb_build_object('Content-Type','application/json','x-hearth-webhook-secret',webhook_secret),
    body := jsonb_build_object('action','cleanup'), timeout_milliseconds := 55000
  ) into request_id;
  return request_id;
exception when others then raise warning 'Daily media cleanup dispatch deferred: %', sqlerrm; return null;
end;
$$;

-- Generic media notifications ------------------------------------------------

create or replace function private.queue_daily_media_notification()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private, extensions as $$
declare recipient uuid;
begin
  select case when c.member_a = new.author_id then c.member_b else c.member_a end into recipient
  from public.couples c where c.id = new.couple_id and new.author_id in (c.member_a, c.member_b);
  if recipient is null then return new; end if;
  insert into private.daily_media_notification_outbox(
    media_id, couple_id, sender_user_id, recipient_user_id, surface
  ) values (
    new.id, new.couple_id, new.author_id, recipient,
    case when new.medium = 'voice' then 'daily-record' else 'daily-photo' end
  ) on conflict (media_id) do nothing;
  perform public.dispatch_daily_media_notification(new.id);
  return new;
end;
$$;

create or replace function public.claim_daily_media_notification(p_media_id uuid)
returns table(media_id uuid, couple_id uuid, recipient_user_id uuid, push_token text,
              push_epoch bigint, surface text, attempt integer)
language plpgsql security definer
set search_path = pg_catalog, public, private as $$
begin
  return query
  update private.daily_media_notification_outbox o set
    status = 'processing', attempts = attempts + 1, claimed_at = now(), updated_at = now()
  from public.profiles p, public.couples c
  where o.media_id = p_media_id and p.id = o.recipient_user_id and c.id = o.couple_id
    and o.recipient_user_id in (c.member_a, c.member_b)
    and o.sender_user_id in (c.member_a, c.member_b)
    and o.attempts < 6 and o.available_at <= now()
    and (o.status = 'pending' or (o.status = 'processing' and o.claimed_at < now() - interval '5 minutes'))
  returning o.media_id, o.couple_id, o.recipient_user_id, p.push_token,
            p.push_registration_epoch, o.surface, o.attempts;
end;
$$;

create or replace function public.complete_daily_media_notification(
  p_media_id uuid, p_attempt integer, p_error text default null
)
returns void language plpgsql security definer
set search_path = pg_catalog, private as $$
begin
  update private.daily_media_notification_outbox set
    status = case when p_error is null then 'sent' else 'permanent_failure' end,
    last_error = left(p_error, 500), claimed_at = null, updated_at = now()
  where media_id = p_media_id and status = 'processing' and attempts = p_attempt;
  if not found then raise exception 'Notification lease is stale'; end if;
end;
$$;

create or replace function public.release_daily_media_notification(
  p_media_id uuid, p_attempt integer, p_error text
)
returns void language plpgsql security definer
set search_path = pg_catalog, private as $$
begin
  update private.daily_media_notification_outbox set
    status = case when attempts >= 6 then 'permanent_failure' else 'pending' end,
    available_at = now() + make_interval(secs => least(900, 15 * (2 ^ least(attempts, 6))::integer)),
    claimed_at = null, last_error = left(p_error, 500), updated_at = now()
  where media_id = p_media_id and status = 'processing' and attempts = p_attempt;
  if not found then raise exception 'Notification lease is stale'; end if;
end;
$$;

create or replace function public.dispatch_daily_media_notification(p_media_id uuid)
returns bigint language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare webhook_secret text; request_id bigint;
begin
  select decrypted_secret into webhook_secret from vault.decrypted_secrets
  where name = 'hearth_notify_webhook_secret' limit 1;
  if nullif(webhook_secret, '') is null then return null; end if;
  select net.http_post(
    url := 'https://gtdigidqsczptqpbplar.supabase.co/functions/v1/notify-daily-media',
    headers := jsonb_build_object('Content-Type','application/json','x-hearth-webhook-secret',webhook_secret),
    body := jsonb_build_object('media_id',p_media_id), timeout_milliseconds := 10000
  ) into request_id;
  return request_id;
exception when others then raise warning 'Daily media notification dispatch deferred: %', sqlerrm; return null;
end;
$$;

create or replace function public.dispatch_due_daily_media_jobs()
returns void language plpgsql security definer
set search_path = pg_catalog, public, private as $$
declare item record;
begin
  perform public.dispatch_daily_media_cleanup();
  for item in select media_id from private.daily_media_notification_outbox
    where attempts < 6 and available_at <= now()
      and (status = 'pending' or (status = 'processing' and claimed_at < now() - interval '5 minutes'))
    order by available_at limit 25
  loop perform public.dispatch_daily_media_notification(item.media_id); end loop;
end;
$$;

-- Storage bucket and policies ------------------------------------------------

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('daily-media', 'daily-media', false, 3145728,
        array['image/jpeg','audio/mp4','audio/m4a','audio/x-m4a'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists daily_media_objects_insert on storage.objects;
create policy daily_media_objects_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'daily-media'
  and (storage.foldername(name))[2] = auth.uid()::text
  and (storage.foldername(name))[3] in ('voice','photo')
  and exists (
    select 1 from public.couples c
    where c.id::text = (storage.foldername(name))[1]
      and auth.uid() in (c.member_a, c.member_b)
      and c.member_b is not null
  )
  and name ~ ('^[0-9a-f-]{36}/' || auth.uid()::text || '/(voice|photo)/[0-9]{4}-[0-9]{2}-[0-9]{2}/[0-9a-f-]{36}\.(m4a|jpg)$')
);

drop policy if exists daily_media_objects_select on storage.objects;
create policy daily_media_objects_select on storage.objects for select to authenticated
using (
  bucket_id = 'daily-media' and exists (
    select 1 from public.daily_media dm join public.couples c on c.id = dm.couple_id
    where dm.storage_path = name and auth.uid() in (c.member_a, c.member_b)
      and dm.deleted_at is null and dm.expired_at is null
      and (dm.solo_owner_id is null or dm.solo_owner_id = auth.uid())
      and (
        dm.medium = 'voice' or dm.visibility_expires_at > now() or exists (
          select 1 from public.greenhouse_memories gm
          where gm.couple_id = dm.couple_id and gm.home_date = dm.home_date
            and gm.unplanted_at is null
            and (gm.solo_owner_id is null or gm.solo_owner_id = auth.uid())
        )
      )
  )
);

drop policy if exists daily_media_objects_delete on storage.objects;
create policy daily_media_objects_delete on storage.objects for delete to authenticated
using (bucket_id = 'daily-media' and (storage.foldername(name))[2] = auth.uid()::text);

-- Drawings retain their Sketchbook slot after author deletion.
create or replace function public.drawing_slot_is_open(p_couple_id uuid, p_author_id uuid, p_day date)
returns boolean language sql security definer stable
set search_path = pg_catalog, private as $$
  select not exists (
    select 1 from private.deleted_drawing_slots t
    where t.couple_id = p_couple_id and t.author_id = p_author_id and t.home_date = p_day
  )
$$;

drop policy if exists drawings_select on public.drawings;
create policy drawings_select on public.drawings for select to authenticated
using (public.is_couple_member(couple_id) and (solo_owner_id is null or solo_owner_id = auth.uid()));
drop policy if exists drawings_insert on public.drawings;
create policy drawings_insert on public.drawings for insert to authenticated
with check (public.is_couple_member(couple_id) and from_user = auth.uid()
  and solo_owner_id is null and public.drawing_slot_is_open(couple_id, from_user, day));
drop policy if exists drawings_update on public.drawings;
create policy drawings_update on public.drawings for update to authenticated
using (from_user = auth.uid() and public.is_couple_member(couple_id)
  and public.drawing_slot_is_open(couple_id, from_user, day))
with check (from_user = auth.uid() and public.is_couple_member(couple_id)
  and public.drawing_slot_is_open(couple_id, from_user, day));

-- Unpairing immediately hides/deletes the departing person's artifacts while
-- preserving survivor-owned memories as private solo history.
create or replace function public.leave_couple()
returns void language plpgsql security definer
set search_path = pg_catalog, public, private, extensions as $$
declare
  uid uuid := auth.uid();
  home public.couples;
  survivor uuid;
  item record;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  for home in select * from public.couples where member_a = uid or member_b = uid
    order by created_at for update
  loop
    survivor := case when home.member_a = uid then home.member_b else home.member_a end;
    delete from public.signals where couple_id = home.id;

    for item in
      update public.daily_media set deleted_at = coalesce(deleted_at, now())
      where couple_id = home.id and author_id = uid
      returning id, storage_path
    loop perform private.queue_media_object(item.id, item.storage_path, 'departed'); end loop;

    if survivor is null then
      for item in select id, storage_path from public.daily_media
        where couple_id = home.id and deleted_at is null
      loop perform private.queue_media_object(item.id, item.storage_path, 'departed'); end loop;
      delete from public.couples where id = home.id;
    else
      update public.daily_media set solo_owner_id = survivor
      where couple_id = home.id and author_id = survivor and deleted_at is null;
      if to_regclass('public.drawings') is not null then
        delete from public.drawings where couple_id = home.id and from_user = uid;
        update public.drawings set solo_owner_id = survivor
        where couple_id = home.id and from_user = survivor;
      end if;
      update public.greenhouse_memories gm set solo_owner_id = survivor
      where gm.couple_id = home.id and gm.unplanted_at is null and exists (
        select 1 from public.daily_media dm
        where dm.couple_id = gm.couple_id and dm.home_date = gm.home_date
          and dm.author_id = survivor and dm.deleted_at is null and dm.expired_at is null
      );
      update public.greenhouse_memories gm set unplanted_at = coalesce(unplanted_at, now())
      where gm.couple_id = home.id and not exists (
        select 1 from public.daily_media dm
        where dm.couple_id = gm.couple_id and dm.home_date = gm.home_date
          and dm.deleted_at is null and dm.expired_at is null
      );

      if home.member_b = uid then
        update public.couples set member_b = null, invite_code = public.new_invite_code(), created_at = now()
        where id = home.id;
      else
        update public.couples set member_a = survivor, member_b = null,
          invite_code = public.new_invite_code(), created_at = now()
        where id = home.id;
      end if;
    end if;
  end loop;
end;
$$;

-- RLS, API surface, Realtime, and cron ---------------------------------------

alter table public.daily_prompts enable row level security;
alter table public.daily_prompt_assignments enable row level security;
alter table public.daily_media enable row level security;
alter table public.greenhouse_memories enable row level security;

drop policy if exists daily_prompt_assignments_select on public.daily_prompt_assignments;
create policy daily_prompt_assignments_select on public.daily_prompt_assignments for select to authenticated
using (public.is_couple_member(couple_id));
drop policy if exists daily_media_select on public.daily_media;
create policy daily_media_select on public.daily_media for select to authenticated
using (
  public.is_couple_member(couple_id) and deleted_at is null and expired_at is null
  and (solo_owner_id is null or solo_owner_id = auth.uid())
  and (
    medium = 'voice' or visibility_expires_at > now() or exists (
      select 1 from public.greenhouse_memories gm
      where gm.couple_id = daily_media.couple_id and gm.home_date = daily_media.home_date
        and gm.unplanted_at is null
        and (gm.solo_owner_id is null or gm.solo_owner_id = auth.uid())
    )
  )
);
drop policy if exists greenhouse_memories_select on public.greenhouse_memories;
create policy greenhouse_memories_select on public.greenhouse_memories for select to authenticated
using (public.is_couple_member(couple_id) and unplanted_at is null
  and (solo_owner_id is null or solo_owner_id = auth.uid()));

revoke all on table public.daily_prompts from public, anon, authenticated;
revoke all on table public.daily_prompt_assignments from public, anon, authenticated;
revoke all on table public.daily_media from public, anon, authenticated;
revoke all on table public.greenhouse_memories from public, anon, authenticated;
grant select on table public.daily_prompt_assignments, public.daily_media, public.greenhouse_memories to authenticated;

revoke execute on function public.get_today_daily_media() from public, anon;
revoke execute on function public.finalize_daily_submission(uuid,uuid,text,text,text,integer,integer,smallint,integer,integer,integer) from public, anon;
revoke execute on function public.mark_daily_media_received(uuid,text) from public, anon;
revoke execute on function public.plant_photo_day(date) from public, anon;
revoke execute on function public.unplant_photo_day(date) from public, anon;
revoke execute on function public.delete_daily_artifact(text,uuid) from public, anon;
revoke execute on function public.get_diary_page(date,integer) from public, anon;
revoke execute on function public.get_greenhouse_page(date,integer) from public, anon;
grant execute on function public.get_today_daily_media() to authenticated;
grant execute on function public.finalize_daily_submission(uuid,uuid,text,text,text,integer,integer,smallint,integer,integer,integer) to authenticated;
grant execute on function public.mark_daily_media_received(uuid,text) to authenticated;
grant execute on function public.plant_photo_day(date) to authenticated;
grant execute on function public.unplant_photo_day(date) to authenticated;
grant execute on function public.delete_daily_artifact(text,uuid) to authenticated;
grant execute on function public.get_diary_page(date,integer) to authenticated;
grant execute on function public.get_greenhouse_page(date,integer) to authenticated;
grant execute on function public.drawing_slot_is_open(uuid,uuid,date) to authenticated;

revoke execute on function public.claim_daily_media_cleanup_jobs(integer) from public, anon, authenticated;
revoke execute on function public.complete_daily_media_cleanup_job(uuid,integer) from public, anon, authenticated;
revoke execute on function public.release_daily_media_cleanup_job(uuid,integer,text) from public, anon, authenticated;
revoke execute on function public.claim_daily_media_notification(uuid) from public, anon, authenticated;
revoke execute on function public.complete_daily_media_notification(uuid,integer,text) from public, anon, authenticated;
revoke execute on function public.release_daily_media_notification(uuid,integer,text) from public, anon, authenticated;
grant execute on function public.claim_daily_media_cleanup_jobs(integer) to service_role;
grant execute on function public.complete_daily_media_cleanup_job(uuid,integer) to service_role;
grant execute on function public.release_daily_media_cleanup_job(uuid,integer,text) to service_role;
grant execute on function public.claim_daily_media_notification(uuid) to service_role;
grant execute on function public.complete_daily_media_notification(uuid,integer,text) to service_role;
grant execute on function public.release_daily_media_notification(uuid,integer,text) to service_role;

revoke execute on function private.home_context(uuid) from public, anon, authenticated;
revoke execute on function private.ensure_daily_prompt_assignment(uuid,date) from public, anon, authenticated;
revoke execute on function private.queue_media_object(uuid,text,text) from public, anon, authenticated;
revoke execute on function private.enqueue_due_daily_media_cleanup() from public, anon, authenticated;
revoke execute on function private.queue_daily_media_notification() from public, anon, authenticated;
revoke execute on function public.dispatch_daily_media_cleanup() from public, anon, authenticated;
revoke execute on function public.dispatch_daily_media_notification(uuid) from public, anon, authenticated;
revoke execute on function public.dispatch_due_daily_media_jobs() from public, anon, authenticated;

drop trigger if exists on_daily_media_notification on public.daily_media;
create trigger on_daily_media_notification after insert on public.daily_media
for each row execute function private.queue_daily_media_notification();

alter table public.daily_media replica identity full;
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'daily_media'
  ) then alter publication supabase_realtime add table public.daily_media; end if;
end $$;

do $$ declare existing_job bigint; begin
  for existing_job in select jobid from cron.job where jobname = 'hearth-daily-media-jobs'
  loop perform cron.unschedule(existing_job); end loop;
  perform cron.schedule('hearth-daily-media-jobs', '* * * * *',
    'select public.dispatch_due_daily_media_jobs();');
end $$;

notify pgrst, 'reload schema';
