# Milestone 3 — Private by default

Date: 5 September 2026

Status: implementation and local automated validation complete; an authorized
native APK and physical-device verification remain gated.

## Scope and release state

- Canonical phone work is present only in `C:\Windows\System32\hearth`.
- No EAS Update, native build, APK, or database migration was created or
  deployed for this milestone.
- No Supabase Edge Function or remote database behavior was deployed. The
  isolated backend checkout locally defaults signal pushes to content-free
  copy in commit `736af05`; it remains undeployed.
- No physical phone was used to verify SecureStore migration, email delivery,
  device authentication, lock/resume timing, screen-capture prevention, recent-
  app previews, or notification presentation.

Milestone 3 adds `expo-crypto`, `expo-local-authentication`,
`expo-screen-capture`, and `expo-secure-store`, plus native configuration for
SecureStore and Local Authentication. These native modules are not present in
the installed `1.0.4` versionCode 8 APK. The installed fingerprint remains
`f9ee9e04d4d811c47b4eadad68eff2ffa2e9fdb3`; the current local Android
fingerprint is `3f7ee35e35ae49be0c2631acaa3fa4cb22978abb`.

Do not publish this checkout as an OTA to the installed APK. The next preview
must be a new APK, and creating it requires explicit owner authorization.

## Secure session migration

Native Supabase Auth persistence now uses a custom SecureStore adapter instead
of storing the session directly in AsyncStorage. Web retains its existing
per-tab session adapter, and static prerendering retains its in-memory fallback.

Because a serialized Supabase session can exceed historical SecureStore value
limits, the native adapter:

- splits values into 1,800-character encrypted SecureStore chunks;
- commits an atomic manifest containing schema version, generation, chunk
  count, total length, and an integrity checksum;
- verifies a complete secure read-back before accepting a write;
- restores the previous manifest and removes the incomplete generation if a
  write or verification fails;
- removes the previous secure generation only after the replacement verifies;
  and
- migrates a legacy AsyncStorage session only after the secure copy verifies,
  then removes the legacy value.

Auth chunks and privacy preferences use separate service namespaces and
`WHEN_UNLOCKED_THIS_DEVICE_ONLY`, keeping native values device-bound and
available only after the device has been unlocked. Removal clears both the
secure value and any legacy AsyncStorage copy.

## Email recovery OTP

Account recovery remains optional. A paired person can add a normalized email
from Settings without sending partner content by email. Hearth requests an
email change for the current authenticated identity, accepts the six-digit
`email_change` OTP, supports resend, and records whether the identity is still
anonymous, pending verification, or recoverable.

The pairing journey now offers **Recover an existing home**. It requests an
email OTP with account creation disabled, accepts the newest six-digit `email`
OTP, then reloads the recovered profile and couple into the normal auth state.
Typed domain errors cover invalid or expired OTPs and an email already attached
to another Hearth account while keeping raw provider diagnostics out of UI.

The repository contract is locally verified, but real email delivery, Supabase
Auth template/configuration, link verification, reinstall recovery, and
cross-device recovery have not been exercised against a physical client.

## App lock

App lock is off by default and remains an explicit local choice. Settings now
offers:

- device authentication when an enrolled credential is available, using
  strong biometrics where supported and retaining the device passcode fallback;
- a required six-digit local fallback PIN for device-lock mode; or
- a standalone six-digit local PIN.

PIN-only setup is unavailable unless an enrolled device credential or verified
recovery email provides a safe escape. On the lock screen, an enrolled device
credential remains available even in PIN mode. A recoverable account can choose
**Forgot PIN? Recover access**, verify a fresh email OTP, and only then turn the
local app lock off before choosing a new one in Settings.

The PIN is never stored as plaintext. Hearth generates a per-PIN salt, stores a
SHA-256 digest in native SecureStore, and verifies future entries against that
digest. Five failed attempts trigger a 30-second local cooldown.

For a paired home with app lock enabled, the root privacy gate locks on cold
launch and after Hearth has remained inactive or backgrounded for at least 30
seconds. The locked storybook surface supports device unlock and the configured
local PIN path. A development-only privacy route and web lock preview exist for
visual QA; neither enables native authentication on web.

## Capture protection

When a paired home is mounted on native, the root privacy gate requests screen-
capture prevention to protect screenshots, recordings, and recent-app
snapshots. Additional keyed shields remain mounted while these sensitive
surfaces are visible:

- expanded Moments;
- today's drawing and the sketchbook;
- Daily Photo;
- Daily Record; and
- Our Diary.

The implementation uses the operating-system protection exposed by
`expo-screen-capture`. Its exact screenshot, recording, multitasking-preview,
and lifecycle behavior still requires verification on each shipped native
platform.

## Notification privacy

Notification detail defaults to **generic**. Local scheduled return reminders
now contain only the Hearth title, a root deep link, no sound, and the generic
body **Something is waiting in Hearth.** A person may opt into **gentle** detail,
which changes that local reminder to the feature-level copy **Your return
reminder is ready in Hearth.** It still includes no note, prompt, storage path,
partner content, or emotional detail.

This preference currently governs local return reminders. In the isolated
backend checkout, signal notifications now default to the same content-free
copy. That Edge Function change passed backend tests but was not deployed;
server-side gentle-detail preference lookup belongs to milestone 4.

## Local verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run lint` | pass; 0 errors, 249 existing React Three Fiber JSX `react/no-unknown-property` warnings |
| `npm test` | pass; 129/129 tests |
| `node --test tests/private-by-default.test.mjs` | pass; 5/5 focused privacy tests |
| `npx expo install --check` | pass; dependencies up to date |
| `npx expo-doctor` | pass; 21/21 checks |
| `npx @expo/fingerprint fingerprint:generate --platform android` | pass; local Android fingerprint `3f7ee35e35ae49be0c2631acaa3fa4cb22978abb` |
| Android/iOS/web production exports | pass; fresh bundles generated outside the worktree |
| Playwright visual QA | pass; lock, forgotten-PIN recovery, and the shipping Settings integration at 390×844; 0 console errors |
| Impeccable finish review | `ship`; no remaining material findings |
| `git diff --check` | pass |

Production exports do not create or verify a native binary. Static and source-
contract tests do not substitute for native runtime verification.

## Explicit native and OTA gates

Before milestone 3 can be called device-verified or shipped:

1. Obtain explicit owner authorization for a new preview APK containing all
   milestone 2 and milestone 3 native dependencies.
2. Build and install that APK on both independently authenticated phones; do
   not rely on the installed versionCode 8 client or an OTA.
3. On each phone, verify legacy-session migration preserves the same identity,
   profile, pairing, and home across cold launch, and that sign-out removes the
   persisted session.
4. Verify recovery-email enrollment, resend, invalid/expired code handling,
   reinstall recovery, and return to the same home without exposing partner
   content in email.
5. Verify device unlock and local PIN on cold launch and after at least 30
   seconds backgrounded, including cancellation, device fallback, five-failure
   cooldown, and app-lock disable/re-enable behavior.
6. Verify screenshots, screen recording, and recent-app previews while paired
   and on every listed sensitive surface, including background/resume and route
   transitions.
7. Verify generic and gentle local reminders on lock screen, notification tray,
   and tap-through; confirm sensitive content never appears.
8. Run the normal two-phone pairing/reconnect and Moment smoke matrix so the
   security changes do not regress the shared-home loop.
9. Only after the APK's native fingerprint is recorded may a later
   JavaScript/assets-only OTA be considered, and only when its generated
   fingerprint exactly matches that installed APK.
