# Hearth 🔥

A **two-person relationship app**. A couple shares one cozy voxel home — a
cluster of floating isometric rooms you pan between. You leave a **privacy-safe
emotional signal** by moving your character to a place in the home (fireplace =
"I want to make up", sofa = comfort, table = talk, garden = space, rest =
overwhelmed, bedroom = feeling close). Your partner gets a gentle nudge, responds
softly, and the fireplace path resolves in a warm reconciliation glow. Plus a
daily pixel-drawing ritual. Low-pressure, non-blaming, ambient.

Expo (SDK 57) + React Native + `@react-three/fiber` voxel scene, Supabase
backend (auth, realtime, RLS, edge-function push), shipped to Android via EAS.

Durable owner feedback and accepted staged product decisions live in
[`docs/universal-brain.md`](docs/universal-brain.md).

## 📖 Start here

- **[`HANDOFF.md`](./HANDOFF.md)** — the complete, self-contained onboarding:
  vision, full architecture (file-by-file), the multi-room system, the backend,
  how to run/ship, and the gotchas. **Read this first.**
- **[`STATUS.md`](./STATUS.md)** — the living status + backlog. Keep it current.
- **[`MILESTONE_1_BASELINE.md`](./MILESTONE_1_BASELINE.md)** — the verified
  `1.0.4` technical baseline, migration ledger, and owner gates.
- **[`MILESTONE_9_RELEASE_HARDENING.md`](./MILESTONE_9_RELEASE_HARDENING.md)** —
  the verified `1.0.5` local release candidate and performance evidence.
- [`RELEASE_CHECKLIST_1.0.5.md`](./RELEASE_CHECKLIST_1.0.5.md) and
  [`ROLLBACK_NOTES_1.0.5.md`](./ROLLBACK_NOTES_1.0.5.md) — ordered authorization,
  two-phone, rollout, and recovery gates.
- [`PRODUCTION_PLAN.md`](./PRODUCTION_PLAN.md) — the original phased roadmap.
- [`AGENTS.md`](./AGENTS.md) — Expo changed a lot in v57; use the exact versioned
  docs.
- [`dev/README.md`](./dev/README.md) — browser-based visual QA (sandbox tooling).
- [`docs/art-bible.md`](./docs/art-bible.md) — the locked "Style F" visual target.

## Quick start

```bash
npm install
npx tsc --noEmit      # must stay clean
npx expo start        # open on a device/emulator, or add --web for a quick look
```

Only publish a JS/assets-only change after confirming that its native fingerprint
matches the installed preview. See `HANDOFF.md` §11 for the full shipping and
Supabase deployment gates.
