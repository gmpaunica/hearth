# Milestone 7B — Photo, voice, and diary

Date: 8 September 2026

Status: the canonical phone implementation is locally complete and verified;
a compatible APK and two-phone owner review remain explicit gates.

## Outcome

Daily Photo and Daily Record now explain permission timing before the system
prompt, retain local previews after interrupted sends, and make retry the next
action without claiming that content was uploaded. Camera access is requested
only after **Take photo**; the library path explains that Hearth receives only
the selected image. Microphone access is requested only after **Record**, and
the foreground-only recording boundary remains explicit.

Private photo loading can renew a failed signed URL. Voice playback remains
strictly user-initiated, exposes a calm retry state, and uses code-built play,
pause, and loading marks. Receipt creation still occurs only after the private
photo loads or recipient playback begins.

Photo, voice, and diary removal now use in-context confirmation with precise
shared consequences, full-size safe and destructive actions, and polite
completion feedback. Failed removal leaves the item visible. Diary pages use a
single-column sketch layout so confirmation copy and large text remain bounded.

## Architecture and privacy

- All daily-media surfaces now read only from `HearthTheme`.
- Daily-media and diary provider failures pass through typed `DomainError`
  operations; infrastructure detail remains diagnostic-only.
- `PrivateSurfaceShield` remains mounted on photo, voice, and diary routes.
- Initial screen-reader focus is explicit for daily-media and diary headings.
- The development-only `daily-media-qa` route seeds local stores, skips
  refreshes, guards every acquisition/mutation path, and supplies local review
  assets so it cannot call Supabase.

## Local verification

| Check | Result |
| --- | --- |
| TypeScript | pass |
| ESLint in quiet mode | pass; zero errors |
| Focused media contracts | pass; 21/21 |
| `npm test` | pass; 157/157 tests |
| `npx expo install --check` | pass; dependencies current |
| `npx expo-doctor` | pass; 21/21 checks |
| Android/iOS/web production exports | pass |
| Responsive browser QA | pass at 360×800, 390×844, and 412×915 |
| Review matrix | 13 states across 39 viewport/state combinations |
| Browser runtime | zero errors; known Expo/React Native web warnings only |
| Element overflow audit | none after compact diary confirmation fix |

Browser review cannot validate native camera and microphone prompts, recording
interruptions, device audio routing, capture blocking, or two-phone receipts.

## Publication and device gates

No EAS Update, APK, native build, migration, or Edge Function was published or
deployed. The current local Android fingerprint
`95482aee0b165321dca5300078a8ee2884b95c94` does not match installed
versionCode 8 fingerprint `f9ee9e04d4d811c47b4eadad68eff2ffa2e9fdb3`.
Do not publish this tree as an OTA to that installed APK.

After explicit authorization for a compatible APK, verify camera/library and
microphone grant/deny/settings paths, foreground interruption, local-preview
retry after network loss, audio routing and replay, author-only deletion,
receipt timing, generic notifications, capture blocking, large text, TalkBack,
and realtime convergence on two independently authenticated phones.
