# Hearth source backup and restore

This repository intentionally keeps the phone client and backend-hardening work
on separate branches. Do not merge or copy the dirty trees merely to make a
backup.

## Canonical branches

- `app/integration` — canonical Expo phone client and the default clone target.
- `claude/session-c959ub` — separate backend-hardening work.

The phone branch contains the durable product and design knowledge used across
Codex sessions, including `AGENTS.md`, `PRODUCT_BRIEF.md`,
`EXPERIENCE_ROADMAP.md`, `VOXEL_ART_DIRECTION.md`, and
`docs/universal-brain.md`.

## Restore on a new laptop

Clone the canonical phone client:

```powershell
git clone https://github.com/gmpaunica/hearth.git
cd hearth
git status
```

Create a separate backend-hardening checkout when needed:

```powershell
git fetch origin
git worktree add -b backend-hardening ..\hearth-backend origin/claude/session-c959ub
```

Clone the standalone website beside the app:

```powershell
git clone https://github.com/gmpaunica/hearth-site.git ..\hearth-site
```

Both repositories are private, so authenticate the new laptop with the same
GitHub account before cloning.

## What GitHub does not contain

Local environment files, signing credentials, private keys, dependency folders,
Expo machine state, and Supabase temporary state are intentionally excluded.
Restore secrets through the relevant provider dashboards or secret managers;
never commit them to Git.

The repository backs up source, migrations, assets, tests, and project
documentation. It is not a backup of live Supabase rows, provider-side secrets,
or EAS build artifacts.
