# Hearth — Complete Project Handoff

> **Read this first, in full.** It is written to hand the project to a new
> assistant or developer cold: the vision and *why*, the whole feature set, the
> architecture file-by-file, the backend, how to run and ship, and the
> conventions/gotchas that aren't obvious from the code. Companion docs:
> `STATUS.md` (the living status + backlog, keep it current), `PRODUCTION_PLAN.md`
> (the original phased roadmap), `AGENTS.md` (use the exact Expo v57 docs),
> `dev/README.md` (browser verification), `docs/art-bible.md` (visual target).
>
> When you finish a piece of work, update `STATUS.md` and, if the architecture
> changed, this file.

---

## 1. What Hearth is (the product & the vision)

**Hearth is a two-person relationship app.** A couple shares **one cozy voxel
home** — a floating isometric diorama in the "Tuber Simulator" lineage, rendered
in a locked pixel-poster look ("Style F"). It is not a chat app and not a game;
it's an *ambient emotional-presence* app for exactly two people.

The core idea: **say the unsayable, gently.** You leave a **privacy-safe
emotional signal** by moving your character to a place in the home. Your partner
gets a soft nudge, glances at where you *are* emotionally, and responds without
pressure. The whole thing is **low-pressure and non-blaming**.

Signals (each is a place + a feeling):
- **Fireplace** — "I want to make up." (the repair ritual)
- **Sofa** — "I want comfort or affection."
- **Table** — "I would like to talk."
- **Garden** — "I need some space."
- **Rest** — "I feel overwhelmed or tired. This may not be about us."
- **Bedroom / romantic** — "I feel close to you tonight." (tasteful, consent-aware)

### What it's *for* (the product answer)
1. **Say the unsayable, gently** — signal a feeling without blame.
2. **Ambient presence** — glance at where your partner *is* emotionally.
3. **Low-stakes repair** — the fireplace ritual with a warm shared payoff (a
   heart pops on both phones when you reconcile).
4. **A shared thing you tend daily** — the home grows over time; the **daily
   drawing** gives a reason to open the app on good days, not just hard ones.

### Owner's guiding principles (important — these override aesthetic instincts)
- **FUNCTIONAL FIRST.** Build the *systems*; polish graphics at the very end.
  The on-screen look is provisional. Don't sink time into visual style now.
- **Cutesy everything** — Sims-style animations, bubbly UI, a literal
  kiss/heart on reconcile.
- **Deeper interactions** — responses should *do* something; a resolved conflict
  should leave a trace of warmth.
- **The home is expandable** and grows with the relationship (more rooms, a
  garden that opens ~a month in, memories/seeds later).
- **2D art comes later** via Higgsfield (paintings, onboarding art, garden
  backdrops). In-scene 3D furniture is **hand-built voxel code**, no art assets.

---

## 2. The core experience (user journey)

1. **Onboarding** — a short intro + pick a display name. (`Onboarding.tsx`)
2. **Pairing** — anonymous auth; one partner **creates a home** and gets a
   6-char invite code; the other **joins** by code. A home holds exactly two
   people. A "waiting for your partner" screen with a "Start over" exit.
   (`Pairing.tsx`, `authStore.ts`)
3. **The living home** — you see your shared floating home. It **fills in on a
   milestone ladder** as the relationship ages (see §7).
4. **Leave a signal** — a soft "Leave a signal" pill opens a sheet of the
   *unlocked* places. Choosing one sends **your character walking there** and
   shows your quoted self-copy. (`SignalSheet.tsx`, `SignalCards.tsx`)
5. **Partner reacts** — realtime: your partner sees your character move + a
   privacy-safe card with soft **response options**. Every answer has an "Okay"
   exit. (`useHearthSync.ts`, `signalStore.ts`)
6. **Repair ritual** — at the fireplace, the partner's "Sit beside them" →
   reconciliation prompt → "We're okay now" → a **warm gold glow + a heart pops
   on both phones**. The romantic/bedroom signal has the same payoff over the bed
   ("Come close").
7. **Push** — when you signal, your partner gets a gentle notification (even
   backgrounded), which deep-links into the home. (`notify-signal` edge function)
8. **Daily drawing** — once a day each partner can leave a tiny 32×32 pixel
   drawing for the other; it shows on a wall frame and resets daily.
   (`DailyDrawing.tsx`, `drawingStore.ts`)
9. **Settings** — notifications toggle, privacy note, sign out, unpair.

---

## 3. Current feature state (what works, on real Android devices)

- Expo 57 / RN 0.86 / `@react-three/fiber` + `three`, Supabase backend. Shipped
  as an Android **EAS "preview" APK** on two phones with **OTA updates** live.
- Onboarding, pairing (anon auth, invite code, full-home guard, start-over).
- Signals + realtime: leave → walk → partner card → respond → every answer has an
  exit; fireplace reconciliation glow + **heart pop on both**; identity-tied
  character colours (same person looks the same on both phones); open-app **snaps
  to current state** (no replayed walk); **foreground re-sync**; per-signal
  **thought bubble** icon.
- **Push notifications WORKING** (Firebase/FCM). DB trigger → `notify-signal`
  edge function → Expo push to the partner.
- **Multi-room home** (the current architecture — see §6): a **cluster of
  floating rooms you pan between** — living room (default) + bedroom (right) +
  garden (left), connected by plank bridges. The home grows by *adding rooms*.
- **"Feeling romantic" signal** in the bedroom, with a spot-aware heart pop.
- **Daily drawing** ritual (owner's favourite).
- Settings; accessibility (reduce-motion softens glow/hops).

---

## 4. Tech stack

- **Expo SDK 57** (React Native 0.86, React 19), **expo-router** (file routes).
  ⚠️ Expo changed a lot in 57 — always check the exact versioned docs at
  `https://docs.expo.dev/versions/v57.0.0/` before writing Expo code.
- **3D:** `@react-three/fiber` v9 + `three` 0.185, a tiny custom **voxel mesher**
  (no external models; furniture is code).
- **State:** `zustand` (several small stores).
- **Backend:** **Supabase** — Postgres + Auth (anonymous) + Realtime + Edge
  Functions (Deno). Row-Level Security enforces per-couple isolation.
- **Push:** `expo-notifications` + Firebase/FCM V1 (Android).
- **Language:** TypeScript (strict). `npx tsc --noEmit` must stay clean.
- **Build/ship:** EAS Build (APK) + **EAS Update** (OTA for JS/scene changes).

---

## 5. Repo map (annotated)

```
app.json              Expo config: scheme "hearth", EAS projectId, FCM, updates URL.
eas.json              EAS build/update profiles.
google-services.json  Firebase Android config (committed; NOT the secret key).
tsconfig.json         Strict TS; "@/..." path alias → src/.

src/app/
  _layout.tsx         expo-router root layout.
  index.tsx           The one screen: mounts SceneCanvas+HomeScene and all overlays
                      (onboarding, pairing, signal cards, sheet, settings, drawing).

src/scene/            Everything inside the 3D canvas.
  SceneCanvas.tsx / .web.tsx   R3F <Canvas> host (native vs web); fixed ortho iso cam.
  HomeScene.tsx       Composes the world: CameraRig (framing+pan), Atmosphere, Room,
                      furniture objects (gated by progression), Avatars, effects.
  Room.tsx            Compatibility export for the room composition.
  rooms/
    LivingRoom.tsx    Living-room shell, fixtures, doorway, and backdrop.
    Bedroom.tsx       Bedroom shell and fixtures.
    Garden.tsx        Garden shell, planting, pond, and garden fixtures.
    RoomComposition.tsx  Small integrator-owned topology, void, bridges, and gates.
  shell.ts            Shared builders: paintBrickFloor, buildCornerShell, stripedRug,
                      and the room world OFFSETS (LIVING/BEDROOM/GARDEN_OFFSET).
  PlatformFx.tsx      Per-room blue plinth rim + soft glow + warm under-halo,
                      parameterized by a room's floor extent.
  voxel.ts            The voxel mesher: Vox (set/box/remove → merged BufferGeometry
                      with baked face shading), the shared voxelMaterial/voxelTint.
  VoxMesh.tsx         React wrapper: build a Vox once → a <mesh> with the shared material.
  objects/            Hand-built voxel furniture: Fireplace, Sofa, TableSet, Bench,
                      Bookshelf, Plant, RestNook, Easel (daily-drawing frame), Bed.
  Avatar.tsx          Big-headed voxel person: damp-walks to its SPOT, leg scissor,
                      sit/stand blend, breathing, reconcile hop, thought bubble.
  spots.ts            SPOTS[spotId][avatarKey] = world pose (x,z,rotY,seatY) per signal.
  cameraState.ts      Mutable (non-React) camera state: pan offset, zoom, limit,
                      center + viewW/viewH (the framing HomeScene publishes).
  usePan.ts           Drag-to-pan + pinch-to-zoom gesture → cameraState.
  Atmosphere.tsx / atmoState.ts   Global mood tint (warm/cool/rain) + reconcile glow.
  Fire, Rain, Sparkles, ReconcileHeart   Particle/effect components (read atmo/scene).
  PixelPass.tsx / pixelState.ts   Low-res render pass for the crunchy pixel look.
  useReduceMotion.ts  Feeds OS reduce-motion into atmo.

src/state/            zustand stores + realtime spine.
  authStore.ts        Anonymous sign-in, couple load, create/join/unpair, phases
                      (loading/noHome/waiting/paired/error).
  sceneStore.ts       Pure render state: atmosphere, spots{a,b}, glowStartedAt,
                      glowSpot, snapAt. triggerGlow(spot), setSpot, requestSnap.
  signalStore.ts      Product signal flow: my/partner signal, responses,
                      reconciliation, romantic join; realtime ingest/hydrate; a
                      dev-only partner simulator.
  homeProgress.ts     The milestone ladder (HOME_STAGES) + PREVIEW_UNLOCK_ALL flag +
                      useHomeProgress() → {components, signals, stageIndex}.
  drawingStore.ts     Daily-drawing load/paint/send/ingest.
  useHearthSync.ts    The realtime spine: init auth, watch couple, hydrate + stream
                      signals/responses/drawings, foreground re-sync, push register.

src/components/       React-Native overlay UI (outside the canvas).
  Onboarding, Pairing, Settings, SignalSheet, SignalCards, HomeGrewCard,
  DailyDrawing, DrawingCanvas, PixelArt, PopIn, DemoPanel (dev-only QA).

src/copy/index.ts     SINGLE SOURCE OF TRUTH for all user-facing signal strings,
                      responses, reconciliation + notification copy. Screens import it.
src/theme/hearth.ts   APP_NAME, ui tokens, room palette, avatarPresets.
src/lib/              config.ts (Supabase URL/anon key + env override), supabase.ts
                      (client), db.ts (row types), notifications.ts, prefs.ts.

supabase/             SQL you run in the Supabase dashboard + the edge function.
  schema.sql          Base: tables, RLS, RPCs (create_couple/join_couple), realtime.
  notifications.sql   pg_net trigger → the notify-signal edge function.
  unpair.sql          leave_couple RPC.
  drawings.sql        drawings table + RLS + realtime.
  romantic.sql        Migration: widen signals.type CHECK to allow 'romantic'.
  functions/notify-signal/index.ts   Deno edge function: on new signal, push partner.

dev/                  Sandbox browser-QA tooling (see §10). Not shipped.
scripts/live-test.mjs Node script exercising the backend directly.
scripts/parallel/     Claims, scope/impact validation, cross-platform tests/lint/
                      exports, synthetic merges, locking, state, and EAS retry.
.codex/parallel-policy.json  Machine-readable worktree/integrator ownership policy.
.agents/skills/       Repo-local $hearth-worker and $hearth-integrator workflows.
docs/art-bible.md     The locked Style-F visual target and mandates.
```

---

## 6. The multi-room world (the most important system to understand)

**Why it's built this way.** The camera is a **fixed orthographic isometric**
view (45° azimuth, ~30° elevation, looking in from +x/+z). In a fixed iso view,
**any interior wall on the camera-facing side occludes what's behind it** — so
you *cannot* tile solid-walled rooms into one big floor without blocking the
view. The proven pattern (Cozy Room Decorator, Tizi, My Cozy Home, etc.) is
**room-based navigation**: each room is its own two-wall "shell", and you move
*between* discrete rooms. Hearth does exactly that.

**The layout.** The home is a **cluster of floating corner-room dioramas** laid
out on one screen-horizontal line and **panned between** (drag left/right, or
pinch-zoom). Each room is a self-contained platform:
- **Living room** — the default/home-base view (fireplace, window, sofa, table,
  bookshelf, bench, garden door, the daily-drawing frame, plants, rest couch).
- **Bedroom** — floats to the screen-right (`BEDROOM_OFFSET`); holds the bed
  (the "romantic" signal), a lamp, plant, heart picture.
- **Garden** — floats to the screen-left (`GARDEN_OFFSET`); an open-air platform
  (grass, hedges, trees, flower beds, pond, a bench = the "garden" signal).

Rooms are connected by little **plank bridges** over the starry void.

**The math (so you can add rooms safely).** Screen-right in world space is the
unit vector `R = (0.7071, 0, -0.7071)` (i.e. +x, -z). Placing a room at
`OFFSET = R * d` moves it purely screen-horizontally and keeps it at the **same
screen depth** (because moving along R keeps `x + z` constant), so rooms sit
side-by-side in a clean row. Current offsets: bedroom `(6.6, 0, -6.6)`, garden
`(-6.9, 0, 6.9)`. That spacing is about the tightest that avoids on-screen
overlap between ~7-wide rooms.

**Files & how to add a room:**
- `shell.ts` — `buildCornerShell(v, x0,x1,z0,z1)` builds a floor + back/left
  walls + plinth in a room's local grid. `stripedRug`, `paintBrickFloor` shared.
  Add a `NEWROOM_OFFSET`.
- `PlatformFx.tsx` — `<PlatformFx x0 x1 z0 z1 />` draws that room's blue rim +
  warm halo from its floor's world extent. Render one per room.
- `src/scene/rooms/NewRoom.tsx` — add a `<NewRoom>` component containing the
  shell VoxMesh, furniture, and `<PlatformFx>`. The protected integrator updates
  `RoomComposition.tsx` to gate it and connect shared topology after a worker
  requests that composition change.
- `spots.ts` — any signal seat in the new room is `OFFSET + local seat` (write
  the final world coords).
- `homeProgress.ts` — add a `HomeComponent` + a `HOME_STAGES` entry so it unlocks.

**Camera framing & pan** (`HomeScene.tsx` + `cameraState.ts`):
- The camera frames `camState.center{X,Z}` and spans `camState.view{W,H}` world
  units (larger = more zoomed out). `HomeScene` sets these: living-room-only is a
  snug view (viewW 8.2); once neighbouring rooms exist it zooms out a touch
  (viewW 13.5) so the neighbours **peek in at the edges** (a clear cue to drag).
- `camState.limit` (pan reach) widens to 7.6 when other rooms exist so you can
  scroll all the way to them. `usePan.ts` maps drag→offset (clamped to a square).
- Known rough edge (backlog): the pan clamp is a square box, so you can drag into
  empty void at the diagonal corners; a rail/band clamp + snap-to-room would be
  nicer.

**Unlocking for testing:** `homeProgress.ts` exports **`PREVIEW_UNLOCK_ALL`**
(currently `true`) which unlocks the whole home from day 0 so every room is
visible immediately. Set it `false` to restore the milestone pacing (§7).

---

## 7. Home progression (the "home grows over time")

`src/state/homeProgress.ts` is the single source of truth for *what is unlocked
at a given relationship age*. `HOME_STAGES` is a tunable ladder keyed by
`atDays` (days since the couple's `created_at`):

| Day | Stage | Adds |
|----|----|----|
| 0  | Moving in | fireplace, rest couch, drawing frame · signals: fireplace, rest |
| 3  | A place to rest | sofa · signal: sofa |
| 7  | Somewhere to talk | table · signal: table |
| 14 | Signs of life | bookshelf, bench, plants |
| 21 | Growing closer | **bedroom + bed** · signal: **romantic** |
| 30 | Room to grow | **garden** · signal: **garden** |

- `useHomeProgress()` returns the accumulated `{components, signals, stageIndex,
  next}`. The scene gates furniture/rooms on `components.has(...)`; the signal
  sheet gates places on `signals.has(...)`.
- `HomeGrewCard.tsx` shows a one-time "your home grew" celebration per new stage
  (remembered per couple in prefs).
- **New Higgsfield art or furniture slots in by adding a stage row** — no scene
  or logic rewrite.
- ⚠️ **`PREVIEW_UNLOCK_ALL = true`** currently short-circuits this (unlocks all).
  Flip to `false` for the real staged experience.

---

## 8. Signals, copy & realtime (the core loop internals)

- **Copy is the source of truth** in `src/copy/index.ts`: `SignalType`, the
  `SIGNALS` map (self/partner text, response options, label), reconciliation
  choices, and `NOTIFICATIONS`. **Never inline these strings elsewhere.** (The
  edge function keeps a *mirror* of `NOTIFICATIONS` — change both.)
- **`signalStore.ts`** holds `mySignal` / `partnerSignal` / `reconciling` and the
  actions. Flow:
  - `sendSignal(type)` — optimistic: set my signal + `setSpot('a', type)`
    (avatar walks), then insert into `signals`; realtime echoes it back with an id.
  - `respondToPartner(choice)` — record the response; if it's a "join" response
    (`JOIN_RESPONSES`) the responder walks to the spot; fireplace opens the
    reconciliation prompt; romantic fires the glow+heart over the bed.
  - `chooseReconciliation(choice)` — "We're okay now" → `triggerGlow()` (warm
    glow + heart) + resolve both signals; "We should talk first" → both to the
    table; "I need more time" → step back, signal stays open. The choice is
    broadcast over the `responses` channel so both screens mirror it.
- **`useHearthSync.ts`** is the realtime spine (mounted once at root): signs in,
  watches the `couples` row (partner join/leave), hydrates the current unresolved
  signals on open (so the scene shows *current state*, not just live deltas),
  subscribes to `signals`/`responses`/`drawings`, and **re-hydrates on
  foreground** (fixes staleness after backgrounding).
- **`sceneStore.ts`** is the pure render state the scene reads. `triggerGlow(spot)`
  is **spot-aware**: `ReconcileHeart.tsx` pops the heart over `SPOTS[glowSpot]`'s
  seats, so the same payoff lands over the fire *or* the bed. `requestSnap()`
  makes avatars jump to their pose instantly (used on hydrate so the app opens
  where things are, no replayed walk).
- **Avatar identity:** colour is tied to *who you are* (member_a wears preset a,
  member_b preset b) so the same person looks identical on both phones. Slot 'a'
  is always the local player.

---

## 9. Backend (Supabase) — project, data, deploy

- **Project:** `gtdigidqsczptqpbplar` (URL + publishable anon key are in
  `src/lib/config.ts`, overridable via `EXPO_PUBLIC_SUPABASE_URL` /
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`). The anon key is *publishable* — safe in the
  client; **all real permissions are enforced by RLS.**
- **Tables:** `profiles`, `couples`, `signals`, `responses`, `drawings`.
  RLS everywhere: a user only ever sees their own couple's rows.
- **RPCs (SECURITY DEFINER):** `create_couple()`, `join_couple(code)`,
  `leave_couple()`. Anonymous sign-in auto-creates a `profiles` row via trigger.
- **Realtime:** `signals`, `responses`, `couples`, `drawings` are in the
  `supabase_realtime` publication.
- **The app cannot create tables.** SQL is run by the owner in the dashboard SQL
  editor. **Deploy order** (safe to re-run; now idempotent):
  1. `schema.sql` (base)
  2. `notifications.sql` (after deploying the edge function)
  3. `unpair.sql`
  4. `drawings.sql`
  5. `romantic.sql` ← **required for the bedroom/romantic signal to sync** (it
     widens the `signals.type` CHECK to allow `'romantic'`; until it's run, a
     romantic signal looks fine locally but its DB insert is rejected, so it never
     reaches the partner or fires a push).
- **Edge function `notify-signal`** (`supabase/functions/notify-signal/index.ts`)
  is deployed via the dashboard Functions editor (`supabase functions deploy
  notify-signal --no-verify-jwt`). It reads the new signal, finds the partner,
  looks up their push token, and sends the matching `NOTIFICATIONS` copy through
  Expo push. Redeploy it when notification copy changes.
- **A new feature that needs a table/column won't work until its SQL is run —
  always call this out to the owner.**

---

## 10. Develop & verify

- **Install:** `npm install`. **Typecheck (must be clean before shipping):**
  `npx tsc --noEmit`.
- **Run normally:** `npx expo start` → open on a device/emulator (Expo Go or a
  dev build). `--web` runs the R3F scene in a browser for quick visual checks.
- **Backend from Node:** `node scripts/live-test.mjs` exercises auth, pairing,
  RLS, and realtime directly (no browser).
- **Sandbox browser-QA harness** (`dev/README.md`) — this is specific to the
  isolated CI/agent sandbox this was developed in, where the headless browser
  can't reach `*.supabase.co` but Node can. It runs a localhost→Supabase proxy
  (`dev/supabase-bridge.mjs`) + Metro (`CI=1 EXPO_PUBLIC_SUPABASE_URL=
  http://localhost:8443 npx expo start --web`) + Playwright screenshots. On a
  normal dev machine you **don't need any of this** — the app talks to Supabase
  directly. (Note: Metro in `CI=1` serves a stale bundle after edits — restart it
  after code changes; it also flakes on bind, so `pkill -9 node` + clear
  `.expo/web/cache` and restart if it won't come up.)
- **Verifying scene geometry without pairing:** the scene renders behind the
  overlays. A throwaway "preview harness" (temporarily forcing progression +
  hiding onboarding/pairing + snapping avatars via a URL hash) is the fast way to
  screenshot rooms/poses; always revert it before committing.

---

## 11. Ship a change

- **JS / scene / copy change → OTA, no rebuild:**
  ```
  git pull
  eas update --branch preview --message "..."
  ```
  The owner reopens the app **twice** (Expo applies the update on the next
  launch). This is how nearly all changes reach the phones. **Nothing you commit
  reaches a device until an `eas update` is published** — if the owner "can't see"
  a change, first confirm it was shipped (`eas update:list` on the `preview`
  branch).
- **Native change (new native SDK, Firebase/`app.json` native config) → rebuild:**
  `eas build --platform android --profile preview`.
- **Supabase change → run the SQL** in the dashboard (see §9). Edge-function
  changes → redeploy the function.

---

## 12. Key IDs & secrets

- Supabase project `gtdigidqsczptqpbplar`; **publishable** anon key in
  `src/lib/config.ts` (safe to ship). Service-role key lives only in the edge
  function's environment — **never commit it.**
- EAS `projectId` `8d2d87bc-75fc-42c2-b838-bd81286c5557` (in `app.json`);
  updates URL `https://u.expo.dev/<projectId>`; app owner `gmpaunica`.
- Android package `com.hearth.app`; deep-link scheme `hearth://`.
- Firebase project `hearth-efb7c`; `google-services.json` is committed (not
  secret); the **FCM V1 service-account key** was uploaded to Expo — **do NOT
  commit it.**
- Locked visual target: `docs/art-bible.md` ("Style F"). Palette + tokens in
  `src/theme/hearth.ts`.

---

## 13. Conventions & gotchas (things that will bite you)

- **Fixed iso camera = occlusion rules.** Only the back (`-z`) and left (`-x`)
  walls exist per room; the +x/+z sides are open to the camera. Anything you put
  on the camera-facing side of content will hide it. This is *why* rooms are
  separate platforms, not one floor. Keep new rooms as corner shells.
- **Voxel look is deterministic** (`voxel.ts`): shading is baked per face
  direction + a hash jitter; there are **no scene lights**. Mood is a single
  global tint (`voxelTint`) that `Atmosphere` animates. Don't add per-object
  lights — use the existing `atmo` scalars.
- **Copy lives in `src/copy/index.ts` only.** The edge function mirrors
  `NOTIFICATIONS` — change both.
- **RLS is the security boundary**, not the client. Test cross-couple isolation
  when touching data.
- **`PREVIEW_UNLOCK_ALL` is on** — real staged growth is off until you flip it.
- **Signal enum is duplicated** in three places that must agree: `SignalType`
  (copy), the `signals.type` CHECK (schema/`romantic.sql`), and any `SpotId`
  (`sceneStore.ts`) / `SPOTS` / `homeProgress` signal lists. Add a new signal in
  all of them.
- **Don't embed AI-model identifiers** (or any assistant's name/version) in
  commits, PR text, code comments, or shipped artifacts. Keep those out of the
  repo.
- **Optimistic writes:** `sendSignal` shows the walk immediately; the DB insert
  confirms via realtime. If a write is silently failing, check RLS and the
  `signals.type` CHECK first.

---

## 14. Backlog & roadmap

From `STATUS.md` (keep that current) and `PRODUCTION_PLAN.md`:

**Next up — multi-room polish**
- Pan clamp is a square box → clamp to a band along the room row + snap-to-room
  on release; add a small edge hint so new users know to scroll.
- Furniture fill: bedroom (wardrobe, nightstand), garden (more beds, a path,
  memories/seeds); general voxel build-out.

**Open / smaller**
- **Deeper response consequences** — "ask to talk later" etc. do nothing visible
  yet; make every response leave a trace.
- Live-sync staleness (mitigated by foreground re-hydrate; verify on device).
- A literal kiss on reconcile (currently heart + hops).
- Mutual-signal flow (both at the fireplace at once) — unblocked but not elegant.

**Deferred / needs owner or 2D art (Higgsfield)**
- iOS build (Apple Developer account).
- Garden memories/seeds timeline; wall paintings; onboarding illustrations.
- Google Play production release (Phase 9 in `PRODUCTION_PLAN.md`).

---

## 15. Immediate open items for whoever picks this up

1. **Ship the current work:** the multi-room home + garden + fixes are committed
   but **not yet OTA'd** — run `eas update --branch preview` and reopen twice.
2. **Run `supabase/romantic.sql`** in the dashboard so the bedroom/romantic
   signal actually syncs (and optionally redeploy `notify-signal` for the
   tailored push line).
3. Decide on `PREVIEW_UNLOCK_ALL` — keep it `true` while showing people the whole
   home, or set `false` to restore the day-21/day-30 growth for real couples.
4. Verify the full loop on two real devices after shipping (signal → walk →
   partner card → reconcile heart; visit all three rooms).
