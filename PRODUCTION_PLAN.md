# Hearth — Production Plan (v1)

## Context

**Hearth** is a two-person relationship app. Each couple shares one cozy voxel
home (a floating isometric diorama, Tuber-Simulator lineage). A partner leaves a
*privacy-safe emotional signal* by moving their avatar to a place in the room —
**fireplace** ("I want to make up"), **sofa** ("comfort/affection"), **table**
("let's talk"), **garden** ("I need space"), **rest** ("overwhelmed, may not be
about us"). The other partner gets a gentle notification, responds with a soft
option, and the arc resolves in a **fireplace reconciliation glow**. The point:
give couples a low-pressure, non-blaming way to signal emotional state.

We have a committed single-device visual prototype (Phase 0+1). The user has
confirmed **Style F** (the pixel-poster hero frame in `docs/reference/hero-F-pixel-poster.png`)
as the locked visual target. This plan is the roadmap from that prototype to a
shipped v1.

### Confirmed decisions
- **Backend:** Supabase (Postgres + Auth + Realtime).
- **First release scope:** Core loop only — pairing, the 5 signals, partner
  response, fireplace reconciliation glow + push. Garden/memories/seeds and the
  full 84-asset art set are **out of scope for v1** (listed at the end).
- **Platforms:** Android first (EAS build → Google Play), iOS after validation.

## Current state (what already exists)

- **Scaffold:** Expo 57 / expo-router / RN 0.86, `@react-three/fiber` + `three`,
  `zustand`. `app.json`, splash, icons in place.
- **Scene (committed + working):** `src/scene/HomeScene.tsx` composes Room,
  Fireplace, Sofa, TableSet, Bench, Bookshelf, Plants, Rain, Sparkles, two
  Avatars under a fixed ortho-isometric `CameraRig`.
- **Avatar behavior is DONE** (`src/scene/Avatar.tsx`): avatars damp-walk to
  `SPOTS[spot][avatar]` (`src/scene/spots.ts`), leg-scissor while moving,
  pose-blend to seated, breathe when idle. Driven by `useSceneStore`.
- **Mood system:** `src/scene/Atmosphere.tsx` + `atmoState.ts` — global voxel
  tint presets (warm/cool/rain) + an eased reconciliation gold glow. No dynamic
  lights (baked voxel shading).
- **Copy is written** (`src/copy/index.ts`): all signal self/partner text,
  responses, reconciliation prompts, notification strings.
- **Local state** (`src/state/sceneStore.ts`): `atmosphere`, per-avatar `spot`,
  `glowStartedAt`. Single-device only, no persistence.
- **Demo harness:** `src/components/DemoPanel.tsx` drives every spot/atmosphere/
  glow for visual QA. Gets replaced by real product UI.

### ⚠️ Immediate blocker
`HomeScene.tsx:6` imports `./PixelPass`, but **`src/scene/PixelPass.tsx` does not
exist** (uncommitted in-progress Style-F work). The app will not bundle until
this is created or the import removed. Fixing this is step 1 of Phase 2.

---

## Phase 2 — Lock the Style F look (visual)

Goal: the running app matches `hero-F-pixel-poster.png` before any product work.

1. **Create `src/scene/PixelPass.tsx`** — the post/render approach that gives the
   crunchy pixel-poster crispness in Style F. Implement as a low-res render
   target upsized with `NEAREST` filtering (render the R3F scene at a fraction of
   device resolution, blit to a full-screen quad), OR, if simpler and adequate on
   device, drop the post pass and lock the look via ortho zoom + `antialias:false`
   + snapped voxel grid. Whichever ships, **remove the dangling import** and keep
   `SceneCanvas` / `SceneCanvas.web.tsx` in sync.
2. **Hit the five largest gaps** vs. the hero frame (art-bible mandate): warm key
   glow from the fire, the blue rim-light on the plinth edge, ember/gold motes,
   book-spine color variety, plant silhouettes. Screenshot-compare each pass.
3. Confirm parity in both hosts: native (`SceneCanvas.tsx`) and web preview
   (`SceneCanvas.web.tsx`).

Critical files: `src/scene/PixelPass.tsx` (new), `src/scene/HomeScene.tsx`,
`src/scene/SceneCanvas*.tsx`, `src/scene/Fire.tsx`, `src/scene/Sparkles.tsx`,
`src/scene/Rain.tsx`. Reuse the existing `voxelTint`/`atmo` scalars — do not add
per-object lighting.

## Phase 3 — Real signal UI (replace the demo panel, still single-device)

Goal: a shippable interaction layer over the existing scene, no backend yet.

1. **Signal picker**: tapping into the room (or a bottom sheet) lets *you* choose
   one of the 5 signals. On selection, call `setSpot('a', signal)` — the avatar
   already walks there — and show the self-copy card (`SIGNALS[x].selfText`,
   italic/quoted per art bible). Reuse `ui` tokens from `src/theme/hearth.ts`.
2. **Response flow**: when the partner has an active signal, surface
   `partnerText` + `responses` as soft glass options; "Sit beside them" at the
   fireplace triggers `triggerGlow()`.
3. **Extract a product store** from `sceneStore`: keep `sceneStore` as the pure
   render/animation state, add `src/state/signalStore.ts` for
   product-level signal/response state (this becomes the thing synced in Phase 5).
4. Keep `DemoPanel` behind a dev flag for QA; it is not shipped.

Critical files: `src/app/index.tsx`, new `src/components/` screens/sheets, new
`src/state/signalStore.ts`, `src/copy/index.ts` (reuse verbatim).

## Phase 4 — Supabase: auth + pairing

Goal: two real users, one shared room.

1. Add `@supabase/supabase-js`; create `src/lib/supabase.ts` (URL + anon key via
   `expo-constants` / env). Set up the Supabase project + schema (below).
2. **Auth**: lightweight — email magic-link or anonymous session upgraded later.
   Store session with `expo-secure-store`.
3. **Pairing**: one partner creates a room → gets a short invite code / deep link
   (`hearth://join/<code>`, scheme already `hearth`); the other joins. A `couples`
   row links exactly two `profiles`. Guard: a room is full at two.
4. Persist "which room am I in" and rehydrate on launch.

### Data model (Supabase / Postgres)
- `profiles(id, display_name, avatar_key, created_at)` — RLS: self-only writes.
- `couples(id, invite_code, member_a, member_b, created_at)`.
- `signals(id, couple_id, from_user, type, created_at, resolved_at)` — the active
  signal(s). `type` ∈ the 5 SignalType values.
- `responses(id, signal_id, from_user, choice, created_at)`.
- RLS everywhere: a user can only read/write rows for a `couple` they belong to.

## Phase 5 — Real-time sync

Goal: a signal on one phone animates the partner's room in near-real-time.

1. Subscribe to `signals`/`responses` via Supabase Realtime, scoped to the
   couple. On insert, map `type` → `setSpot(partnerKey, type)` so their avatar
   walks to the spot; mirror your own optimistic updates.
2. Reconciliation: both partners choosing the fireplace path (or the "Sit beside
   them" response) writes a resolution and fires `triggerGlow()` on both devices.
3. Handle presence/late-join: on room open, fetch the latest unresolved signal so
   the scene reflects current state, not just live deltas.

Critical files: `src/lib/supabase.ts`, `src/state/signalStore.ts`,
`src/scene/*` (read-only consumers via the store — no scene rewrites needed).

## Phase 6 — Push notifications

Goal: deliver the art-bible notification copy when a partner signals.

1. `expo-notifications` for device push tokens (store on `profiles`).
2. A Supabase Edge Function (or DB webhook) fires on `signals` insert → sends push
   to the *other* member using `NOTIFICATIONS` strings from `src/copy/index.ts`
   ("Your partner has left a signal.", "The fireplace is glowing.").
3. Tapping a notification deep-links into the room with the signal in view.

## Phase 7 — Onboarding, persistence, settings

Goal: first-run and durability for the core loop (minimal, text-first — the 3
illustrated onboarding screens are v2).

1. Minimal 2–3 screen onboarding: what Hearth is → pick display name + avatar
   preset (`avatarPresets`) → pair or accept invite.
2. Rehydrate session + room on cold start; graceful "waiting for your partner to
   join" empty state.
3. Settings: sign out, unpair, notification toggle, privacy note.

## Phase 8 — Polish & minimal assets

1. App icon + splash in Style-F voxel look (art-bible asset #2/#3) — the two
   assets actually needed to ship. Skip the other ~80 gens for v1.
2. Empty/error/offline states; retry on Supabase network blips.
3. Performance pass on device (target 60fps; the pixel pass helps by rendering
   fewer pixels). Accessibility: legible copy, reduced-motion respect for glow.

## Phase 9 — Android release

1. `eas.json` + EAS Build (Android app bundle). Configure signing.
2. Store listing, privacy policy (couples data + push tokens), data-safety form.
3. Internal testing track → closed test with a few real couples → production.
4. iOS deferred until post-validation (same codebase, add EAS iOS profile +
   TestFlight later).

---

## Verification

- **Phase 2:** `npx expo start --web` and on device; screenshot vs.
  `hero-F-pixel-poster.png`, confirm the app bundles (PixelPass import resolved).
- **Phases 3–5:** two devices/emulators (or two sessions) paired to one room;
  signal on A → B's avatar walks to the spot and B sees the partner card;
  fireplace path → gold glow on both. Verify RLS by attempting cross-couple reads.
- **Phase 6:** background one device, signal from the other, confirm push arrives
  with the exact `NOTIFICATIONS` copy and deep-links correctly.
- **Phase 9:** install the EAS internal build on a physical Android device; run
  the full pairing → signal → reconcile loop cold.

## Out of scope for v1 (planned v2+)
- Garden "space" flow, seeds/blooms, memories timeline.
- The full ~84 Higgsfield asset set (wall paintings, window/garden backdrops,
  onboarding illustrations, memory-card frames).
- Room decoration/customization, 90° room rotation, sound (fire crackle, chime).
- iOS store release.
