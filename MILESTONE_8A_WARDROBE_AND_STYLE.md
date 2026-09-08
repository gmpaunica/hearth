# Milestone 8A — Wardrobe and style

Date: 8 September 2026

Status: the canonical phone implementation is locally complete and verified;
a compatible APK and two-phone owner review remain explicit gates.

## Outcome

Wardrobe is now a preview-first character styling journey. People can rotate
their voxel character by touch or screen-reader adjustable actions, compare
complete looks and individual clothing choices, and see clearly when the
preview differs from the saved home character. The existing character identity,
voxel renderer, presets, and modular appearance options remain intact.

Saving is truthful and recoverable. The client verifies the profile row returned
by Supabase before presenting completion, keeps the unsaved preview when a write
fails, and offers an immediate retry without exposing provider detail. Leaving
with unsaved changes uses an inline discard confirmation. If the profile is not
ready, styling remains explorable while Save is visibly unavailable.

The layout now uses the semantic Hearth theme, safe areas, dynamic-height
content, and a normal-flow action bar instead of a fixed overlay. Tabs, option
cards, and actions meet the 44-point target; selected and disabled state is
announced; and the title receives initial screen-reader focus.

## Architecture and privacy

- `avatarStore` maps load/save failures through typed `DomainError` operations,
  verifies the returned owner profile, and restores the saved state after a
  failed optimistic write.
- `Wardrobe`, `WardrobePreview`, and `WardrobeThumbnail` use `HearthTheme`.
- The development-only `wardrobe-qa` route provides saved, changed, saving,
  error, locked, and discard states without backend mutations.
- Existing RLS continues to restrict avatar writes to the signed-in profile.

## Local verification

| Check | Result |
| --- | --- |
| TypeScript | pass |
| Changed-file ESLint in quiet mode | pass; zero errors |
| Focused wardrobe/media contracts | pass; 17/17 |
| `npm test` | pass; 160/160 tests |
| `npx expo install --check` | pass; dependencies current |
| `npx expo-doctor` | pass; 21/21 checks |
| Android/iOS/web production exports | pass; 7.9 MB / 7.7 MB / 4.4 MB JS |
| Responsive browser QA | pass at 360×800, 390×844, and 412×915 |
| Review matrix | 6 states across 18 viewport/state combinations |
| Browser runtime | zero errors; known Expo/React Native/Three web warnings only |
| Document overflow | none |

Browser review cannot validate native TalkBack gestures, live Supabase/RLS
writes, realtime identity convergence, or physical-device font scaling.

## Publication and device gates

No EAS Update, APK, native build, migration, or Edge Function was published or
deployed. Expo-approved SDK 57 patches were installed through Expo's installer.
They produce local Android fingerprint
`381c477f269790578e227da636f96a838e2faf81`, which does not match installed
versionCode 8 fingerprint `f9ee9e04d4d811c47b4eadad68eff2ffa2e9fdb3`.
Do not publish this tree as an OTA to that installed APK.

After explicit authorization for a compatible APK, verify touch and TalkBack
rotation, every option and full look, save completion, offline retry with the
preview retained, unsaved discard/cancel, locked-profile behavior, large text,
stable member identity, and two-phone convergence.
