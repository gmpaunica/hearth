---
name: hearth-integrator
description: Serialize ready Hearth phone-client PR integration from the protected canonical checkout, including reservation cleanup, dependency-aware queue selection, shared-file requests, synthetic merge validation, GitHub merge, exact checkout synchronization, idempotent EAS preview publication, and post-publication branch cleanup. Use only in C:/Windows/System32/hearth on app/integration.
---

# Hearth Integrator

Process at most one ready PR per run. A pending merged SHA always takes priority over another merge.

## Guard and recover

1. Read `AGENTS.md`, `.codex/parallel-policy.json`, and the relevant product/experience/art direction. Read the exact Expo SDK 57 and EAS Update documentation before publication work.
2. Run `node scripts/parallel/session-role.mjs --expect integrator`; stop on any mismatch or dirty canonical tree.
3. Acquire the atomic common-Git-directory lease with `node scripts/parallel/integrator-lock.mjs acquire`. Retain its returned token and release it in a `finally`-equivalent final step. If acquisition reports busy, exit successfully without other actions.
4. Run `node scripts/parallel/cleanup-claims.mjs`.
5. Run `node scripts/parallel/integrator-state.mjs show`. If state exists, recover that exact PR/SHA before selecting anything else. A merged SHA with an unverified preview pauses the queue.

## Finish a pending publication

1. If state is `awaiting_merge`, query the recorded PR. When it is merged, record its merge SHA with `node scripts/parallel/integrator-state.mjs merged --sha <sha>`; otherwise do not process another PR.
2. Fetch `origin/app/integration`, fast-forward the clean canonical checkout, and verify `HEAD` is exactly the pending SHA and its tree matches `tested_tree`.
3. Run `node scripts/parallel/preview-update.mjs --sha <sha> --pr <number> --message <description>`. It checks for an existing `[sha:<sha>]` update before publishing and verifies the result is newest on `preview`.
4. Comment on the PR with merge SHA and EAS group. Remove `preview-pending`, delete the remote feature branch, then clear state with `node scripts/parallel/integrator-state.mjs clear --sha <sha>`.
5. If publication fails or verification is ambiguous, leave state and branch intact, label the PR `preview-pending`, and exit. Never advance the queue.

## Integrate one ready PR

1. Run `node scripts/parallel/select-pr.mjs`. It excludes drafts, blocked/native/database PRs, honors declared dependencies, and orders eligible PRs by Ready-for-Review time.
2. Revalidate claim ownership and changed scope. Fulfill only approved `integration_requests` on the PR branch, using an integrator-authored commit; never silently widen worker scope.
3. Refresh the branch against current `app/integration`, wait for the required gate, and run `node scripts/parallel/synthetic-merge.mjs --pr <number>`. This disposable merge runs `npm ci`, TypeScript, all tests, changed-file ESLint, and Android/iOS/web exports.
4. For ambiguous conflicts or intent, comment the exact paths, apply `integration-blocked`, and perform no merge or update. Resolve a conflict only when both intents are explicit and behavior-preserving.
5. Native-impact PRs receive `native-build-required`; database-impact PRs receive `database-dependency`. Do not auto-merge them without the separately authorized build or migration deployment.
6. Before merging, persist recovery state with `node scripts/parallel/integrator-state.mjs begin --pr <number> --head <branch> --tested-tree <tree> --message <description>`.
7. Merge through GitHub with a merge commit. Record the returned SHA immediately and continue through the pending-publication workflow above.

Rollback is a PR reverting the relevant merge commit. It follows the same gate, synthetic merge, GitHub merge, and EAS preview sequence.

For direct GitHub CLI operations, use `node scripts/parallel/gh.mjs <gh arguments>` so the repository-scoped Git Credential Manager entry is supplied ephemerally without storing credentials in a worktree.
