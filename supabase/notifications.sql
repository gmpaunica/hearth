-- Hearth — authenticated, durable signal push notifications
--
-- Prerequisites (never commit the value):
--   1. Vault secret `hearth_notify_webhook_secret` with 32+ random bytes.
--   2. Matching Edge secret `HEARTH_WEBHOOK_SECRET`.
--   3. Deploy: supabase functions deploy notify-signal --no-verify-jwt
--
-- The outbox is inserted in the signal transaction. pg_net dispatches quickly;
-- pg_cron recovers failed/stale sends and checks Expo delivery receipts.

begin;

create extension if not exists pg_net with schema extensions;
-- Supabase manages pg_cron's own `cron` schema; forcing pg_catalog prevents a
-- first-time install on current projects.
create extension if not exists pg_cron;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'hearth_notify_webhook_secret'
      and nullif(decrypted_secret, '') is not null
  ) then
    raise exception 'Missing Vault secret: hearth_notify_webhook_secret';
  end if;
end;
$$;

-- Retire the legacy public webhook trigger/function before installing the private
-- outbox trigger. The containing migration is transactional.
drop trigger if exists on_signal_created on public.signals;
drop trigger if exists on_signal_notify on public.signals;
drop function if exists public.on_signal_notify();

create table if not exists public.notification_outbox (
  signal_id uuid primary key references public.signals (id) on delete cascade,
  recipient_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (
    status in (
      'pending', 'processing', 'ticketed', 'receipt_processing',
      'sent', 'skipped', 'permanent_failure', 'cancelled'
    )
  ),
  attempts integer not null default 0,
  receipt_attempts integer not null default 0,
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  receipt_due_at timestamptz,
  expo_ticket_id text,
  delivery_push_token text,
  delivery_push_epoch bigint,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_outbox
  add column if not exists delivery_push_token text;
alter table public.notification_outbox
  add column if not exists delivery_push_epoch bigint;

-- Return-table layouts and transition signatures changed during hardening. Drop
-- every prior overload so reruns cannot leave a weaker RPC callable.
drop function if exists public.claim_signal_notification(uuid);
drop function if exists public.record_signal_ticket(uuid, text);
drop function if exists public.record_signal_ticket(uuid, integer, text, text, bigint);
drop function if exists public.claim_signal_receipt(uuid);
drop function if exists public.complete_signal_notification(uuid, text, text);
drop function if exists public.complete_signal_delivery(uuid, integer, text, text);
drop function if exists public.complete_signal_receipt(uuid, integer, text, text);
drop function if exists public.release_signal_notification(uuid, text);
drop function if exists public.release_signal_notification(uuid, integer, text);
drop function if exists public.release_signal_receipt(uuid, text);
drop function if exists public.release_signal_receipt(uuid, integer, text);
drop function if exists public.invalidate_push_token(uuid, text);
drop function if exists public.invalidate_push_token(uuid, text, bigint);

create index if not exists notification_outbox_due_idx
  on public.notification_outbox (status, available_at, claimed_at, receipt_due_at);

alter table public.notification_outbox enable row level security;
revoke all on table public.notification_outbox from public, anon, authenticated;

-- Atomically claim a fixed insertion-time recipient and current routing token.
create or replace function public.claim_signal_notification(p_signal_id uuid)
returns table (
  signal_id uuid,
  couple_id uuid,
  sender_user_id uuid,
  recipient_user_id uuid,
  signal_type text,
  push_token text,
  push_epoch bigint,
  attempt integer
)
language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  claimed record;
begin
  -- A resolved signal or obsolete membership must not remain perpetually due.
  -- Do not cancel an actively processing row until its five-minute lease is stale.
  update public.notification_outbox o
  set status = 'cancelled',
      claimed_at = null,
      updated_at = now(),
      last_error = 'signal resolved or membership changed before delivery'
  where o.signal_id = p_signal_id
    and (
      o.status = 'pending'
      or (o.status = 'processing' and o.claimed_at < now() - interval '5 minutes')
    )
    and not exists (
      select 1
      from public.signals s
      join public.couples c on c.id = s.couple_id
      where s.id = o.signal_id
        and s.resolved_at is null
        and s.recipient_user_id = o.recipient_user_id
        and (
          (c.member_a = s.from_user and c.member_b = o.recipient_user_id)
          or (c.member_b = s.from_user and c.member_a = o.recipient_user_id)
        )
    );

  select
    s.id as signal_id,
    s.couple_id,
    s.from_user as sender_user_id,
    s.recipient_user_id,
    s.type as signal_type,
    p.push_token,
    p.push_registration_epoch as push_epoch,
    o.attempts + 1 as attempt
  into claimed
  from public.notification_outbox o
  join public.signals s on s.id = o.signal_id
  join public.couples c on c.id = s.couple_id
  join public.profiles p on p.id = o.recipient_user_id
  where o.signal_id = p_signal_id
    and o.attempts < 6
    and s.resolved_at is null
    and s.recipient_user_id = o.recipient_user_id
    and (
      (c.member_a = s.from_user and c.member_b = o.recipient_user_id)
      or (c.member_b = s.from_user and c.member_a = o.recipient_user_id)
    )
    and (
      (o.status = 'pending' and o.available_at <= now())
      or (o.status = 'processing' and o.claimed_at < now() - interval '5 minutes')
    )
  for update of o;

  if not found then return; end if;

  update public.notification_outbox
  set status = 'processing',
      attempts = attempts + 1,
      claimed_at = now(),
      updated_at = now(),
      last_error = null
  where notification_outbox.signal_id = p_signal_id;

  return query select
    claimed.signal_id::uuid,
    claimed.couple_id::uuid,
    claimed.sender_user_id::uuid,
    claimed.recipient_user_id::uuid,
    claimed.signal_type::text,
    claimed.push_token::text,
    claimed.push_epoch::bigint,
    claimed.attempt::integer;
end;
$$;

create function public.record_signal_ticket(
  p_signal_id uuid,
  p_attempt integer,
  p_ticket_id text,
  p_push_token text,
  p_push_epoch bigint
)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  if nullif(p_ticket_id, '') is null or nullif(p_push_token, '') is null
     or p_push_epoch is null then
    raise exception 'Expo ticket routing snapshot is required';
  end if;
  update public.notification_outbox
  set status = 'ticketed',
      expo_ticket_id = p_ticket_id,
      delivery_push_token = p_push_token,
      delivery_push_epoch = p_push_epoch,
      receipt_due_at = now() + interval '15 minutes',
      claimed_at = null,
      updated_at = now()
  where signal_id = p_signal_id
    and status = 'processing'
    and attempts = p_attempt;
  if not found then
    raise exception 'Notification delivery claim lost';
  end if;
end;
$$;

create function public.claim_signal_receipt(p_signal_id uuid)
returns table (
  signal_id uuid,
  recipient_user_id uuid,
  push_token text,
  push_epoch bigint,
  expo_ticket_id text,
  receipt_attempt integer
)
language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  claimed record;
begin
  select
    o.signal_id,
    o.recipient_user_id,
    o.delivery_push_token as push_token,
    o.delivery_push_epoch as push_epoch,
    o.expo_ticket_id,
    o.receipt_attempts + 1 as receipt_attempt
  into claimed
  from public.notification_outbox o
  where o.signal_id = p_signal_id
    and o.expo_ticket_id is not null
    and o.delivery_push_token is not null
    and o.delivery_push_epoch is not null
    and o.receipt_attempts < 6
    and (
      (o.status = 'ticketed' and o.receipt_due_at <= now())
      or (o.status = 'receipt_processing' and o.claimed_at < now() - interval '5 minutes')
    )
  for update of o;

  if not found then return; end if;

  update public.notification_outbox
  set status = 'receipt_processing',
      receipt_attempts = receipt_attempts + 1,
      claimed_at = now(),
      updated_at = now(),
      last_error = null
  where notification_outbox.signal_id = p_signal_id;

  return query select
    claimed.signal_id::uuid,
    claimed.recipient_user_id::uuid,
    claimed.push_token::text,
    claimed.push_epoch::bigint,
    claimed.expo_ticket_id::text,
    claimed.receipt_attempt::integer;
end;
$$;

create function public.complete_signal_delivery(
  p_signal_id uuid,
  p_attempt integer,
  p_status text,
  p_error text default null
)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  if p_status not in ('skipped', 'permanent_failure') then
    raise exception 'Invalid terminal delivery status';
  end if;
  update public.notification_outbox
  set status = p_status,
      last_error = left(p_error, 500),
      claimed_at = null,
      updated_at = now()
  where signal_id = p_signal_id
    and status = 'processing'
    and attempts = p_attempt;
  if not found then
    raise exception 'Notification delivery claim lost';
  end if;
end;
$$;

create function public.release_signal_notification(
  p_signal_id uuid,
  p_attempt integer,
  p_error text
)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  update public.notification_outbox
  set status = case when attempts >= 6 then 'permanent_failure' else 'pending' end,
      available_at = now() + make_interval(secs => least(300, 15 * power(2, attempts)::integer)),
      claimed_at = null,
      last_error = left(p_error, 500),
      updated_at = now()
  where signal_id = p_signal_id
    and status = 'processing'
    and attempts = p_attempt;
  if not found then
    raise exception 'Notification delivery claim lost';
  end if;
end;
$$;

create function public.complete_signal_receipt(
  p_signal_id uuid,
  p_receipt_attempt integer,
  p_status text,
  p_error text default null
)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  if p_status not in ('sent', 'permanent_failure') then
    raise exception 'Invalid terminal receipt status';
  end if;
  update public.notification_outbox
  set status = p_status,
      last_error = left(p_error, 500),
      claimed_at = null,
      updated_at = now()
  where signal_id = p_signal_id
    and status = 'receipt_processing'
    and receipt_attempts = p_receipt_attempt;
  if not found then
    raise exception 'Notification receipt claim lost';
  end if;
end;
$$;

create function public.release_signal_receipt(
  p_signal_id uuid,
  p_receipt_attempt integer,
  p_error text
)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  update public.notification_outbox
  set status = case when receipt_attempts >= 6 then 'permanent_failure' else 'ticketed' end,
      receipt_due_at = now() + make_interval(
        secs => least(900, 30 * power(2, receipt_attempts)::integer)
      ),
      claimed_at = null,
      last_error = left(p_error, 500),
      updated_at = now()
  where signal_id = p_signal_id
    and status = 'receipt_processing'
    and receipt_attempts = p_receipt_attempt;
  if not found then
    raise exception 'Notification receipt claim lost';
  end if;
end;
$$;

create function public.invalidate_push_token(
  p_user_id uuid,
  p_token text,
  p_epoch bigint
)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  update public.profiles
  set push_token = null,
      push_registration_epoch = push_registration_epoch + 1
  where id = p_user_id
    and push_token = p_token
    and push_registration_epoch = p_epoch;
end;
$$;

-- Queue an authenticated pg_net request. A missing Vault secret leaves the
-- durable row pending for a future cron retry instead of losing the signal.
create or replace function public.dispatch_signal_notification(
  p_signal_id uuid,
  p_action text default 'send'
)
returns bigint language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare
  webhook_secret text;
  request_id bigint;
begin
  if p_action not in ('send', 'receipt') then
    raise exception 'Invalid notification action';
  end if;
  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'hearth_notify_webhook_secret'
  limit 1;
  if nullif(webhook_secret, '') is null then
    raise warning 'Hearth notification dispatch deferred: Vault secret missing';
    return null;
  end if;

  select net.http_post(
    url := 'https://gtdigidqsczptqpbplar.supabase.co/functions/v1/notify-signal',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-hearth-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'signals',
      'action', p_action,
      'record', jsonb_build_object('id', p_signal_id)
    ),
    timeout_milliseconds := 10000
  ) into request_id;
  return request_id;
exception when others then
  raise warning 'Hearth notification dispatch deferred: %', sqlerrm;
  return null;
end;
$$;

create or replace function public.queue_signal_notification()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
begin
  if new.recipient_user_id is null then return new; end if;
  insert into public.notification_outbox (signal_id, recipient_user_id)
  values (new.id, new.recipient_user_id)
  on conflict (signal_id) do nothing;
  perform public.dispatch_signal_notification(new.id, 'send');
  return new;
end;
$$;

create or replace function public.dispatch_due_signal_notifications()
returns void language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare
  item record;
begin
  -- A worker can crash after taking its final lease. Terminalize exhausted stale
  -- claims so they never remain processing forever.
  update public.notification_outbox
  set status = 'permanent_failure',
      claimed_at = null,
      last_error = case
        when status = 'processing' then 'delivery retry budget exhausted after stale lease'
        else 'receipt retry budget exhausted after stale lease'
      end,
      updated_at = now()
  where (
      status = 'processing'
      and attempts >= 6
      and claimed_at < now() - interval '5 minutes'
    ) or (
      status = 'receipt_processing'
      and receipt_attempts >= 6
      and claimed_at < now() - interval '5 minutes'
    );

  for item in
    select signal_id from public.notification_outbox
    where attempts < 6 and (
      (status = 'pending' and available_at <= now())
      or (status = 'processing' and claimed_at < now() - interval '5 minutes')
    )
    order by available_at
    limit 25
  loop
    perform public.dispatch_signal_notification(item.signal_id, 'send');
  end loop;

  for item in
    select signal_id from public.notification_outbox
    where receipt_attempts < 6 and (
      (status = 'ticketed' and receipt_due_at <= now())
      or (status = 'receipt_processing' and claimed_at < now() - interval '5 minutes')
    )
    order by receipt_due_at
    limit 25
  loop
    perform public.dispatch_signal_notification(item.signal_id, 'receipt');
  end loop;
end;
$$;

revoke execute on function public.claim_signal_notification(uuid) from public, anon, authenticated;
revoke execute on function public.record_signal_ticket(uuid, integer, text, text, bigint) from public, anon, authenticated;
revoke execute on function public.claim_signal_receipt(uuid) from public, anon, authenticated;
revoke execute on function public.complete_signal_delivery(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.complete_signal_receipt(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.release_signal_notification(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.release_signal_receipt(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.invalidate_push_token(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.claim_signal_notification(uuid) to service_role;
grant execute on function public.record_signal_ticket(uuid, integer, text, text, bigint) to service_role;
grant execute on function public.claim_signal_receipt(uuid) to service_role;
grant execute on function public.complete_signal_delivery(uuid, integer, text, text) to service_role;
grant execute on function public.complete_signal_receipt(uuid, integer, text, text) to service_role;
grant execute on function public.release_signal_notification(uuid, integer, text) to service_role;
grant execute on function public.release_signal_receipt(uuid, integer, text) to service_role;
grant execute on function public.invalidate_push_token(uuid, text, bigint) to service_role;

revoke execute on function public.dispatch_signal_notification(uuid, text) from public, anon, authenticated;
revoke execute on function public.queue_signal_notification() from public, anon, authenticated;
revoke execute on function public.dispatch_due_signal_notifications() from public, anon, authenticated;

drop trigger if exists on_signal_created on public.signals;
drop trigger if exists on_signal_notify on public.signals;
create trigger on_signal_created
  after insert on public.signals
  for each row execute function public.queue_signal_notification();

do $$
declare
  existing_job bigint;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'hearth-notification-retry'
  loop
    perform cron.unschedule(existing_job);
  end loop;
  perform cron.schedule(
    'hearth-notification-retry',
    '* * * * *',
    'select public.dispatch_due_signal_notifications();'
  );
end;
$$;
