# P0 implementation handoff — 4 August 2026

> Historical P0 handoff. The current release handoff below supersedes the older
> “Remaining before completion” instructions.

## Moments Owner Review `1.0.3` interaction revision — 18 August 2026

- Mobile work stayed in `C:\Windows\System32\hearth`; the separate dirty backend
  checkout was not copied, reconciled, or modified. No backend migration or RPC
  change was required for this revision.
- Implemented no-snap Moment endings, single-owner garden threshold geometry,
  a tappable real-hearth current status card, temporary **Fire: tending**
  presentation, and the large projected member-A-left/member-B-right readiness
  heart. Readiness controls were removed from the sheet.
- Removed the floating fire orb, fireplace notebook idea, small 3D readiness
  heart, generic 3D response pair, full-width 72-pixel dock, and minimize
  chevron. Added relevant scrapbook response postcards, a centered 48-pixel
  dock, and runtime-loaded Fredoka/Nunito assets with no native configuration.
- Validation passed: TypeScript; 61/61 client tests; changed-file ESLint with
  zero errors; the self-starting browser harness completed 20 real touch
  dock/expand/collapse cycles at 390×844 with no relevant runtime error; and
  Android, iOS, and web exports succeeded. Expo Doctor remains 20/21 only
  because current SDK metadata recommends newer Expo 57 patch packages than the
  versionCode 7 installed fingerprint; native packages remain pinned for OTA
  compatibility.
- Published update group `726847ac-2fab-4344-95b9-f6e1e842151a` is verified
  latest on EAS `preview`, runtime `1.0.3`. Android update
  `01a0150f-425a-705b-b70a-2e8009a2327a` and iOS update
  `01a0150f-425a-7456-bf1f-166ec1ee3929` were published from the canonical
  checkout. The generated Android fingerprint is exactly the installed
  versionCode 7 hash `24a442c968109b1b090e222da541456e2390372a`.
- Physical installation is the only remaining gate: open the installed app
  once, fully close it, and open it a second time on both phones. Run the
  alternating-author smoke and stop for owner review. No phone is attached to
  this workstation, so this step was not claimed as complete.
- Recorded voice notes remain deliberately disabled and are still the next
  separate native-build/APK gate.

## Moments Owner Review `1.0.3` handoff — 17 August 2026

- Work stayed separated: backend/migration changes are in
  `C:\Users\Gmpau\hearth`; phone UI, scenes, tests, docs, export, and publication
  are in this canonical checkout. The dirty trees were not copied or reconciled.
- Deployed additive migration `20260817120000` provides immutable validated
  home timezone, the aggregate daily ritual snapshot, public couple-scoped
  readiness events, strict optional action payloads, and
  `respond_to_rest_moment` while preserving old RPC signatures.
- The phone implements six 40×18 mosaics, the two feeling sections, destination
  previews without names, one continuous sheet, ritual orb and physical fire,
  private sketch reminder, seven spatial reaction anchors, split readiness
  heart, real Rest doodle/visitor/hug, and revised fullscreen/Romantic payoffs.
- Validation passed: backend 59/59; authenticated live matrix across 20
  alternating-author sessions; phone 60/60; TypeScript; Android/iOS/web export;
  and zero errors in the changed owner-review lint set. Whole-repo lint still
  contains the older React compiler/R3F backlog. Expo Doctor is 20/21 because
  its current SDK 57 patch recommendations are newer than the installed
  versionCode 7 fingerprint; packages remain pinned for OTA compatibility.
- Published update group `a75cf0c3-ceba-4f6b-96f0-bf4400eff7a5` is verified
  latest on `preview`, runtime `1.0.3`. Android update
  `01a00fa9-5ce1-737d-8ca5-33975f9d62d9` matches the installed versionCode 7
  fingerprint `24a442c968109b1b090e222da541456e2390372a`; iOS update is
  `01a00fa9-5ce1-7d7c-9169-bf50765ad9f9`.
- No phone is attached to this workstation. The only remaining release step is
  the physical two-open installation and alternating-author two-phone smoke
  matrix. Stop for owner review after it passes.
- Recorded voice notes are deliberately not enabled. Expo Audio microphone
  configuration is the next native-build/APK gate.

Resume this exact task: **P0 — Independent locations with a compact interaction
surface** from `EXPERIENCE_ROADMAP.md`.

## Authority and gates

- The owner explicitly said to start P0, so the prior F1/C1 owner-review gate
  was treated as cleared.
- `AGENTS.md`, `PRODUCT_BRIEF.md`, and `EXPERIENCE_ROADMAP.md` were read before
  implementation.
- The exact Expo SDK 57 reference at
  `https://docs.expo.dev/versions/v57.0.0/` was read before code changes.
- Do not begin F2. Finish, publish, and stop for owner review after P0.

## Implemented

- Added `src/state/signalPresence.ts` with a pure projection from each member's
  latest authored/join action to two independent avatar spots.
- Refactored `src/state/signalStore.ts` so all local, hydrate, and realtime
  events re-project both avatars together. Resolving one authored signal no
  longer resets the other member's independent signal.
- Added response timestamps so a person's newest intentional action wins even
  when Supabase signal/response events arrive out of order.
- Enforced one authored open location per user without touching the partner's
  open signal, including late optimistic-insert cleanup.
- Replaced the two simultaneously rendered large signal cards with one focused
  `SignalCards` surface and two compact, identity-coloured, switchable presence
  chips when both states coexist.
- Changed `SignalSheet` so an incoming partner state does not hide the user's
  own signal control; it still hides once the user has their own authored
  state.
- Extended `tests/frontend-phase1.test.mjs` with P0 presence/UI regression
  coverage.
- Extended `scripts/live-test.mjs` to prove both roles can see simultaneous
  fireplace + garden rows and resolving the garden leaves the fireplace open.

## Validation already passed

- `npx tsc --noEmit` — clean.
- Changed-file ESLint set — clean:
  `npx eslint src/components/SignalCards.tsx src/components/SignalSheet.tsx src/state/signalStore.ts src/state/signalPresence.ts src/app/index.tsx`
- `node --test tests/frontend-phase1.test.mjs` — 20/20 passed.
- `node scripts/live-test.mjs` — all live auth, pairing, RLS, realtime, F1, and
  new P0 coexistence/independent-resolution checks passed.
- Full-repo `npm run lint` still reports the repository's pre-existing React 19
  compiler-rule backlog (167 findings in unrelated existing files); the files
  changed for P0 are clean.

## Remaining before completion

1. Finish the one-page-at-a-time browser visual/reopen pass at 390×844.
   - The earlier two-page attempts timed out because Playwright waits forever
     for the intentionally pulsing **Send a little signal** element to become
     stable. This was diagnosed as test-driver behavior, not an app error.
   - Prefer inserting A's garden and B's fireplace through authenticated
     Supabase clients, then inspect each stored browser identity sequentially.
     This avoids clicking the continuously animated pill and avoids running two
     WebGL scenes simultaneously.
   - Confirm one focused card + two presence chips from both identities, cancel
     only A's garden, reload both identities, and confirm B's fireplace remains.
2. Review `git diff` and rerun TypeScript, changed-file lint, 20 tests, and the
   live harness if any further code changes are made.
3. Update `EXPERIENCE_ROADMAP.md`: F1/C1 can be recorded Approved based on the
   owner's instruction to proceed; set P0 to Awaiting owner review only after
   publishing and verifying preview.
4. Update `STATUS.md` with the P0 implementation, validation, and EAS group.
5. Publish exactly one JavaScript-only preview update:
   `npx eas-cli update --branch preview --environment preview --message "P0 independent avatar locations and compact interaction UI" --non-interactive`
6. Verify that update is the latest on the `preview` branch.
7. Stop. Tell the owner to open the installed preview once, fully close it, and
   open it a second time. Wait for P0 owner review; do not start F2.

## Important repository state

- The worktree was already heavily modified/untracked before P0. Preserve all
  existing changes and do not reset or clean it.
- P0 has **not** been published yet.
- `EXPERIENCE_ROADMAP.md` and `STATUS.md` have **not** yet been changed for P0.
- Temporary browser logs/scripts/screenshots were under
  `C:\Windows\Temp\hearth-p0`; a PC restart may remove or invalidate them and
  they are not required to resume.
