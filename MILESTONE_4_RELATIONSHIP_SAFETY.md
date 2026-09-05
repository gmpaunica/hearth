# Milestone 4 — Ownership and relationship safety

Date: 5 September 2026

Status: locally implemented and statically validated; database and Edge
Function deployment is intentionally pending owner authorization.

## Checkout boundary

Backend work in this report exists only in the isolated checkout at
`C:\Users\Gmpau\hearth`. The canonical `1.0.4` phone work remains in
`C:\Windows\System32\hearth`. No client source, assets, migration state, or
generated output was copied between the dirty trees.

## Server contract prepared

- `privacy_preferences` defaults notification copy to `generic`; the optional
  `gentle` setting may identify a feature family but never includes authored
  content.
- Pairing blocks live in the private schema and are enforced in both directions
  inside the locked `join_couple` transaction before membership changes.
- Blocking and leaving uses the canonical `leave_couple()` cleanup, preserving
  the existing ownership, home-reset, and invite-rotation semantics.
- The privacy-center snapshot exposes only the requester's recovery state,
  notification preference, and blocks they created.
- Account export includes requester-authored records plus shared records the
  requester may currently view. Partner-only notes, media paths, receipts,
  tokens, invite codes, and private partner choices are excluded. Requester-
  owned media receives a ten-minute signed download URL.
- Account deletion requires the exact server confirmation phrase, prepares
  canonical unpair/sign-out cleanup, removes requester media on a best-effort
  retry-safe path, then deletes the authenticated identity with the service role
  held only inside the Edge Function.

## Validation

| Check | Result |
| --- | --- |
| Backend contract suite | pass; 87 tests |
| Focused relationship-safety contracts | pass; 4 tests |
| Deno type checking for four changed functions | pass |
| Embedded private-key/JWT scan on changed files | pass |
| `git diff --check` | pass |
| Local Supabase database/RLS lint | pending; local Docker database is not running |
| Deno lint | blocked by the checkout's existing URL-import convention in all four checked functions |

The Deno lint finding is not a runtime or type error: the project consistently
imports Supabase from `https://esm.sh`, while current Deno lint recommends an
import map. No broad module-system rewrite was mixed into this security
milestone.

## Deployment gate

Nothing in this milestone has been deployed. Before a dependent phone preview:

1. obtain explicit owner authorization;
2. re-read linked migration history and confirm the undeployed chain;
3. apply the additive relationship-safety migration in order;
4. deploy `export-account`, `delete-account`, `notify-signal`, and
   `notify-daily-media`;
5. run authenticated two-user tests for both-direction blocks, export
   isolation, survivor rekeying, session revocation, and notification privacy;
6. record the final migration ledger and rollback notes.

