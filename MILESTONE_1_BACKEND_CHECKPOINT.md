# Milestone 1 — Backend hardening checkpoint

Date: 4 September 2026

Status: locally validated and checkpointed; nothing deployed.

## Checkout boundary

This repository is the isolated backend-hardening checkout. The canonical
`1.0.4` phone client is `C:\Windows\System32\hearth`. No client files were
copied between the two trees, and no EAS Update may be published from here.

## Remote migration boundary

`npx supabase migration list --linked` was run read-only. The linked Supabase
project is deployed through `20260819143000_fix_diary_voice_receipts.sql`.
These later migrations remain local and undeployed:

- `20260822120000_living_home_foundation.sql`
- `20260822160000_home_attachment_safety.sql`
- `20260822170000_indoor_home_catalog.sql`
- `20260822180000_garden_home_catalog.sql`
- `20260822190000_home_upgrade_catalog.sql`
- `20260822200000_advanced_garden_catalog.sql`
- `20260822210000_home_milestone_keepsakes.sql`
- `20260905120000_relationship_safety.sql`
- `20260909120000_content_free_metrics.sql`

No migration history was repaired and no migration or Edge Function was
deployed.

## Security work included

- The undeployed living-home foundation migration no longer trusts a
  client-supplied `developer` flag. Frozen-home, progression, catalog unlock,
  resize, finish, terrain, and module constraints are unconditional.
- Notification delivery uses authenticated, epoch-safe registration and
  content-minimizing outbox paths.
- Sign-out cleanup, RLS/security contracts, and unpair behavior have regression
  coverage.
- Generated Supabase link state and local visual artifacts are ignored.
- A repository `.gitattributes` normalizes text to LF and identifies binary
  assets.
- Six unrelated image deletions were restored from this checkout's own Git
  history; asset removal belongs to release hardening, not this checkpoint.

## Verification

| Check | Result |
| --- | --- |
| Repository tests | pass; 82 tests |
| ESLint | pass |
| TypeScript | pass |
| Linked Supabase database lint | pass; warnings only |
| Secret/generated-file scan | pass |
| `git diff --check` | pass |

Database lint reports only legacy unused/shadowed parameter warnings in
`new_invite_code`, `respond_to_interaction`, `start_moment`, and
`respond_to_moment`; there are no errors.

`npm audit` reports 24 transitive advisories (16 moderate, 8 high). No broad or
forced audit fix was applied because this checkpoint must preserve the Expo SDK
57 compatibility set. Re-evaluate compatible upgrades during release
hardening.

## Next authorization gate

Before any dependent phone preview, obtain explicit authorization to deploy the
pending database chain. Re-run linked migration history and database/RLS tests
immediately before deployment, record the resulting ledger, and keep rollback
notes for the additive migrations.
