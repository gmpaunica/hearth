# Hearth — Status, Vision & Handoff

> **Read this first every session.** It's the single source of truth: the
> vision, what works, how to make + ship changes, and the backlog. Keep it
> current. Companion docs: `PRODUCTION_PLAN.md` (roadmap), `AGENTS.md` (use the
> exact Expo v57 docs), `EXPERIENCE_ROADMAP.md` (approved experience direction
> and one-feature-at-a-time review queue), `dev/README.md` (browser
> verification).

## Parallel delivery system — 18 August 2026

- `app/integration` is the protected phone staging trunk. Feature tabs use
  isolated Codex worktrees and machine-readable GitHub issue reservations;
  overlapping paths are owned by the lowest claim number.
- `Room.tsx` is now a compatibility export. `LivingRoom.tsx`, `Bedroom.tsx`,
  and `Garden.tsx` own their feature geometry while the small
  `RoomComposition.tsx` topology remains integrator-owned. The behavior-
  preserving split was exported and published in EAS group
  `fae8a07c-ee0d-40fb-9628-f13b468948c3` for runtime `1.0.3`.
- Repo policy, role hooks, `$hearth-worker`/`$hearth-integrator`, claim/CI
  validators, atomic integration state, idempotent preview publication, and
  synthetic merge validation are committed infrastructure. Merges and preview
  updates are serialized; native/database PRs require explicit authorization.
- `app/integration` is pushed and protected with its required gate, PR-only
  changes, admin enforcement, merge commits, and force-push/deletion disabled.
  The six coordination labels are installed. GitHub helpers obtain the existing
  repo-scoped Git Credential Manager token ephemerally; no token is copied into
  worktrees. Creating the five-minute task in the Codex desktop UI remains the
  one UI-only activation step.

## The vision (owner's intent)

Hearth is a **two-person relationship app**. A couple shares one cozy voxel
home (floating isometric diorama, "Tuber Simulator" lineage, locked "Style F"
pixel look). You leave a **privacy-safe emotional signal** by moving your
character to a place in the room (fireplace = "I want to make up", sofa =
comfort, table = talk, garden = space, rest = overwhelmed). Your partner gets a
gentle nudge, responds softly, and the fireplace path resolves in a warm
reconciliation glow (a heart pops). Low-pressure, non-blaming.

**EXPERIENCE FIRST, ONE COMPLETE LOOP AT A TIME.** Functionality alone is not
enough: each important action needs understandable buildup, mutual
participation, and visible aftermath. Improve the interface where it makes the
current interaction warmer and clearer, while avoiding unrelated visual or
feature expansion during an active review gate.

**Where it's going (build the systems now; 2D art via Higgsfield later):**
- **Customizable characters** — hair, face, simple stuff first; clothing/
  unlockables later. Also makes identity obvious.
- **The garden**, unlocking ~1 month in, will eventually hold **memories / seeds**.
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

## Current owner-directed priority

The current owner-authorized gate is **Moments 1.0.3 — Owner Review**, revised
18 August. Moment endings now release avatars in place; the garden threshold no
longer flickers; the real fireplace replaces the floating orb as the current
status/Today surface; difficult Fireplace Moments temporarily show **tending**;
and a large projected split heart owns mutual readiness. The centered 48-pixel
dock keeps home controls visible, response confirmations are action-specific
scrapbook postcards, and Fredoka/Nunito give Moments the requested warm bubbly
voice. Backend contracts remain unchanged from deployed migration
`20260817120000`. The canonical phone client passes TypeScript, 74 tests,
Android/iOS/web export, changed-file lint with zero errors, and 20 real-touch
sheet cycles at 390×844. Update group
`726847ac-2fab-4344-95b9-f6e1e842151a` is verified latest on `preview` for
runtime `1.0.3`; its locally generated Android fingerprint remains exactly the
installed versionCode 7 hash `24a442c968109b1b090e222da541456e2390372a`.
Run the two-open and alternating-author two-phone smoke gates, then stop for
owner review. Do not start voice notes; microphone support requires a new APK.

## Current state (what works, on real Android devices)

- Expo 57 / RN 0.86 / react-three-fiber. Supabase backend. Shipped as an
  Android EAS "preview" APK on two phones; **over-the-air updates** live.
- **Onboarding** (intro + name), **pairing** (anon auth, 6-char code, full-home
  guard, "Start over" exit on the waiting screen).
- **Moments 1.0.3 Owner Review**: **How do you feel right now?** divides six
  detailed 40×18 run-length mosaics into **About us** and **What I need**. One
  continuously mounted sheet follows the thumb between a measured expanded
  position and centered 48-pixel dock, including top-of-list scroll handoff,
  flick/midpoint settling, Android Back, and accessibility actions. The dock no
  longer covers the wardrobe and has no minimize chevron. Response previews are
  destination/action-specific 2D postcards with no avatar names or generic pair
  render. Fredoka headings, Nunito copy, pastel paper, tape, and heart stickers
  replace the sharper editorial treatment.
- **Spatial consequences**: partner action, readiness, and drawing events play
  exactly once in pixel bubbles at seven projected world anchors without camera
  theft. Settings/background delivery queues; cold launch hydrates current
  hearts, actions, and Today props without replay. Positive non-Romantic endings
  dock, focus, play the fast fullscreen pixel heart, and restore the camera.
  Romantic uses two small bed-side hearts. Negative paths show none.
- **Fireplace and Rest**: The real fireplace is tappable and opens its compact
  current-state/Today card; there is no notebook or history surface. Fireplace
  readiness is controlled only through the large speech-bubble heart above the
  fire, with stable member-A-left/member-B-right halves and immutable ready/
  reverse events. Moment endings stand each avatar at the live position before
  natural movement resumes instead of snapping to canned idle coordinates.
  Rest sends a validated real 12×12 doodle, duck/frog/dancing-toast visitor, or
  non-contact hug-wave; all have previews, scene consequences, bubbles, and
  durable Today representations.
- **Daily ritual fire**: the server home-day state remains **steady** before 7
  PM with no sketches, **low** afterward, **warming** with one contribution,
  and **glowing** with both. The physical fireplace consumes that ritual state
  outside Moments. A difficult active Fireplace Moment temporarily presents
  **tending** in both the flame and status card, rising as heart halves fill,
  then returns to the unchanged ritual state. Only the current user's missing
  sketch gets a private reminder; no blame, streak, failure, or score is stored.
- **Push notifications**: WORKING (Firebase/FCM set up). Edge Function
  `notify-signal` + DB trigger → the NOTIFICATIONS copy to the partner.
- **Living home**: starts sparse, fills in on a milestone ladder (sofa d3,
  table d7, shelves/plants d14, **bedroom+bed d21**, **garden d30**); signals
  gated to unlocked places; "your home grew" card; drag-to-pan + pinch-to-zoom.
- **Approved visual system**: the whole app now follows the owner’s warm Memory
  Garden target—ivory/peach atmosphere, terracotta and cocoa architecture,
  muted sage foliage, blush blossoms, amber window light, and editorial paper
  UI. Voxel faces use baked directional color and contact occlusion; the shared
  360-art-pixel pass adds a restrained warm grade, highlight lift, daylight
  veil, and vignette without smoothing edges. Cool/rain modes remain cohesive.
- **Reference-sheet characters**: one shared 26-cell coarse renderer now powers
  Home, Wardrobe, thumbnails, and the development Character Lab. Member A
  defaults to the coral sweater/long auburn waves; member B defaults to the
  olive hoodie/chocolate crop. Faces use warm cocoa ink, compact tapered skin
  volumes, profile eyes/noses, closed shaded hair from all five validation
  directions, chunky separated footwear, and non-overlapping arm/clothing
  cells. Wardrobe full looks preserve skin, hair, face, and accessories. Fixed
  preview materials cannot inherit the previous room mood tint.
- **Multi-room home** ✅: living room, bedroom, and garden now read as one
  connected dollhouse with real shared-wall thresholds rather than remote
  platforms joined by bridges. The living room is the default close frame;
  drag/pinch reaches the garden at the west doorway and bedroom through the
  back arch. `src/scene/shell.ts` owns stable sockets and offsets,
  `PlatformFx.tsx` supplies warm plinth trim/contact shadow/halo, and modular
  `LivingRoom`/`Bedroom`/`Garden` builders live in isolated files under
  `src/scene/rooms/`; `RoomComposition.tsx` owns only shared topology and
  progression gating, while `Room.tsx` remains a compatibility export.
- **`PREVIEW_UNLOCK_ALL`** (in `homeProgress.ts`) is currently **`true`**: the
  whole home is unlocked from day 0 so every room is visible immediately while
  testing (a fresh couple would otherwise wait to d21/d30). Flip it to `false`
  to restore the "home grows over time" milestone pacing.
- **Bedroom** holds the tasteful **"feeling romantic" signal** (the bed): leave
  it → your partner "Come close" → you sit together as a **heart pops over the
  bed** (the reconcile heart is spot-aware — fire *or* bed). Consent-aware
  responses ("Just hold me", "Not tonight"). Needs `romantic.sql` (below).
- **Garden (composition not approved)** currently remains a dense destination:
  layered soil/plinth, irregular
  hedges, flowering borders, branching stone paths, heart topiary, large cherry
  tree with reduced-motion-safe falling petals, olive tree, picnic nook,
  lanterns, keepsake plinth, rose bushes, animated koi pond with shimmer, and
  the existing space-signal bench. Per 9 August feedback, the next map gate must
  enlarge/simplify this space and defer the large cherry tree and koi pond until
  the expandable-garden stage.
- **Daily drawing** ✅: high-resolution portrait pixel note, one per person per
  server home day (upserts). Pencil satellite / spatial drawing bubble / tap the
  wall frame → the panel ("From them" / "Yours",
  paint + Send once). Opening the partner's actual drawing persists a local,
  per-person/per-day read receipt, so the banner and badge stay dismissed after
  restarting the app without exposing read activity to the partner. Shows on an
  **easel/wall frame** in the room as voxels.
- **Header:** **Day N of being together** now shares HEARTH's font family,
  colour, weight, and uppercase treatment.
- **Settings**: notifications toggle, privacy note, sign out, unpair.
- **UI**: onboarding, pairing, signals, drawing, settings, wardrobe, and
  Character Lab share ivory paper surfaces, cocoa serif hierarchy, terracotta
  actions, sage/gold accents, and warm restrained shadows.
- **Accessibility**: reduce-motion softens glow/hops and stops optional shimmer
  and falling-petal motion while keeping each state visually legible.

## How to continue (dev workflow) — IMPORTANT

- **Branch:** `claude/session-c959ub`. Commit + push here.
- **Ship a code change (no rebuild):** `git pull` then
  `eas update --branch preview --message "..."`. Owner reopens the app twice.
  Works for all JS/scene changes.
- **A rebuild is only needed for native changes** (new native SDK, Firebase/
  app.json native config): `eas build --platform android --profile preview`.
- **Supabase deploys** (owner runs SQL in the dashboard SQL editor; the app
  can't create tables). Files in `supabase/`: `schema.sql` (base), then
  `notifications.sql`, `unpair.sql`, `drawings.sql`, `romantic.sql`. The
  `notify-signal` Edge Function is deployed via the dashboard Functions editor.
  **A new feature that needs a table won't work until its SQL is run — always
  call this out.**
- **⚠️ ACTION NEEDED for the romantic signal:** run `supabase/romantic.sql`
  once in the SQL editor — it widens the `signals.type` CHECK constraint to
  allow `'romantic'`. Until then, leaving the bedroom signal *looks* fine on the
  sender's phone (optimistic) but the DB insert is rejected, so it never reaches
  the partner or fires a notification. Optional: redeploy `notify-signal` for the
  tailored push copy ("Someone is thinking of you"); until then it falls back to
  the generic "Something has changed at home."
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

### Parked — multi-room polish
- **Pan clamp is a square** (`camState.limit` ±box), so you can drag into empty
  void at the diagonal corners. Clamp to a band along the room row (the
  screen-right axis) so panning feels rail-guided between rooms.
- **Room-snap / peek affordance** — the rooms are discoverable only by dragging.
  Consider gentle snap-to-room on release, or small arrow/edge hints so a new
  user knows there's more to scroll to.
- **Furniture fill** — bedroom (wardrobe, nightstand) and garden (more beds, a
  path, memories/seeds) can hold more; general voxel build-out still welcome.

### Open / smaller
- **Moments 1.0.3 physical release gate** — install versionCode 7 on both test
  phones, open once to download update group
  `a75cf0c3-ceba-4f6b-96f0-bf4400eff7a5`, fully close and open again, alternate
  authors across all six destinations, and record the two-account smoke matrix
  before owner review. No Android/portable phone is connected to this
  workstation, so this remains an owner/device gate.
- **Live-sync staleness** — mitigated (foreground re-hydrate); verify on device.
- **Literal kiss** on reconcile (currently heart + hops) if the heart isn't
  enough.
- **Mutual-signal flow** — both fireplace at once is unblocked but not elegant.

### Deferred / needs owner or 2D art (Higgsfield)
- iOS build (Apple Developer account, $99/yr).
- Garden memories/seeds; wall paintings; onboarding illustrations.
- Google Play release (Phase 9).

## History (recent, newest first)
Character reference correction (canonical coral/olive identities, 26-cell
proportions, tapered faces, five-angle hair closure, fixed Wardrobe palette,
clear idle and sofa placement; Android/iOS preview group
`b0b69342-1154-4009-a606-f1f2213c0e73`, runtime `1.0.0`, verified latest) →
Memory Garden visual overhaul (ivory/peach atmosphere, baked voxel shading,
golden rays/glow, connected architectural detail, dense cherry-tree garden,
upgraded furniture, editorial UI and close room framing; preview group
`7b433a70-b32e-4125-af29-c66131ea8bfe`) →
Multi-room home (floating living/bedroom/garden platforms panned between +
bridges; living-room cleanup: partition removed, drawing frame moved, doorway
plant + stacked paintings removed, rest couch relocated; garden is now a real
platform; idempotent realtime SQL) →
House build-out (bigger room + camera reframe, bedroom nook + double bed,
"feeling romantic" signal with spot-aware heart pop, bigger sofa, drawing frame
moved above the bed; adds `supabase/romantic.sql`) →
Daily-drawing fixes (paint-coord bug, 32² grid, send-once, wall frame, pinch
zoom) → daily-drawing ritual + love polish (heart, bubble icons, bubbly cards)
→ round-2 device fixes (identity root-cause, snap-open, rest couch) → EAS build
+ Firebase/notifications working + OTA → onboarding → unpair → settings → living
home (progression/pan) → Phase 6 push → Phase 4/5 auth+pairing+realtime + the
two silent-write/one-sided-glow fixes.
