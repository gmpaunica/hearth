# Milestone 7A — Daily sketch and optional ritual

Date: 8 September 2026

Status: the canonical phone implementation is locally complete and verified;
a compatible APK and two-phone owner review remain explicit gates.

## Outcome

The daily sketch is now a small, optional act rather than a relationship task.
The canvas is the first creation step, title and brush-size controls are
progressive, and the only implemented ritual preference controls a private
evening prompt on the current phone. Hearth does not expose participation,
streaks, warnings, or a numeric relationship-like fire score.

The sketchbook now provides direct dated navigation, readable day context, calm
empty and failure states, and author-only permanent removal. Removal requires a
clear confirmation and preserves the server-owned closed slot, so a deleted
page cannot be recreated on the same home day.

## Privacy and resilience

- The local reminder preference is versioned per user and couple.
- Reminder hydration occurs before ritual evaluation on startup and reconnect.
- Drawing load, save, and delete failures use the shared `DomainError` boundary.
- The existing author-only `delete_daily_artifact` and
  `drawing_slot_is_open` RPCs remain the source of truth; no backend or
  migration change was needed.
- Drawing and sketchbook surfaces retain native capture protection.
- Android Back, accessibility escape, initial screen-reader focus, safe areas,
  keyboard avoidance, and 44-point minimum actions are explicit.

## Local verification

| Check | Result |
| --- | --- |
| TypeScript | pass |
| ESLint in quiet mode | pass; zero errors |
| Focused sketch/Moments contracts | pass; 42/42 |
| `npm test` | pass; 151/151 tests |
| `npx expo install --check` | pass; dependencies current |
| `npx expo-doctor` | pass; 21/21 checks |
| Android/iOS/web production exports | pass |
| Responsive browser QA | pass at 360×800, 390×844, and 412×915 |
| Review states | empty, drawing, saved, preferences, archive, and delete confirmation |
| Browser runtime | zero errors; known Expo/React Native web warnings only |
| Horizontal overflow | none across all 18 state/viewport captures |

The development-only `daily-sketch-qa` route uses deterministic local state and
cannot call Supabase or a mutation. Browser review does not replace native
keyboard, TalkBack, screenshot protection, background/resume, or two-phone
validation.

## Publication and device gates

No EAS Update, APK, native build, migration, or Edge Function was published or
deployed. The current local Android fingerprint
`95482aee0b165321dca5300078a8ee2884b95c94` does not match installed
versionCode 8 fingerprint `f9ee9e04d4d811c47b4eadad68eff2ffa2e9fdb3`.
Do not publish this tree as an OTA to that installed APK.

After explicit authorization for a compatible APK, verify on two independently
authenticated phones that the reminder stays private, each person can still
send only once per home day, partner reads do not leak, removal is author-only
and final, realtime archive updates converge, large text keeps all actions
reachable, and native capture protection remains active.
