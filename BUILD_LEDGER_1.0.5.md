# Hearth 1.0.5 Android preview build ledger

Built: 9 September 2026

Status: EAS internal-distribution APK completed; owner installation and
two-phone validation are pending.

| Field | Value |
| --- | --- |
| EAS build ID | `1bf560e4-14b5-4091-8b6c-2a842700b70b` |
| Build page | `https://expo.dev/accounts/gmpaunica/projects/hearth/builds/1bf560e4-14b5-4091-8b6c-2a842700b70b` |
| Artifact | `https://expo.dev/artifacts/eas/prp-DGpQ9M8kwZWWKvP4jww_xtMw5LclfOVZziKXpgI.apk` |
| Platform/profile | Android / `preview` internal distribution |
| Package | `com.hearth.app` |
| App/runtime | `1.0.5` / `1.0.5` |
| Android versionCode | 9 |
| Git commit | `c3986de3a07c9a1d3dfcd83794a7cc4bac90e1e7` |
| EAS fingerprint | `a7e7ed4da9ce4065ba505fef1cd8860214025969` |
| APK bytes | 121,476,141 |
| APK SHA-256 | `B45662846E6FBC8BEEDC937BCA84CB15B6C8DD50C262E319C39B739D329F0632` |
| Local copy | `C:\Users\Gmpau\Downloads\Hearth-1.0.5-v9-preview.apk` |

The fingerprint exactly matches the locally staged release candidate. EAS used
the existing project Android keystore. Install over versionCode 8; if Android
reports a signing conflict, stop and do not uninstall the existing app.

The APK includes all phone-side Milestones 1-9. Its ten database migrations
and four required Edge Functions were deployed and live-verified separately
before this build.
