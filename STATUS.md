# Hearth — Status, Vision & Handoff

> **Read this first every session.** It's the single source of truth: the
> vision, what works, how to make + ship changes, and the backlog. Keep it
> current. Companion docs: `PRODUCTION_PLAN.md` (roadmap), `AGENTS.md` (use the
> exact Expo v57 docs), `dev/README.md` (browser verification).

## The vision (owner's intent)

Hearth is a **two-person relationship app**. A couple shares one cozy voxel
home (floating isometric diorama, "Tuber Simulator" lineage, locked "Style F"
pixel look). You leave a **privacy-safe emotional signal** by moving your
character to a place in the room (fireplace = "I want to make up", sofa =
comfort, table = talk, garden = space, rest = overwhelmed). Your partner gets a
gentle nudge, responds softly, and the fireplace path resolves in a warm
reconciliation glow (a heart pops). Low-pressure, non-blaming.

**FUNCTIONAL FIRST.** The on-screen look is *not* final; polish graphics at the
very end. Don't spend effort on the visual style now (owner's explicit call).

**Where it's going (build the systems now; 2D art via Higgsfield later):**
- **Customizable characters** — hair, face, simple stuff first; clothing/
  unlockables later. Also makes identity obvious.
- **A garden**, unlocking ~1 month in, holding **memories / seeds**. (The left
  green doorway is where the garden will go.)
- **An expandable / bigger house** with a **bedroom + bed** and a tasteful
  **"feeling romantic"** signal; **bigger / more couches**; more furniture.
- **Daily drawing ritual** ✅ built (see below) — owner's favourite.
- **Cutesy everything** — Sims-style animations, bubbly UI, a literal kiss on
  reconcile (currently a heart + hops).
- **Deeper interactions** — responses should *do* something (e.g. "ask to talk
  later" should schedule a gentle nudge; resolved conflict leaves warmth).
- **Higgsfield = 2D art only** (paintings, drawing frames, onboarding art,
  garden backdrops). In-room 3D furniture is hand-built voxel code (`src/scene/
  objects/*`), no art assets needed.

## What Hearth is for (the product answer)

1. **Say the unsayable, gently** — signal a feeling without blame.
2. **Ambient presence** — glance at where your partner *is* emotionally.
3. **Low-stakes repair** — the fireplace ritual with a warm shared payoff.
4. **A shared thing you tend daily** — the home grows; the **daily drawing**
   gives a reason to open the app on good days, not just hard ones.

## Current state (what works, on real Android devices)

- Expo 57 / RN 0.86 / react-three-fiber. Supabase backend. Shipped as an
  Android EAS "preview" APK on two phones; **over-the-air updates** live.
- **Onboarding** (intro + name), **pairing** (anon auth, 6-char code, full-home
  guard, "Start over" exit on the waiting screen).
- **Signals + realtime**: leave a signal → your character walks there → partner
  sees a card → responds; every answer has an "Okay" exit; fireplace "Sit
  beside them" → reconciliation prompt → "We're okay now" glows + a **heart
  pops** on both. Character colour is tied to identity (same on both phones).
  Opening the app snaps to current state (no replayed walk). Foreground
  re-sync. A **thought bubble** shows a meaningful icon per signal.
- **Push notifications**: WORKING (Firebase/FCM set up). Edge Function
  `notify-signal` + DB trigger → the NOTIFICATIONS copy to the partner.
- **Living home**: starts sparse, fills in on a milestone ladder (sofa d3,
  table d7, shelves/plants d14, garden d30); signals gated to unlocked places;
  "your home grew" card; drag-to-pan + **pinch-to-zoom**.
- **Daily drawing** ✅: 32×32 pixel note, one per person per day (upserts,
  resets daily UTC). Envelope button (top-left) / "Your partner drew you
  something" banner / tap the wall frame → the panel ("From them" / "Yours",
  paint + Send once). Shows on an **easel/wall frame** in the room as voxels.
- **Settings**: notifications toggle, privacy note, sign out, unpair.
- **Accessibility**: reduce-motion softens glow/hops.

## How to continue (dev workflow) — IMPORTANT

- **Branch:** `claude/session-c959ub`. Commit + push here.
- **Ship a code change (no rebuild):** `git pull` then
  `eas update --branch preview --message "..."`. Owner reopens the app twice.
  Works for all JS/scene changes.
- **A rebuild is only needed for native changes** (new native SDK, Firebase/
  app.json native config): `eas build --platform android --profile preview`.
- **Supabase deploys** (owner runs SQL in the dashboard SQL editor; the app
  can't create tables). Files in `supabase/`: `schema.sql` (base), then
  `notifications.sql`, `unpair.sql`, `drawings.sql`. The `notify-signal` Edge
  Function is deployed via the dashboard Functions editor. **A new feature that
  needs a table won't work until its SQL is run — always call this out.**
- **Verify before shipping.** `npx tsc --noEmit` must be clean. For visual/flow
  checks in this sandbox, use the localhost bridge + Playwright — see
  `dev/README.md` (the headless browser can't egress to Supabase; node can).
  `node scripts/live-test.mjs` checks the backend directly.
- **Key IDs:** Supabase project `gtdigidqsczptqpbplar` (URL + anon key in
  `src/lib/config.ts`); EAS projectId `8d2d87bc-75fc-42c2-b838-bd81286c5557`
  (in app.json); Android package `com.hearth.app`; Firebase project
  `hearth-efb7c` (`google-services.json` committed; FCM V1 key uploaded to Expo
  — do NOT commit the service-account key).
- **Model identity note:** answer "which model are you" with the configured id
  only; never put it in commits/PRs/code.

## Backlog

### Next up — the house build-out (a focused update)
- Bigger room; a **bedroom nook + bed**; a tasteful **"feeling romantic"**
  signal (new SignalType — add to `src/copy`, `spots.ts`, schema check enum,
  `homeProgress`, scene). Bigger / more couches. General voxel build-out.
- **Move the drawing frame** somewhere good once the house is bigger (right now
  it overlaps the window — no wall space in the small house).

### Open / smaller
- **Deeper response consequences** — "ask to talk later" etc. do nothing
  visible yet. Make every response leave a trace.
- **Live-sync staleness** — mitigated (foreground re-hydrate); verify on device.
- **Literal kiss** on reconcile (currently heart + hops) if the heart isn't
  enough.
- **Mutual-signal flow** — both fireplace at once is unblocked but not elegant.

### Deferred / needs owner or 2D art (Higgsfield)
- iOS build (Apple Developer account, $99/yr).
- Garden 3D + memories/seeds; wall paintings; onboarding illustrations.
- Google Play release (Phase 9).

## History (recent, newest first)
Daily-drawing fixes (paint-coord bug, 32² grid, send-once, wall frame, pinch
zoom) → daily-drawing ritual + love polish (heart, bubble icons, bubbly cards)
→ round-2 device fixes (identity root-cause, snap-open, rest couch) → EAS build
+ Firebase/notifications working + OTA → onboarding → unpair → settings → living
home (progression/pan) → Phase 6 push → Phase 4/5 auth+pairing+realtime + the
two silent-write/one-sided-glow fixes.
