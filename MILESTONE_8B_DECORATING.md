# Milestone 8B — Decorating

Date: 8 September 2026

Status: the canonical phone implementation is locally complete and verified;
a compatible APK and two-phone owner review remain explicit gates.

## Outcome

Decorating keeps the voxel home mounted and makes the draft boundary explicit.
The header always shows whether the room has unsaved changes, Save explains why
it is unavailable, and a pending piece must be placed or cancelled before the
shared home can be saved. Direct drag, scene pan, pinch zoom, rotation, red/green
placement feedback, style choices, duplication, and the existing catalogue all
remain available.

Undo and redo now use full touch targets and exposed disabled state. Cancel,
Put away, and replacing a local draft after a partner conflict use visible
in-sheet confirmations with exact consequences. Conflict choices distinguish
keeping the local draft from loading the newest shared version. Offline saves
keep the local command draft and offer a calm Save retry without provider copy.

The sheet uses safe-area spacing, Hearth typography and semantic colors, a
scrolling content region, non-overlaid notices, and 48-point primary controls.
The title receives initial focus and placement/conflict status is announced.

## Architecture and safety

- `homeStudioStore` retains its idempotent request ID, offline command replay,
  validation, atomic edit RPC, and explicit revision-conflict resolution.
- Save failures now map through the `home_edit` `DomainError` operation and raw
  network/database messages stay diagnostic-only.
- The development-only `home-studio-qa` route covers catalog, selected,
  placing, blocked, conflict, and offline states without backend calls.
- Client placement, walking-route, attachment, role, scene-budget, and garden
  rules remain enforced before save; Supabase remains authoritative.

## Local verification

| Check | Result |
| --- | --- |
| TypeScript | pass |
| Changed-file ESLint in quiet mode | pass; zero errors |
| Focused decorating/error contracts | pass; 12/12 |
| `npm test` | pass; 161/161 tests |
| `npx expo install --check` | pass; dependencies current |
| `npx expo-doctor` | pass; 21/21 checks |
| Android/iOS/web production exports | pass; 7.9 MB / 7.7 MB / 4.4 MB JS |
| Responsive browser QA | pass at 360×800, 390×844, and 412×915 |
| Review matrix | 6 states across 18 viewport/state combinations |
| Browser runtime | zero errors; known Expo/React Native web warnings only |
| Document overflow | none |

Browser review cannot validate native scene dragging, pinch arbitration,
TalkBack focus, live two-person conflicts, offline persistence across a killed
process, or the production edit RPC.

## Publication and device gates

No EAS Update, APK, native build, migration, or Edge Function was published or
deployed. Local Android fingerprint
`381c477f269790578e227da636f96a838e2faf81` does not match installed
versionCode 8 fingerprint `f9ee9e04d4d811c47b4eadad68eff2ffa2e9fdb3`.
Do not publish this tree as an OTA to that installed APK.

After explicit authorization for a compatible APK, verify add/drag/rotate/place,
invalid boundaries and routes, undo/redo, Put away and restore, Cancel/discard,
offline retry after restart, simultaneous partner edits and both conflict
choices, large text, reduced motion, TalkBack order, and identical saved results
on two independently authenticated phones.
