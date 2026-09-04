# Milestone 1 — Safeguard and rebaseline

Date: 4 September 2026

Status: locally complete; awaiting owner review and physical-device checks.

## Scope and release state

- Canonical phone work was performed only in `C:\Windows\System32\hearth`.
- Backend hardening remained isolated in `C:\Users\Gmpau\hearth`.
- The installed `1.0.4` client is the technical baseline; the obsolete `1.0.3`
  review gate is retired.
- No EAS Update, native build, Supabase migration, or website change was made.

## Phone baseline

| Item | Baseline |
| --- | --- |
| App/runtime version | `1.0.4` |
| Android versionCode | `8` |
| Expo | `~57.0.20` |
| React Native | `0.86.3` |
| React | `19.2.3` |
| Node used for validation | `22.23.1` |
| Branch | `app/integration` |

The nine accidentally deleted phone assets were restored from this checkout's
own Git history. A root `.gitattributes` now normalizes text to LF while keeping
binary assets binary. Dependencies were installed cleanly, then patched only
through `npx expo install --fix` to the SDK 57-compatible versions. No
`npm audit fix` was run.

`expo-mcp` is installed as a local development dependency. The official Expo
Codex plugin was installed separately. Codex must be restarted before
`codex mcp login expo` can discover the newly registered hosted server. The
local Expo MCP tunnel could not resolve `mcp.expo.dev` during this checkpoint;
the local Metro/web server itself remained usable.

## Security correction

The living-home migration had not been deployed remotely, so it was corrected
in place before any deployment:

- `apply_home_operations` no longer reads a client-supplied `developer` flag.
- frozen-home, progression, unlock, room/garden resize, finish, terrain, and
  module rules are always enforced by the server.
- the phone no longer sends a developer bypass field.
- the Home Studio and related settings entry are development-only.

The remote migration ledger was inspected read-only. Remote history ends at
`20260819143000`; local migrations beginning with
`20260822120000_living_home_foundation.sql` remain undeployed. No migration was
applied or repaired remotely.

## Automated verification

| Check | Result |
| --- | --- |
| `npx expo install --check` | pass; dependencies up to date |
| `npx expo-doctor` | pass; 21/21 checks |
| TypeScript | pass |
| ESLint | pass with no errors |
| Repository tests | pass; 119 tests |
| Android/iOS/web production export | pass |
| Backend tests | pass; 82 tests |
| Linked Supabase database lint | pass; warnings only in legacy functions |
| Secret/generated-file review | pass; generated state ignored |
| `git diff --check` | pass in both checkouts |

The remaining database-lint warnings are pre-existing unused/shadowed
parameters in `new_invite_code`, `respond_to_interaction`, `start_moment`, and
`respond_to_moment`; there were no lint errors.

## Export and browser baselines

| Target | Main JS/Hermes bundle | Full export | Bundle time |
| --- | ---: | ---: | ---: |
| Android | 7,686,640 bytes | 11,894,935 bytes | 49.2 s |
| iOS | 7,484,193 bytes | 10,730,318 bytes | 42.2 s |
| Web | 4,302,251 bytes | 7,740,050 bytes | 64.8 s |

The cached development web reload reached `DOMContentLoaded` in 1.28 s. A
180-frame requestAnimationFrame sample averaged 16.66 ms with a 16.8 ms p95.
These measurements are a workstation regression baseline, not production
device launch/frame-time claims.

Visual captures were reviewed at 360×800, 390×844, and 412×915. The existing
front door fits those default-font layouts. The browser harness cannot reach
Supabase from this environment, so its visible `Failed to fetch` state is a
known harness limitation rather than a successful error-copy review. Large
text, TalkBack, keyboard, offline/retry, and paired realtime behavior remain
physical-device gates.

## Dependency and compatibility notes

`npm audit` still reports 22 transitive advisories (15 moderate, 7 high),
primarily in Expo/Metro/configuration tooling. The suggested broad audit fix
would leave the SDK 57 compatibility set, so it was intentionally not applied.
These advisories must be re-evaluated during release hardening or when Expo
publishes compatible patches.

The Expo patch set includes native modules and configuration. A read-only EAS
build-history check confirms that the installed `1.0.4` versionCode 8 build has
fingerprint `f9ee9e04d4d811c47b4eadad68eff2ffa2e9fdb3`. The current local Android
fingerprint is `ab09d5bf76edb19294a174f3f1dc760234fe993a`.

Those fingerprints do not match. Do not publish the current local client as an
OTA to versionCode 8. The next phone preview requires explicit authorization
for a new APK. The machine-global EAS CLI is corrupted; the successful history
check used an isolated current CLI package and did not change remote state.

## Owner checkpoint

Before milestone 2 begins:

1. Open the installed `1.0.4` app on both phones and confirm the existing build
   still launches, resumes, and reaches the shared home.
2. Confirm pairing/reconnect and one existing Moment round-trip with the two
   independently authenticated accounts.
3. Confirm the nine restored image/audio assets render or play where expected.
4. Review this baseline and authorize the bounded storybook front-door
   milestone. Its preview must be a new APK because the fingerprints differ.
   No technical preview was published for milestone 1.
