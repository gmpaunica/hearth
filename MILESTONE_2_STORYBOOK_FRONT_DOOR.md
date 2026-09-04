# Milestone 2 — Storybook front door

Date: 4 September 2026

Status: implementation and local review complete; native APK and two-phone
owner verification remain gated.

## Delivered

- One semantic `HearthTheme` now defines the forward-looking application color,
  type, spacing, radius, touch, shadow, and motion roles. Legacy `ui`,
  `editorial`, and `hearthUi` exports remain compatibility-only until their
  owning milestones migrate them.
- Reusable storybook primitives provide the safe-area folio shell, keyboard
  avoidance, scrolling, 48-pixel targets, buttons, fields, notices, progress,
  headings, actions, and a code-built voxel hearth mark.
- Welcome, name, create/join, waiting, loading, reconnect, and fatal-error
  states share the twilight-cover, parchment-folio, coral-binding visual world
  with Fredoka headings and Nunito UI copy.
- Pairing accepts exactly six alphanumeric characters and exposes explicit
  Copy and Share actions. Waiting and restart failures remain visible and safe.
- `DomainError` centralizes calm, actionable auth/pairing failures while raw
  JWT, Postgres, URL, policy, and service diagnostics remain development-only.
- Ambient music begins only after pairing, avoiding autoplay and emotional
  noise during first use.
- A development-only web visual harness covers every front-door state without
  calling auth or pairing mutations. It returns `null` in production and on
  native clients.
- `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, and the durable
  front-door surface brief record the product and implemented design system.

## Verification

| Check | Result |
| --- | --- |
| TypeScript | pass |
| ESLint | pass with no errors |
| Repository tests | pass; 124 tests |
| Focused front-door tests | pass; 5 tests |
| `npx expo install --check` | pass; dependencies up to date |
| `npx expo-doctor` | pass; 21/21 checks |
| Android/iOS/web production export | pass |
| Browser state matrix | pass; zero console errors |
| Finish review | `ship` for locally reviewable surface and fixes |
| Placeholder contrast | 5.34:1 on fresh parchment |
| `git diff --check` | pass |

Visual evidence was inspected at 360×800, 390×844, and 412×915 for welcome,
name, choice, join, waiting, failed restart, loading, and offline recovery.
The browser evidence is a React Native Web proxy, not native-device proof.

## Release gate

`expo-clipboard` is a new SDK-57-compatible native dependency. The current
local Android fingerprint is
`c18575ecc50bc654d231f0024cf36ddc83b00e3a`; it does not match the installed
versionCode 8 fingerprint
`f9ee9e04d4d811c47b4eadad68eff2ffa2e9fdb3`.

No OTA was published because it would be incompatible with the installed APK.
No native build or database migration was created or deployed. Explicit owner
authorization is required for the next preview APK.

## Two-phone owner checklist

After an authorized APK is available, test on both independently authenticated
phones:

1. Cold launch, welcome, name entry, create, join, waiting, Copy, and Share.
2. Restart while waiting and while paired; background/resume after 30+ seconds.
3. Offline launch/retry plus invalid, expired, and full-home codes.
4. Keyboard/IME insets and system Back on every input state.
5. Font scales 1.0, 1.3, and 2.0; scroll to every action without clipping.
6. TalkBack order/focus, reduced motion, safe areas, and all 48dp targets.
7. Confirm the first-use flow is silent and home music starts only after pairing.
