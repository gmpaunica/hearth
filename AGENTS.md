# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Product direction

Read `PRODUCT_BRIEF.md` before making product, design, copy, architecture, or implementation decisions. Treat it as the source of truth for the app's purpose, safety boundaries, MVP priorities, emotional-repair flows, and spatial memory system.

Read `EXPERIENCE_ROADMAP.md` before planning or implementing experience work. It records the approved interaction principle, feature order, and owner-review gates. Implement only one numbered experience feature at a time, publish it to preview, and wait for owner review before starting the next one.

Read `VOXEL_ART_DIRECTION.md` before changing characters, rooms, furniture, cosmetics, or future house-customization assets. It records the approved reference density and modular construction rules.

# Phone-client development

`C:\Windows\System32\hearth` is the canonical phone-client checkout. Make and
validate phone UI, scene, asset, and preview changes here. Keep backend-only
hardening work in `C:\Users\Gmpau\hearth`; do not copy dirty trees between the
two checkouts without an explicit reconciliation task.

Work on one owner-review feature at a time. Native builds and database
deployments still require explicit authorization.

# Preview delivery workflow

When the user asks to implement or ship an app update, completing the local code change is not enough. After validation, publish an EAS Update to the installed preview build with:

`npx eas-cli update --branch preview --environment preview --message "<short update description>" --non-interactive`

Verify that the new update is the latest update on the `preview` branch. The user should not need to download a new APK for JavaScript/assets-only changes: with the existing `ON_LOAD` Expo Updates configuration and matching runtime, they open the installed preview app once to download the update, fully close it, and open it a second time to run the update.

Only require a new APK/native build when the change is not compatible with the installed runtime (for example, native dependency or native configuration changes).
