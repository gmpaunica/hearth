# Milestone 8C — Progression, garden, and rooms

Completed locally on 8 September 2026 from the canonical phone checkout.
Nothing was published or deployed.

## Outcome

Home progression now reads as a sequence of shared chapters instead of a
reward ladder. The server-owned day thresholds and scene unlock behavior are
unchanged, but every celebration explains what appeared in the home in calm,
human language. The card explicitly says that nothing needs to be earned or
rushed.

Future rooms use the same language in the room rail and scene notice. They say
when the room grows into view using the authoritative shared-active-day
milestone, without a live countdown, score, tier, or active-hour target.

## Implementation

- `homeProgress.ts` gives each existing stage a concise storybook description
  and a concrete list of discoveries while preserving all thresholds.
- `HomeGrewCard` uses `HearthTheme`, safe areas, a scrollable large-text layout,
  a 48-point primary action, and screen-reader focus on the new chapter title.
- `LockedRoomNotice`, `RoomRail`, and `roomNavigation` share pressure-free
  future-chapter language.
- The development-only `home-growth-qa` route renders six deterministic,
  persistence-free review stages without backend mutations.
- Contract tests prevent technical tier, 144-hour, and countdown language from
  returning to user-facing progression copy.

## Verification

- TypeScript: passed (`npx tsc --noEmit`).
- Lint for every changed source/test file: passed with zero warnings.
- Automated tests: 162/162 passed.
- Expo Doctor: 21/21 checks passed.
- Expo SDK dependency check: all dependencies current.
- Production exports: Android 7.9 MB, iOS 7.7 MB, web 4.5 MB; all 19 static
  routes rendered.
- Browser review: six stages at 360×800, 390×844, and 412×915 (18
  combinations), with no document overflow or console errors. The action
  remained visible and exactly 48 points high.

## Owner/device checklist

- Trigger each real progression milestone on two independently authenticated
  phones and confirm both converge on the same stage and discoveries.
- Confirm TalkBack focuses the chapter title and reads the discoveries in
  order; repeat with font scales 1.0, 1.3, and 2.0.
- Confirm the room rail and in-scene future-room notice agree before Bedroom
  and Garden unlock, then disappear at the authoritative milestone.
- Inspect every newly revealed room, garden object, and landmark in portrait on
  both target phones, including reduced motion and background/resume.
- Confirm shared active time advances only through the server-owned activity
  path and never from client-supplied development state.

## Publication gate

No OTA or native build was made. The local Android fingerprint
`381c477f269790578e227da636f96a838e2faf81` differs from the installed
versionCode 8 fingerprint `f9ee9e04d4d811c47b4eadad68eff2ffa2e9fdb3`.
This client therefore requires an explicitly authorized new APK before any OTA
preview can be evaluated on the installed phones.
