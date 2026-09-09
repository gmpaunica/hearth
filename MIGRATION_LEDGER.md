# Hearth backend migration ledger

Last verified: 9 September 2026

Status: production deployment complete and live contracts verified. The next
release gate is a separately authorized `1.0.5` native APK; no phone build or
EAS Update was performed from this checkout.

## Checkout and authority boundary

This ledger belongs to the isolated backend checkout at
`C:\Users\Gmpau\hearth`. Phone work and any EAS action belong only to
`C:\Windows\System32\hearth`. No files were copied between the two histories.

## Applied migration chain

The linked Supabase project `gtdigidqsczptqpbplar` originally ended at
`20260819143000_fix_diary_voice_receipts.sql`. Owner-authorized deployment on
9 September 2026 applied these forward migrations in order:

| Order | Migration | Purpose |
| ---: | --- | --- |
| 1 | `20260822120000_living_home_foundation.sql` | Versioned home state, rooms, objects, unlocks, keepsakes, snapshots, atomic edits, server-owned progression, epoch cleanup, and installed-scene fallback. |
| 2 | `20260822160000_home_attachment_safety.sql` | Unique attachment sockets plus guarded, synchronized attachment groups. |
| 3 | `20260822170000_indoor_home_catalog.sql` | Authoritative indoor catalog v2 compatibility and placement contracts. |
| 4 | `20260822180000_garden_home_catalog.sql` | Complete 52-piece garden taxonomy and catalog v3 contracts. |
| 5 | `20260822190000_home_upgrade_catalog.sql` | Fireplace and bedroom replacement families in catalog v4. |
| 6 | `20260822200000_advanced_garden_catalog.sql` | Grand garden, seasonal, architectural, and landmark families in catalog v5. |
| 7 | `20260822210000_home_milestone_keepsakes.sql` | Source-linked, unique, durable milestone keepsakes and snapshot projection. |
| 8 | `20260905120000_relationship_safety.sql` | Notification privacy, bidirectional pairing blocks, requester-safe export, and retry-safe deletion support. |
| 9 | `20260909120000_content_free_metrics.sql` | One private user/home/day activity row, 90-day retention, and service-only aggregates. |
| 10 | `20260909133000_release_lint_cleanup.sql` | Forward-only cleanup of a keepsake-function lint warning; no applied migration was edited. |

The final linked boundary is
`20260909133000_release_lint_cleanup.sql` (25 applied migrations total). Local
and remote histories match; no migration-history repair was used.

Two initial pushes failed inside transactions and left the remote boundary
unchanged. Before retrying, the undeployed foundation migration was corrected
to resolve `smallint` seed rotations explicitly and parenthesize five `CASE`
conditions. The entire nine-file chain was then parsed against production in a
single explicit rollback transaction. After successful deployment, the lint
cleanup was added as migration 10 rather than editing an applied file.

The metrics contract stores no notes, media paths, names, invite codes, Moment
destinations, payloads, navigation, or screen time. Authenticated clients can
only call `record_active_home_day()` for their own current paired home;
aggregate and purge functions are service-role only.

## Recovery point

A no-cost local custom-format PostgreSQL archive was created before deployment
for the `public`, `private`, `auth`, and `storage` schemas. It contains 625
archive entries, including 55 table-data entries. The retained file is:

`C:\Users\Gmpau\Hearth Backups\predeploy-20260909-125635\hearth-production-before-migrations.dump.dpapi`

- Encryption: Windows DPAPI, `CurrentUser` scope; directory ACL is restricted
  to `BOSSITRON2000\Gmpau` and `SYSTEM`.
- Plain archive SHA-256:
  `7BE5F3591B796D3867A5699EBDC9223A77B2A6A11E4099E93B168C4296B2874F`
- Protected archive SHA-256:
  `7E27FA0282D525B63C74B669A1D99A869DCBFDC496F5AA8F48A943B6D04E2F47`
- A decrypt-and-hash check passed, and no plaintext `.dump` remains.

Restoring production remains destructive and requires explicit owner
authorization plus a reviewed target. Recovery instructions sit beside the
archive.

## Edge Functions deployed

| Function | Version | JWT gateway | Source SHA-256 |
| --- | ---: | --- | --- |
| `export-account` | 1 | verify | `bf3879dae0affcf6c8631fd1e613c935b12677e86a0c1c4a5e668c853cfe8bac` |
| `delete-account` | 1 | verify | `daf6664186a8f420f11ac42e4659d851e1ad22b03a267090054b78aaa99c2439` |
| `notify-signal` | 5 | webhook authentication | `2358ca9672349503d5ddc19c1c51b2f3ed9e41490e40ef5164c6c7e3b0d9e156` |
| `notify-daily-media` | 2 | webhook authentication | `26f6ebc4c74b604b6c30bf5494fc428fb95c30365a2dd6710d79559d0ab71a3d` |

All changed functions pass Deno type checking. Unauthenticated POST smoke tests
returned 401 for all four endpoints.

## Production verification

- 92/92 backend tests, TypeScript, ESLint, secret scan, and diff checks pass.
- All 121 paired homes have a home-state row at `home-catalog-v5`; validation
  succeeds for every existing home.
- The authoritative catalog contains 112 rows and 112 distinct IDs.
- RLS and grants keep privacy/block tables private; activity aggregation and
  retention remain service-role-only; the daily retention cron exists once.
- A live disposable three-user matrix passed pairing, outsider isolation,
  idempotent activity, generic/gentle privacy, safe export, both-direction
  block enforcement, unblock/rejoin, account deletion, survivor unpair/rekey,
  and identity removal. Test identities and activity rows were removed.
- Linked database lint has exactly the four pre-existing unused/shadowed
  argument warnings in `new_invite_code`, `respond_to_interaction`,
  `start_moment`, and `respond_to_moment`; the release chain adds none.

## Rollback policy

- Do not edit or mark down an applied migration to conceal a failure.
- Prefer a new additive forward-correction migration.
- Redeploy the previous known-good Edge Function source if a function fails.
- Stop client rollout if the backend contract becomes unhealthy.
- Use the database recovery point only with explicit owner authorization;
  never delete production relationship data as a routine rollback.
- Account deletion is intentionally irreversible and must be tested only with
  disposable identities before owner use.
