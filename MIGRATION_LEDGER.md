# Hearth backend migration ledger

Last verified: 9 September 2026

Status: local release chain prepared and validated; nothing in this ledger has
been deployed by the comprehensive improvement program.

## Checkout and authority boundary

This ledger belongs to the isolated backend checkout at
`C:\Users\Gmpau\hearth`. Phone work and any EAS action belong only to
`C:\Windows\System32\hearth`. Database migrations, Edge Functions, native
builds, and preview publication each require their own explicit authorization.

## Remote boundary

`npx --yes supabase@2.117.0 migration list --linked` was run read-only on
9 September 2026. The linked project reports 15 applied migrations and ends at:

`20260819143000_fix_diary_voice_receipts.sql`

There is no remote migration after `20260819143000`. No history repair was run.

## Pending migrations — apply only in this order

| Order | Migration | Purpose |
| ---: | --- | --- |
| 1 | `20260822120000_living_home_foundation.sql` | Versioned home state, rooms, objects, unlocks, keepsakes, snapshots, atomic edits, server-owned progression, epoch cleanup, and the installed-scene fallback. Client developer bypasses are removed before first deployment. |
| 2 | `20260822160000_home_attachment_safety.sql` | Unique attachment sockets plus guarded, carried, synchronized attachment groups. |
| 3 | `20260822170000_indoor_home_catalog.sql` | Authoritative indoor catalog v2 compatibility and placement contracts. |
| 4 | `20260822180000_garden_home_catalog.sql` | Complete 52-piece garden taxonomy and catalog v3 contracts. |
| 5 | `20260822190000_home_upgrade_catalog.sql` | Functional fireplace and bedroom replacement families in catalog v4. |
| 6 | `20260822200000_advanced_garden_catalog.sql` | Grand garden, seasonal, architectural, and landmark families in catalog v5. |
| 7 | `20260822210000_home_milestone_keepsakes.sql` | Source-linked, unique, durable milestone keepsakes and snapshot projection. |
| 8 | `20260905120000_relationship_safety.sql` | Notification privacy, private bidirectional pairing blocks, requester-safe export support, and retry-safe account deletion support. |
| 9 | `20260909120000_content_free_metrics.sql` | One private user/home/day activity row inferred from a successful home load, 90-day raw retention, and service-only daily aggregates derived from domain counts. |

The metrics migration records no notes, media paths, names, invite codes,
Moment destinations, payloads, navigation, or screen time. Authenticated clients
can only call `record_active_home_day()` for their own current paired home;
aggregate and purge functions are service-role only.

## Edge Functions required with the chain

Deploy these current local sources after the migrations succeed:

1. `export-account`
2. `delete-account`
3. `notify-daily-media`
4. `notify-signal`

The first two depend on relationship-safety database contracts. The notification
functions depend on server-owned privacy preferences and must retain content-free
payload behavior.

## Pre-deployment gate

Before any authorized deployment:

1. fetch/inspect linked migration history again and stop if the remote boundary
   differs from this ledger;
2. confirm a recoverable database backup / point-in-time recovery window;
3. run TypeScript, lint, all backend tests, secret scan, and `git diff --check`;
4. run linked database lint and compare warnings;
5. inspect every migration for additive-only behavior and confirm no applied
   file was edited;
6. use non-owner test identities for destructive account-deletion validation;
7. record the exact backend commit and operator authorization.

Current local evidence: TypeScript pass, zero-warning lint, 91/91 tests, secret
scan pass, `git diff --check` pass, and linked database lint with warnings only.
The warnings are pre-existing unused/shadowed arguments in `new_invite_code`,
`respond_to_interaction`, `start_moment`, and `respond_to_moment`.

`npx --yes supabase@2.117.0 db push --linked --dry-run --include-all
--skip-vault` was also run on 9 September 2026. It listed exactly the nine
migrations above, in this order, and made no database change. Local SQL
execution and RLS integration remain pending because Docker is unavailable in
this environment; the dry-run and static contract tests do not replace the
post-deployment authenticated matrix below.

## Post-deployment authenticated matrix

Use two paired users plus an outsider and verify:

- old pairs retain the complete installed home while new pairs receive the
  intended foundation;
- snapshots, revisions, idempotent edits, attachment movement, collision,
  boundaries, routes, budget, progression, and frozen-world behavior;
- all 112 catalog IDs, replacement roles, garden tiers, and milestone keepsakes;
- `record_active_home_day()` inserts once per user/home/day, rejects unauthenticated
  callers, records no content, and the service aggregate/purge functions reject
  ordinary authenticated roles;
- bidirectional blocks prevent pairing before membership changes;
- privacy snapshots expose only requester state;
- export includes requester-authored plus authorized shared data and excludes
  partner-only/private records, tokens, invite codes, receipts, and raw paths;
- deletion requires exact confirmation, unpairs/rekeys the survivor, removes the
  requester identity, and revokes sessions;
- generic and opt-in gentle push notifications contain no authored content;
- outsider reads/writes and direct table mutations fail under RLS.

Afterward, re-read remote history, record deployed migration versions and Edge
Function identifiers, then authorize the dependent `1.0.5` native APK separately.

## Rollback policy

- Do not edit or mark down an applied migration to conceal a failure.
- Prefer a new additive forward-correction migration.
- Redeploy the previous known-good Edge Function source if a function fails.
- Stop client rollout if the backend contract is unhealthy.
- Use database restore only with explicit owner authorization and a reviewed
  recovery point; never delete production relationship data as a routine rollback.
- Account deletion is intentionally irreversible and must be tested only with
  disposable identities before owner use.
