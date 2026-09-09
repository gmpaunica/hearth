# Hearth 1.0.5 rollback notes

Date prepared: 9 September 2026

No remote state has been changed by the comprehensive improvement program as of
this checkpoint. These notes describe the safe response if the pending rollout
is later authorized.

## Before rollout

- Record the final Git commits for both canonical checkouts.
- Record remote migration history, deployed Edge Function versions, EAS build
  ID, APK checksum, runtime, channel/branch mapping, and installed fingerprints.
- Confirm database backup / point-in-time recovery availability.
- Keep a known-good versionCode 8 APK available, but do not route `1.0.5`
  JavaScript to its runtime.
- Use non-destructive test accounts before any owner-account deletion test.

## Client update rollback

The `1.0.5` candidate has its own runtime, so an update for it is isolated from
the installed `1.0.4` APK.

If a preview OTA misbehaves:

1. stop or cancel any active rollout;
2. republish/promote the last known-good update for runtime `1.0.5`, or repoint
   the preview channel according to the recorded EAS ledger;
3. confirm the newest branch update and runtime in EAS;
4. open both phones once to download, fully close, and open again;
5. repeat the critical lock, pairing, Moments, and account-center smoke checks.

Do not repair an OTA failure by publishing `1.0.5` JavaScript to runtime
`1.0.4`.

## Native APK rollback

If versionCode 9 fails before owner acceptance, stop distribution and continue
using the known-good versionCode 8 APK for only its existing `1.0.4` feature set.
Reinstalling an older APK may require uninstalling the newer one and can remove
local session/PIN state, so first confirm recovery access and preserve any
requester-safe data that the user intends to keep.

Fix native/runtime defects in a new binary version and runtime. Do not reuse a
published versionCode or weaken SecureStore, app-lock, or capture protections to
force downgrade compatibility.

## Database rollback

The pending migrations are additive and ordered. Once a migration is applied:

- never edit or rename the applied file;
- never manipulate migration history merely to make local and remote lists
  appear equal;
- prefer an additive forward corrective migration;
- stop client rollout if its server contract is not safe;
- use database restoration only as an incident response with confirmed backup,
  impact analysis, and explicit owner approval.

Home-state/catalog migrations may have created user-authored objects after
deployment. Dropping their tables, indexes, or constraints is not a routine
rollback because it can destroy shared-home data. Relationship blocks and
privacy preferences also carry safety intent and must not be silently discarded.

Account deletion is irreversible by design. It is not rollback-testable against
a real owner account; validate it with disposable authenticated users and
record survivor rekey/session-revocation evidence.

## Edge Function rollback

If one of `export-account`, `delete-account`, `notify-signal`, or
`notify-daily-media` fails after deployment:

1. pause the dependent client path;
2. redeploy the recorded last known-good function version when that preserves
   the current database contract;
3. otherwise deploy a forward-compatible correction;
4. repeat authenticated requester/partner/outsider tests before resuming.

Never place a service-role key in the phone client, logs, exports, or rollback
artifacts. Never restore notification behavior that includes authored content
in the push payload.

## Decision owner

Database restore, migration deployment, native build, OTA publication, channel
changes, and store release each require explicit owner authorization. A failed
gate means stop, preserve evidence, and choose the smallest forward-safe repair.
