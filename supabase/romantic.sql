-- Hearth — add the "feeling romantic" signal (bedroom).
--
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste →
-- Run. Safe to re-run. Needed because public.signals already exists with a
-- CHECK constraint that only allows the original five signal types; a new
-- 'romantic' signal insert is rejected until this widens it.
--
-- (schema.sql already lists 'romantic' for fresh installs — this migration just
-- brings an existing database up to date.)

alter table public.signals
  drop constraint if exists signals_type_check;

alter table public.signals
  add constraint signals_type_check
  check (type in ('fireplace','sofa','table','garden','rest','romantic'));
