# Milestone 4 — Ownership and safety

Date: 5 September 2026

Status: phone implementation and isolated backend contract are locally
complete; finish review returned `ship`; deployment, a compatible APK, and
physical-device verification remain explicit gates.

## Scope and release state

- Canonical phone work was performed only in `C:\Windows\System32\hearth`.
- The phone now expects the milestone 4 ownership contract, but that database
  and Edge Function work remains isolated and undeployed in
  `C:\Users\Gmpau\hearth`.
- No EAS Update, APK, native build, database migration, or Edge Function was
  published or deployed.
- No physical phone or live deployed milestone 4 backend was used to verify
  sharing, recovery, RLS, export, deletion, blocking, or two-phone behavior.

Milestone 4 adds direct `expo-file-system` and `expo-sharing` dependencies and
native Sharing configuration. The current local Android fingerprint is
`95482aee0b165321dca5300078a8ee2884b95c94`; it differs from the installed
`1.0.4` versionCode 8 fingerprint
`f9ee9e04d4d811c47b4eadad68eff2ffa2e9fdb3`.

Do not publish this checkout as an OTA to the installed APK. The next preview
must be a new, explicitly authorized APK built after the milestone 4 backend
deployment is separately authorized and completed.

## Privacy and account center

`AccountCenter` replaces scattered privacy and relationship-ownership actions
inside Settings with one **Privacy & account** surface. It retains the milestone
3 `PrivacyControls` for:

- verified-email recovery state and OTP enrollment;
- device or local-PIN app lock; and
- generic versus gentle notification privacy.

The center also loads a requester-scoped privacy snapshot containing only the
current account's recovery status, saved notification preference, and private
former-partner block list. Loading failures use calm retry copy. The saved
account preference is cached on the phone; a new notification choice is saved
locally first and then synchronized to the account. Local-cache and remote-sync
failures remain distinct and truthful instead of reporting a false success.

Recoverable sign-out removes this device's push registration and local session
while preserving the account and shared home. An anonymous identity cannot be
recovered, so sign-out first calls the canonical server cleanup contract before
clearing local notifications and the local session. The confirmation copy
states which case applies.

## Requester-safe data export

The export explanation is deliberately bounded: **Export records you authored
and shared records you can currently view. Partner-only and private partner
material is excluded.** The phone invokes the requester-scoped `export-account`
Edge Function and contains no service-role or admin deletion capability.

Export completion reports only the outcome the client can prove:

- **Downloaded:** web created and triggered a dated JSON download.
- **Shared:** native sharing was available and the system share sheet returned.
- **Unavailable:** sharing was unavailable and the export was not left behind.

Native export data is written only to a dated JSON file in the app cache. A
stale file with the same name is removed before creation, and the cache file is
deleted in `finally` after shared, unavailable, cancelled, or failed outcomes.
The current UI does not call an attempted share a download or promise a save
location it cannot observe.

Requester scoping, RLS filtering, and the exact export payload still require
validation against the authorized deployed backend with two independent
accounts.

## Former-partner blocking and unblocking

Blocked former partners appear only inside the requester's private account
snapshot. The list states the operative consequence: **Cannot pair with this
account in either direction.** It does not expose partner activity or publicize
the block.

Unblock is confirmed in place before mutation. The confirmation states that
future pairing becomes possible again only if either person later uses a valid
home code. **Keep blocked** cancels without mutation; **Confirm unblock** calls
the user-scoped RPC, removes the row from the local snapshot only after success,
and reports that the pairing block was removed.

## Leave and block consequences

Both departure choices show their full shared-home consequences before the
destructive action becomes available:

- **Leave this home:** the requester's artifacts are removed, partner-owned
  material remains theirs, the shared home resets, and invite credentials
  rotate.
- **Block former partner & leave:** all leave consequences apply, and the former
  partner's account cannot pair with the requester again unless the requester
  later removes the private block.

The client calls separate `leave_couple` and `block_and_leave_couple` contracts,
clears local notifications after success, and exits the relationship surface.
The exact server-side artifact ownership, home reset, credential rotation, and
bidirectional pairing fence remain deployment and two-account RLS gates.

## Account deletion

Account deletion is visually and semantically separate from leaving a home.
The confirmation uses neutral, factual language: authored data is removed, the
other person is safely unpaired, their home access is rekeyed, the requester's
sessions are revoked, and the operation cannot be undone.

The destructive **Delete forever** action remains disabled until the requester
types `DELETE`, trimmed and case-normalized. The client then invokes
`delete-account` with the backend confirmation phrase `DELETE MY ACCOUNT`.
After confirmed success it clears local notifications, closes the local auth
session, deletes local privacy/app-lock preferences, resets privacy state, and
starts a fresh anonymous session.

Actual account removal, authored-data deletion, partner preservation, rekeying,
session revocation, and idempotent retry behavior cannot be claimed until the
isolated Edge Function and database contract are authorized, deployed, and
tested with two accounts.

## Safe layout and interaction

Settings now mounts its full-screen overlay in `SafeAreaView`, contains the
scrolling card in `KeyboardAvoidingView`, and uses
`keyboardShouldPersistTaps="handled"`. This keeps account forms reachable when
the keyboard is open and prevents confirmation taps from being discarded.

Account-center actions, settings gear, music-volume choices, playback action,
development entry, sign-out, confirmation actions, and Done control now meet a
48-pixel minimum target. The notification switch adds an expanded hit area.
Visual QA covered 360×800, 390×844, and 412×915, including unblock, leave, and
delete confirmation states; Dynamic Type and TalkBack remain native-device
gates.

## Domain-error boundary

`DomainError` now owns `privacy_center`, `export_account`, `delete_account`,
`block_partner`, and `unblock_partner` operations. A server refusal containing
the safe **pairing is unavailable** marker maps to `pairing_blocked` and the
neutral user copy **This pairing is unavailable. Your privacy choice is still
in place.**

Account ownership services map and development-report provider failures before
throwing typed errors to the UI. The visible surface uses those safe messages
and never exposes service-role keys, admin APIs, SQL/RLS diagnostics, or raw
provider responses.

## Local verification

| Check | Result |
| --- | --- |
| TypeScript | pass |
| ESLint in quiet mode | pass; zero errors |
| `node --test tests/relationship-safety.test.mjs` | pass; 5/5 focused ownership and safety tests |
| `npm test` | pass; 134/134 tests |
| `npx expo install --check` | pass; dependencies current |
| `npx expo-doctor` | pass; 21/21 checks |
| Android/iOS/web production exports | pass |
| Playwright visual QA | pass at 360×800, 390×844, and 412×915, plus unblock, leave, and delete confirmations; 0 browser errors |
| Impeccable finish review | all 8 requested fixes resolved; targeted verdict `ship` |
| Android fingerprint | `95482aee0b165321dca5300078a8ee2884b95c94`; does not match installed versionCode 8 |
| `git diff --check` | pass |

Production exports verify JavaScript/assets bundling, not a native binary or
device behavior. Browser confirmations exercise deterministic preview state,
not live RLS, Edge Functions, system sharing, or a second phone.

## Explicit deployment, native, and OTA gates

Before milestone 4 can be called deployed, device-verified, or shipped:

1. Separately review and explicitly authorize the isolated backend migration
   and Edge Function deployment in `C:\Users\Gmpau\hearth`.
2. After deployment, verify requester-only privacy snapshots, notification
   preference persistence, private block visibility, confirmed unblock,
   bidirectional pairing fences, leave/block ownership consequences, export
   filtering, deletion, partner preservation, rekeying, and session revocation
   with two independently authenticated accounts.
3. Explicitly authorize a new preview APK containing milestone 2–4 native
   dependencies; install it on both phones. Do not use an OTA or the installed
   versionCode 8 APK for this verification.
4. Verify native JSON sharing, share cancellation and unavailability, cache-file
   deletion, recovery enrollment/reinstall, recoverable and anonymous sign-out,
   app lock, screenshot prevention, screen recording, and app-switcher previews.
5. Verify Dynamic Type, keyboard/IME behavior, safe areas, TalkBack order and
   announcements, system Back, all 48dp targets, and the three destructive
   confirmations on representative Android devices.
6. Run the complete alternating-author two-phone pairing, reconnect, Moments,
   leave, block, unblock, export, and deletion smoke matrix without exposing
   private partner data.
7. Record the authorized APK's fingerprint. A later JavaScript/assets-only OTA
   is eligible only when its generated native fingerprint exactly matches that
   installed APK.
