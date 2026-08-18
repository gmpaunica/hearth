---
name: hearth-worker
description: Claim and deliver one isolated Hearth phone-app feature from a Codex Git worktree. Use for feature implementation, fixes, scene or asset work, and tests that must reserve an exact write scope and open a PR to app/integration. Do not use in the canonical integration checkout or for merging, EAS publication, native builds, or database deployment.
---

# Hearth Worker

Deliver one bounded phone-client change without colliding with another Codex tab.

## Start safely

1. Read `AGENTS.md`, `PRODUCT_BRIEF.md`, `EXPERIENCE_ROADMAP.md`, and any art-direction material relevant to the request. Read the exact Expo SDK 57 documentation before app code.
2. Run `node scripts/parallel/session-role.mjs --expect worker`. Stop if it reports the canonical checkout.
3. Inspect before editing. Choose the smallest exact files or directory prefixes that fully contain the work. Do not reserve broad roots such as `src/`.
4. Run `node scripts/parallel/claim.mjs --task-id <id> --slug <slug> --exact <file>` with repeated `--exact` or `--prefix` arguments. Add `--request <path>::<reason>` for an integrator-owned manifest/config change. Add `--native-impact`, `--database-impact`, and `--depends-on <claim-number>` when applicable.
5. The claim script fetches `origin/app/integration`, creates `codex/<task-id>-<slug>`, opens the `parallel-claim` issue, and checks every open claim. If a lower-numbered overlapping claim exists, do not edit; isolate the design into a disjoint scope or report the block.

## Implement inside the reservation

- Change only paths covered by the winning claim.
- Never edit `.codex/parallel-policy.json`, workflows, coordination scripts, either Hearth skill, release policy, `RoomComposition.tsx`, or another integrator-owned path.
- Do not edit package/lock, Expo/EAS, TypeScript, Metro, ESLint, or service config directly. Record the exact path and reason in `integration_requests`; the integrator owns the edit.
- Keep `Garden.tsx` and garden-specific assets/tests isolated from shared room composition.
- Declare native and database impact honestly. Never run a native build or deploy a migration as a worker.
- Do not touch `C:\Windows\System32\hearth`, `C:\Users\Gmpau\hearth`, or `C:\Users\Gmpau\hearth-site` from the worktree.

## Verify and hand off

1. Run `npm run typecheck`, `npm test`, and `npm run lint:changed`. Run relevant platform exports; use `npm run export:all` for scene, navigation, configuration, or broad UI changes.
2. Run `node scripts/parallel/validate-local.mjs` and inspect `git diff --check` plus `git status --short`.
3. Stage explicit claimed paths only. Never use `git add -A` or `git add .`. Commit intentionally and push the feature branch.
4. Open a draft PR targeting `app/integration`. Its body must contain `Closes #<claim-number>`, a validation summary, and any native/database or integration-request notes. Apply `native-build-required` or `database-dependency` when declared; approved shared-file work receives `integration-request-approved` from the integrator.
5. Mark the PR ready only when the requested feature and verification are complete. A ready PR joins the serialized integration queue.

Workers never merge a PR, publish an EAS update, delete the feature branch, synchronize the canonical checkout, or deploy database work.
