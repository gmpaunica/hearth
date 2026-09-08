# Milestone 7C — Greenhouse and memories

Date: 8 September 2026

Status: the canonical phone implementation is locally complete and verified;
a compatible APK and two-phone owner review remain explicit gates.

## Outcome

The Memory greenhouse now opens on the newest planted days and gives every bay
a real date range. Newer/older controls remain attached to the fixed four-memory
bay model, while a visible **Newest** shortcut makes returning from older pages
immediate. Each card identifies the day, whether it is a single or paired
memory, and when it was kept without adding captions, scores, streaks, or
relationship pressure.

Daily Photo now links a planted day directly into its greenhouse card. The
route accepts the server home date, resolves the containing bay, and visually
marks the requested day. The garden portal and matching **Our things** action
continue to open the same route for scene-led and accessible discovery.

Empty and offline states have one calm next action. An empty greenhouse links
back to today’s photo and explains how keeping works; load failures retain safe
copy and an explicit retry. Removal now uses an in-sheet final confirmation,
keeps the memory visible if the operation fails, and announces successful
completion.

## Architecture and privacy

- Greenhouse presentation now reads only from `HearthTheme`.
- `greenhouseModel` owns bay lookup and date-range derivation as pure helpers.
- Greenhouse load and removal use dedicated typed `DomainError` operations;
  provider detail remains diagnostic-only.
- Private photos continue to use short-lived signed URLs and the existing
  retryable private-photo surface.
- The development-only `greenhouse-qa` route provides local assets and inert
  callbacks for empty, error, chronology, focused, and removal states.

## Local verification

| Check | Result |
| --- | --- |
| TypeScript | pass |
| ESLint in quiet mode | pass; zero errors |
| Focused greenhouse/media contracts | pass; 14/14 |
| `npm test` | pass; 159/159 tests |
| `npx expo install --check` | pass; dependencies current |
| `npx expo-doctor` | pass; 21/21 checks |
| Android/iOS/web production exports | pass |
| Responsive browser QA | pass at 360×800, 390×844, and 412×915 |
| Review matrix | 5 states across 15 viewport/state combinations |
| Browser runtime | zero errors; known Expo/React Native web warnings only |
| Document overflow | none; memory cards intentionally use a bounded horizontal rail |

Browser review cannot validate native capture protection, signed-photo renewal
against the live service, author permissions, realtime pairing, or TalkBack.

## Publication and device gates

No EAS Update, APK, native build, migration, or Edge Function was published or
deployed. The current local Android fingerprint
`95482aee0b165321dca5300078a8ee2884b95c94` does not match installed
versionCode 8 fingerprint `f9ee9e04d4d811c47b4eadad68eff2ffa2e9fdb3`.
Do not publish this tree as an OTA to that installed APK.

After explicit authorization for a compatible APK, verify newest/older paging,
direct date focus, garden and drawer entry, offline recovery, private-photo
retry, final removal, paired-photo arrival, capture blocking, large text,
TalkBack order, and realtime convergence on two independently authenticated
phones.
