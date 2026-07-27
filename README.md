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

## 📖 Start here

- **[`HANDOFF.md`](./HANDOFF.md)** — the complete, self-contained onboarding:
  vision, full architecture (file-by-file), the multi-room system, the backend,
  how to run/ship, and the gotchas. **Read this first.**
- **[`STATUS.md`](./STATUS.md)** — the living status + backlog. Keep it current.
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

Ship a JS/scene change over-the-air (no rebuild): `eas update --branch preview
--message "..."` then reopen the app twice. See `HANDOFF.md` §11 for the full
shipping + Supabase deploy steps.
