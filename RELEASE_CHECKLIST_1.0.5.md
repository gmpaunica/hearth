# Hearth 1.0.5 release checklist

Date prepared: 9 September 2026

Release candidate: `1.0.5`, Android versionCode 9, runtime `1.0.5`.

Installed baseline: `1.0.4`, Android versionCode 8, runtime `1.0.4`.

This checklist is intentionally ordered. Do not skip ahead: the native client
depends on its additive backend chain, now deployed, and the installed APK
cannot load this candidate safely over the air.

## A. Local candidate — complete

- [x] Milestones 1–9 implemented locally in their canonical checkouts.
- [x] Phone TypeScript passes.
- [x] Phone lint passes with zero warnings.
- [x] Phone tests pass: 165/165.
- [x] Backend tests pass: 92/92.
- [x] Expo Doctor passes: 21/21.
- [x] Expo SDK 57 dependency check reports current compatible packages.
- [x] Clean dependency install reproduces the lockfile.
- [x] Android, iOS, and web production exports pass.
- [x] Main bundles remain within 10% of the Milestone 1 baseline.
- [x] Static web export contains no unfinished Suspense boundary.
- [x] Production-browser hydration has zero errors.
- [x] One hundred drawer/room-gesture cycles show stable DOM/canvas counts and
  no measured unbounded heap growth.
- [x] Local Android fingerprint recorded:
  `a7e7ed4da9ce4065ba505fef1cd8860214025969`.
- [x] Installed versionCode 8 fingerprint retained:
  `f9ee9e04d4d811c47b4eadad68eff2ffa2e9fdb3`.
- [x] Candidate runtime separated from the installed runtime.
- [x] No native build, APK, OTA, or store mutation occurred during the local
  candidate checkpoint.

## B. Backend authorization and deployment — complete

- [x] Obtain explicit owner authorization for database and Edge Function
  deployment.
- [x] Re-run linked migration history immediately before deployment and confirm
  the remote boundary is still `20260819143000`.
- [x] Create and verify a locally encrypted pre-deployment database backup.
- [x] Apply the nine planned migrations plus one additive forward lint
  correction from the backend checkout only.
- [x] Deploy `export-account` v1.
- [x] Deploy `delete-account` v1.
- [x] Deploy `notify-signal` v5.
- [x] Deploy `notify-daily-media` v2.
- [x] Re-run linked database lint; only the four baseline warnings remain.
- [x] Run authenticated disposable-user checks for home state, catalogs,
  milestone keepsakes, and relationship safety.
- [x] Verify pairing blocks in both directions and outsider denial.
- [x] Verify requester-only export boundaries and private-field exclusions.
- [x] Verify deletion unpairs/rekeys the survivor, removes the identity, and cannot
  expose deleted-user or partner-private content.
- [x] Verify generic and opt-in gentle privacy contracts contain no authored
  content or sensitive payload fields.
- [x] Record migration/function identifiers, backup hashes, and live evidence in
  the backend `MIGRATION_LEDGER.md`.

Stop if any backend check fails. Use forward corrective migrations or redeploy a
known-good function; never edit an applied migration or delete production data
to make histories appear aligned.

## C. Native APK authorization and build — pending

- [ ] Obtain separate explicit owner authorization for a native Android build.
- [ ] Re-run the complete phone local gate from a clean install.
- [ ] Confirm app `1.0.5`, versionCode 9, runtime `1.0.5`, package
  `com.hearth.app`, and preview channel configuration.
- [ ] Confirm the backend deployment and live contract checks in section B are
  complete.
- [ ] Build the preview APK from `C:\Windows\System32\hearth` only.
- [ ] Record EAS build ID, artifact URL/checksum, build profile, runtime, version,
  versionCode, Git commit, and native fingerprint.
- [ ] Confirm the built fingerprint matches the final authorized source state.
- [ ] Install that APK on both owner phones. Do not use the versionCode 8 APK for
  native privacy or recovery verification.

## D. Two-phone owner matrix — pending

Use two independently authenticated clients. Open the candidate on each phone,
then cover:

- [ ] First launch, anonymous account, create/join pairing, invalid code, copy/share,
  invalid/expired code, waiting, restart, reconnect, and network loss.
- [ ] Email OTP linking and recovery after sign-out/reinstall simulation.
- [ ] SecureStore migration succeeds before legacy session removal.
- [ ] Cold-launch lock, background lock after about 30 seconds, biometric/device
  credential, PIN fallback, incorrect PIN, and safe recovery escape.
- [ ] App-switcher protection while paired; screenshot blocking on notes, diary,
  drawings, media previews, and detailed Moments surfaces.
- [ ] Generic notification defaults and opt-in gentle detail with no sensitive
  payload content.
- [ ] Privacy center: recovery status, notification privacy, app lock, export,
  deletion, blocks, unpairing, and recoverable sign-out.
- [ ] Bidirectional former-partner blocks, invite rotation, survivor home reset,
  and relationship-safe consequence copy.
- [ ] Moments: send, wait, acknowledge, respond, give space, mutually meet,
  retry, offline, cold start, background/resume, concurrent response, and
  idempotency.
- [ ] Our things: optional sketch/ritual, sketchbook deletion, photo, voice,
  diary, permissions, retry, playback, greenhouse chronology, and memory deep
  links.
- [ ] Make it ours: wardrobe preview/save/lock, decorating
  undo/cancel/save/conflict/boundaries, and chapter-based room/garden growth.
- [ ] Room snapping, edge hints, scene-object and drawer destinations, rapid
  surface cycles, and gesture arbitration.
- [ ] Approximately 360×800, 390×844, and 412×915 layouts where devices allow.
- [ ] Font scales 1.0, 1.3, and 2.0; keyboard; long copy; loading; empty; error;
  offline; reduced motion; TalkBack order; and minimum touch targets.
- [ ] Repeated room/surface cycles show no visible performance decay or memory
  growth.
- [ ] Open each installed build twice and confirm sessions, scene state, and
  realtime state remain coherent.

Record device models, OS versions, app/runtime/versionCode, account pair, and
results. Stop for owner feedback if any expected behavior or language feels
unsafe, confusing, or pressured.

## E. Preview update eligibility — pending

- [ ] The installed candidate APK reports runtime `1.0.5`.
- [ ] The JavaScript/assets fingerprint exactly matches the installed candidate
  APK's recorded native fingerprint.
- [ ] All two-phone checks in section D pass.
- [ ] Obtain publication authorization for the specific preview update.
- [ ] Publish from the canonical phone checkout only.
- [ ] Verify the update is newest on the preview branch and targets only runtime
  `1.0.5`.
- [ ] On both phones: open once to download, fully close, open again to run.
- [ ] Repeat the critical pairing, Moments, lock, capture, privacy, and realtime
  smoke paths.

Never publish this candidate to runtime `1.0.4` or from the backend checkout.

## F. Release sign-off — pending

- [ ] Owner accepts the complete two-phone experience.
- [ ] No critical/high unresolved app-runtime security finding remains.
- [ ] Remaining compatible build-tool advisories are accepted with owner and
  version context recorded.
- [ ] Migration ledger, build ledger, update ledger, and rollback record are
  complete.
- [ ] Store/release publication receives its own explicit authorization.
