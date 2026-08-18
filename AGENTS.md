# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Product direction

Read `PRODUCT_BRIEF.md` before making product, design, copy, architecture, or implementation decisions. Treat it as the source of truth for the app's purpose, safety boundaries, MVP priorities, emotional-repair flows, and spatial memory system.

Read `EXPERIENCE_ROADMAP.md` before planning or implementing experience work. It records the approved interaction principle, feature order, and owner-review gates. Implement only one numbered experience feature at a time, publish it to preview, and wait for owner review before starting the next one.

Read `VOXEL_ART_DIRECTION.md` before changing characters, rooms, furniture, cosmetics, or future house-customization assets. It records the approved reference density and modular construction rules.

# Parallel phone-client delivery

`C:\Windows\System32\hearth` on `app/integration` is the protected integration
checkout. Do not implement ordinary feature work directly in it. Independent
implementation is allowed only in Codex Git worktrees based on
`origin/app/integration`.

- In a feature worktree, use `$hearth-worker`. Reserve exact repo-relative files
  or narrow directory prefixes through the automated `parallel-claim` issue
  before editing. The lowest issue number owns an overlapping path.
- Stay inside the winning reservation. Package/lock manifests, Expo/EAS/native
  configuration, workflows, coordination policy and scripts, Hearth skills,
  release policy, and shared room composition are integrator-owned. Declare
  them as `integration_requests`; do not edit them as a worker.
- Workers verify, commit, push, and open a PR targeting `app/integration`. They
  never merge, publish an EAS update, deploy a migration, delete the branch, or
  modify the canonical checkout.
- In the protected checkout, use `$hearth-integrator`. It serializes ready PRs,
  validates a disposable merge, merges through GitHub, synchronizes this tree,
  then publishes and verifies exactly one preview update before advancing.
- Native or database-impacting PRs stop for explicit build/deployment
  authorization. A failed preview leaves its exact merged SHA pending and
  blocks later merges until idempotent publication succeeds.

`.codex/parallel-policy.json` is the machine-readable authority. The session
hook reports the active role. Parallel work never bypasses the owner-review
gates in `EXPERIENCE_ROADMAP.md`.

# Preview delivery workflow

When the user asks to implement or ship an app update, completing the local code change is not enough. After validation, the integrator publishes an EAS Update to the installed preview build with:

`npx eas-cli update --branch preview --environment preview --message "<short update description>" --non-interactive`

Verify that the new update is the latest update on the `preview` branch. The user should not need to download a new APK for JavaScript/assets-only changes: with the existing `ON_LOAD` Expo Updates configuration and matching runtime, they open the installed preview app once to download the update, fully close it, and open it a second time to run the update.

Only require a new APK/native build when the change is not compatible with the installed runtime (for example, native dependency or native configuration changes).
