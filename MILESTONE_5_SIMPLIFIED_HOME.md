# Milestone 5 — The home, simplified

Date: 7 September 2026

Status: the canonical phone implementation is locally complete and verified;
an OTA, compatible APK, and physical-device review remain explicit gates.

## Outcome

The shared voxel home is once again the first thing Hearth presents. Permanent
chrome is limited to the wordmark/day/account row, a named room rail, the
Moments fireplace dock, and one **Our things** drawer. Existing rituals,
keepsakes, styling, and decorating remain available without competing with the
room itself.

No Expo dependency or native configuration changed in this milestone. Work was
performed only in `C:\Windows\System32\hearth`; the isolated backend checkout
was not changed.

## One coordinated home surface

`momentsSurfaceStore` now owns a discriminated `HomeSurface` state instead of a
set of independent booleans. Moments, the hearth detail, account settings, Our
things, drawing/sketchbook, and development studios therefore cannot stack as
unrelated major overlays. Surface transitions also pause or resume scene
playback through one policy.

Native Back, accessibility escape, close actions, and programmatic navigation
all return through the same coordinator. Major sheets move screen-reader focus
to their heading when opened on native platforms.

## Home action registry

`src/home/actionRegistry.ts` is the single source of truth for each home
destination's label, description, icon, grouping, order, badge, unlock state,
accessibility copy, scene entry point, and invocation. The drawer and contextual
scene objects use the same actions, preventing invisible or conflicting routes.

The registry includes Moments, fireplace status, account, today's sketch,
sketchbook, voice, photo, diary, memories, wardrobe, and decorating. Locked or
unavailable destinations remain visible with calm explanatory copy rather than
silently disappearing.

## Scene-first navigation

Free two-dimensional room panning is replaced by a bounded horizontal rail.
Garden, Living room, and Bedroom are named 48-pixel targets with selected state
and edge-discovery hints. Horizontal-dominant drags move along the rail; release
projects velocity and snaps to the nearest room. Vertical-dominant movement is
not claimed, preserving gesture arbitration for sheets and scroll views.

Reduced-motion mode snaps immediately. Web wheel input follows the same bounded
rail. Garden and bedroom endpoints are exact, so the camera cannot wander into
empty scene space, and previous unbounded inertia is removed.

## Progressive disclosure

The storybook **Our things** sheet groups the preserved experiences as:

- **Today & rituals:** today's sketch, sketchbook, voice, photo, and diary.
- **Keepsakes:** memories and greenhouse entry.
- **Make it ours:** wardrobe and decorating.

The sheet respects safe areas, scrolls at large text sizes, uses at least
48-pixel action rows, exposes disabled reasons, and closes before launching the
selected destination. Contextual Fireplace, Easel, Greenhouse, and Media
Console interactions invoke the same registry entries.

Obsolete duplicate floating controls and the production-facing filming-control
preference were removed. Development studios remain behind the existing
development-only entry.

## Local verification

| Check | Result |
| --- | --- |
| TypeScript | pass |
| ESLint in quiet mode | pass; zero errors |
| `tests/home-simplified.test.mjs` | pass; 5/5 focused home contracts |
| `npm test` | pass; 139/139 tests |
| `npx expo install --check` | pass; dependencies current |
| `npx expo-doctor` | pass; 21/21 checks |
| Android/iOS/web production exports | pass |
| Responsive browser QA | pass at 360×800, 390×844, and 412×915 |
| Room-rail visual and interaction QA | pass for Garden, Living room, and Bedroom |
| Rapid surface cycles | pass; 20 drawer open/close cycles, one or zero drawers throughout, zero browser errors |
| Browser runtime | zero errors; known Expo web/deprecation warnings only |
| `git diff --check` | pass |

The responsive harness exercised the actual voxel scene, home chrome, Moments
dock, coordinated drawer, registry actions, scroll behavior, and room rail. It
does not substitute for native gesture, TalkBack, Dynamic Type, reduced-motion,
or two-phone verification.

## Publication and device gates

No EAS Update, APK, native build, database migration, or Edge Function was
published or deployed. Although milestone 5 itself is JavaScript-only, this
checkout already contains milestone 3 and 4 native changes. Its local Android
fingerprint `95482aee0b165321dca5300078a8ee2884b95c94` does not match the
installed versionCode 8 fingerprint
`f9ee9e04d4d811c47b4eadad68eff2ffa2e9fdb3`. Do not publish this tree as an OTA
to that installed APK.

After explicit authorization for a compatible APK, open it twice on both
phones and verify:

1. horizontal swipes snap to all named rooms and stop at both scene edges;
2. vertical gestures do not steal drawer scrolling;
3. room buttons, selected state, and edge hints are understandable;
4. every Our things destination and contextual scene entry opens the same
   correct surface;
5. account and Moments remain obvious without covering the home;
6. 1.0, 1.3, and 2.0 font scales retain reachable content and 44×44 targets;
7. TalkBack order, labels, selected/disabled state, focus, and escape behavior;
8. reduced motion, system Back, safe areas, and background/resume behavior; and
9. repeated rapid room and surface cycles show no stuck overlay, gesture loss,
   frame collapse, or unbounded memory growth.
