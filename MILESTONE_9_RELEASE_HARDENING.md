# Milestone 9 — Release hardening

Date: 9 September 2026

Status: local implementation and automated verification complete. No database
migration, Edge Function, native build, APK, EAS Update, or store release was
created or deployed.

## Release boundary

The installed owner baseline remains `1.0.4` / Android versionCode 8 with
fingerprint `f9ee9e04d4d811c47b4eadad68eff2ffa2e9fdb3`. This release candidate is
`1.0.5` / Android versionCode 9 and resolves to runtime `1.0.5` through the
`appVersion` policy. Its local Android fingerprint is
`a7e7ed4da9ce4065ba505fef1cd8860214025969`.

The version boundary is intentional. Native modules and native configuration
added by the privacy, recovery, capture-protection, and sharing milestones are
not present in versionCode 8. The candidate must first become a new APK; its
JavaScript must never be published to the installed `1.0.4` runtime.

## Hardening completed

- Web static rendering now begins with the same deterministic storybook loading
  shell on the server and first client render. The root waits for hydration
  before loading fonts, routing the app, or mounting native-sensitive work.
- The web scene also defers its React Three Fiber canvas until hydration. Fresh
  static exports contain no unfinished Suspense marker and production Chrome no
  longer reports React hydration error 419.
- `verify:release` records the exact Milestone 1 bundle baseline, locates the
  generated main bundles, measures full export size, rejects any main-bundle
  regression over 10%, and rejects unfinished static Suspense boundaries.
- Full lint now treats React Three Fiber scene properties as valid only inside
  the scene and character viewport paths. All other files retain the strict
  unknown-property rule. Two obsolete local suppressions were removed.
- Compatible patch updates were applied through the lockfile only. The manifest
  remains on Expo SDK 57-compatible ranges.
- The release candidate version and runtime contract are covered by tests.
- A successful shared-home snapshot now makes a best-effort call to the new
  backend `record_active_home_day()` contract. The call cannot delay or break
  the home; the undeployed server migration enforces one content-free row per
  user/home/day, 90-day raw retention, and service-only aggregates.

## Dependency review

A clean `npm ci` installs 959 packages. The controlled compatible update reduced
`npm audit` from 24 findings (16 moderate, 8 high) to 19 findings (15 moderate,
4 high), with no critical or low findings.

The remaining findings are inside Expo CLI/config, Metro/image inspection,
Expo Router query parsing, and Expo Sharing/Xcode build-tool dependency chains.
The automatic npm proposals would downgrade the project to incompatible Expo
46/55-era packages or Expo Router 5, so they were not applied. Revisit them only
through an Expo SDK-compatible patch or an intentionally planned SDK upgrade.

## Controller and asset audit

The largest presentation files were reviewed together with their state and
service collaborators. `SignalCards`, `MomentsController`, `HomeStudio`, Daily
Drawing, Wardrobe, and the home editor already isolate durable state in stores,
provider work in services/domain mappers, and presentation in components. A
late file split would move code without reducing release risk, so no speculative
controller rewrite was mixed into this gate.

The asset reference scan found no authored production asset that could be
removed safely while preserving the installed-scene fallback and milestone
history. Restored Hearth assets remain intentionally retained. Old starter
binary artwork can be handled later as an explicit binary-cleanup task; it is
not a release blocker and was not deleted from this dirty checkout.

## Automated verification

| Check | Result |
| --- | --- |
| TypeScript | pass |
| ESLint | pass with `--max-warnings=0` |
| Repository tests | pass; 165/165 across 27 files |
| Backend tests | pass; 91/91 |
| Expo Doctor | pass; 21/21 |
| Expo compatible dependency check | pass; dependencies current |
| Android production export | pass |
| iOS production export | pass |
| Web static production export | pass; 19 routes |
| Release verifier | pass; all bundle deltas below 10%, no unfinished static Suspense boundary |
| Android fingerprint | `a7e7ed4da9ce4065ba505fef1cd8860214025969` |
| `git diff --check` | pass |

## Performance budget

The main-bundle ceiling is no more than 10% above the Milestone 1 baseline.

| Target | Milestone 1 | Candidate | Delta | Full export |
| --- | ---: | ---: | ---: | ---: |
| Android | 7,686,640 B | 7,941,186 B | +3.31% | 12,149,481 B |
| iOS | 7,484,193 B | 7,736,915 B | +3.38% | 10,983,040 B |
| Web | 4,302,251 B | 4,468,719 B | +3.87% | 8,288,663 B |

Production Chrome against the final exported web app measured:

- initial DOMContentLoaded: 532.2 ms;
- initial load: 533.7 ms;
- 180 animation frames: 16.62 ms average, 16.8 ms p95, 17.9 ms maximum;
- 100 consecutive Our things open/close cycles with alternating room-rail drag
  gestures: DOM nodes 80 to 80, canvases 1 to 1, measured JS heap
  28,276,489 B to 28,678,532 B (+402,043 B, bounded after the cycle);
- zero console errors and zero page errors.

Two known web-only warnings remain: Expo Notifications does not implement push-
token listeners on web, and Three.js reports its existing `Clock` deprecation.
Neither warning occurs as a runtime failure or changes the native release gate.

## What remains outside local authority

The local Milestone 9 work is complete, but release completion still requires
the ordered authorization and owner checks in `RELEASE_CHECKLIST_1.0.5.md`:

1. explicit authorization for the pending backend migrations and four Edge
   Functions;
2. authenticated live RLS/ownership validation after that deployment;
3. explicit authorization to create the `1.0.5` versionCode 9 APK;
4. installation and full two-phone native/realtime/accessibility/privacy checks;
5. only then, runtime-matched preview OTA eligibility and the two-open check.

Rollback constraints are recorded in `ROLLBACK_NOTES_1.0.5.md`.
