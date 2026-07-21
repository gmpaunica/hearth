-- Hearth — signal push notifications (Phase 6)
--
-- Run this AFTER deploying the Edge Function:
--   supabase functions deploy notify-signal --no-verify-jwt
-- Then in the Supabase dashboard: SQL Editor → paste → Run. Safe to re-run.
--
-- It fires the notify-signal function on every new signal, which looks up the
-- partner's push token and sends them the matching NOTIFICATIONS copy. The HTTP
-- call is made asynchronously by pg_net so it never blocks the insert.

create extension if not exists pg_net with schema extensions;

create or replace function public.on_signal_notify()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    -- Your project's function URL.
    url := 'https://gtdigidqsczptqpbplar.supabase.co/functions/v1/notify-signal',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- Publishable anon key — only routes the request; the function itself
      -- authenticates with its own service-role key from the environment.
      'Authorization', 'Bearer sb_publishable_dqyOWep6WkQhfvCArHr4_A_66VBFR46'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'signals',
      'record', to_jsonb(new)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_signal_created on public.signals;
create trigger on_signal_created
  after insert on public.signals
  for each row execute function public.on_signal_notify();
