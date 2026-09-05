# Hearth — Status, Vision & Handoff

> **Read this first every session.** It's the living status: the vision, what
> works, how to make + ship changes, and the backlog. Keep it current.
> **New to the project? Read `HANDOFF.md` first** — the complete, self-contained
> onboarding (vision + full architecture + backend + workflow + gotchas). Other
> companion docs: `PRODUCTION_PLAN.md` (roadmap), `AGENTS.md` (use the exact Expo
> v57 docs), `dev/README.md` (browser verification), `docs/art-bible.md` (look).

## Current backend checkpoint — 5 September 2026

This checkout is the isolated backend-hardening tree. The canonical installed
phone baseline is `1.0.4` in `C:\Windows\System32\hearth`; no phone preview may
be published from this tree.

The existing hardening work has been reviewed and locally checkpointed. Remote
migration history was inspected read-only and ends at `20260819143000`. The
living-home migration beginning at `20260822120000` is still undeployed, so its
client-controlled developer bypass was removed in place before first
deployment. No database migration, Edge Function, OTA, or native build was
deployed. See `MILESTONE_1_BACKEND_CHECKPOINT.md` for validation and the exact
deployment boundary.

Milestone 4 relationship-safety APIs are now also prepared locally: server-
owned generic/gentle notification privacy, private bidirectional pairing
blocks, requester-safe export, and retry-safe account deletion. The backend
suite passes 87/87 and all changed Edge Functions pass Deno type checking.
Local database/RLS execution remains pending because the Supabase Docker
database is not running. Nothing was deployed; see
`MILESTONE_4_RELATIONSHIP_SAFETY.md` for the contract and authorization gate.

## Historical Moments Owner Review backend — deployed 2026-08-17

- Additive migration `20260817120000_moments_owner_review_revision.sql` is
  deployed to Supabase project `gtdigidqsczptqpbplar`. It supersedes the earlier
  private-readiness and Moment-driven fire presentation without removing old
  RPC signatures or timeless/author-owned ending behavior.
- `couples.home_timezone` is nullable, exact-IANA validated, and initialized
  once by member A. `get_daily_ritual_snapshot()` returns the shared home date,
  timezone, 7-PM boundary, aggregate available/completed drawing units,
  steady/low/warming/glowing fire, and next server-derived refresh time. UTC is
  the consistent fallback before initialization.
- `moment_readiness_events` is immutable, couple-scoped, visible to both home
  members, and inserted only on a real ready/reverse change. The snapshot now
  exposes both active participants' readiness/timestamps and today's readiness
  events; outsider RLS and equal-value retry suppression remain enforced.
- Rest uses optional immutable action payloads and authenticated
  `respond_to_rest_moment`: exact version-1 12×12/six-colour doodle cells,
  duck/frog/toast visitor, or version-only hug. Legacy Rest identifiers remain
  harmless compatibility paths.
- Verification: 59/59 backend tests and a 20-session authenticated alternating-
  author live matrix pass, including timezone rules, aggregate fire progress,
  public reverse/ready sequences, strict payload rejection, idempotency,
  immutability, and outsider isolation.

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
  table d7, shelves/plants d14, **bedroom+bed d21**, **garden d30**); signals
  gated to unlocked places; "your home grew" card; drag-to-pan + pinch-to-zoom.
- **Multi-room home** ✅ (the big rework): the home is now a **cluster of
  floating corner-room dioramas** laid out on one screen-horizontal line and
  **panned between** (drag left/right). Each room is its own two-wall shell —
  interior partition walls always occlude in a fixed iso view, so rooms are
  separate platforms connected by little **plank bridges**, the proven pattern
  for cozy-home apps. The home *grows by adding rooms*: **living room** (default
  view) → a **bedroom** appears to the right at d21 → a **garden** to the left at
  d30. Architecture: `src/scene/shell.ts` (shared corner-shell + rug builders +
  `*_OFFSET`s), `PlatformFx.tsx` (per-room blue rim + warm halo), and modular
  `LivingRoom`/`Bedroom`/`Garden` in `Room.tsx`. Pan reach widens once other
  rooms exist. **New rooms slot in by adding an offset + a builder** — no rewrite.
  The default view zooms out just enough that the neighbouring rooms **peek in at
  the edges** (with the bridges) so it's obvious you can drag to them.
- **`PREVIEW_UNLOCK_ALL`** (in `homeProgress.ts`) is currently **`true`**: the
  whole home is unlocked from day 0 so every room is visible immediately while
  testing (a fresh couple would otherwise wait to d21/d30). Flip it to `false`
  to restore the "home grows over time" milestone pacing.
- **Bedroom** holds the tasteful **"feeling romantic" signal** (the bed): leave
  it → your partner "Come close" → you sit together as a **heart pops over the
  bed** (the reconcile heart is spot-aware — fire *or* bed). Consent-aware
  responses ("Just hold me", "Not tonight"). Needs `romantic.sql` (below).
- **Garden** is now a real explorable platform (grass, hedges, trees, flower
  beds, pond, bench) — the "I need some space" signal seats on its bench.
- **Daily drawing** ✅: 32×32 pixel note, one per person per day (upserts,
  resets daily UTC). Envelope button (top-left) / "Your partner drew you
  something" banner / tap the wall frame → the panel ("From them" / "Yours",
  paint + Send once). Shows on an **easel/wall frame** in the room as voxels.
- **Settings**: notifications toggle, privacy note, sign out, unpair.
- **Accessibility**: reduce-motion softens glow/hops.

## Moments Flow Correction backend — deployed 2026-08-14

- Additive migration `20260814180000_moments_flow_correction.sql` is deployed
  to project `gtdigidqsczptqpbplar`. It is the current Moments contract and
  supersedes older schedule, countdown, immutable-negative-choice, and Romantic
  expiry behavior without removing legacy RPC arguments or storage columns.
- Authenticated `set_moment_readiness(signal_id, ready)`,
  `resolve_moment(signal_id)`, and `cancel_moment(signal_id)` derive eligibility,
  terminal reason, and payoff on the server. Fireplace readiness is private and
  reversible; two simultaneous ready states resolve it. Table, Garden, Sofa,
  Rest, and positive Romantic endings are creator-owned.
- Fireplace/Table **Not now** remains open and later joinable. Garden and
  Romantic never auto-close. Legacy finalizers are harmless, the Romantic cron
  job is removed, and all compatibility schedule values are cleared and exposed
  as null.
- Every positive ending emits one durable `heart`; cancellation, deferral, and
  Romantic decline do not. The snapshot exposes destination-specific personal
  actions or `wait`, private readiness, immutable action events, completion
  author identity, and no relationship score.
- Validation passes 53/53 backend contracts. The authenticated production
  matrix passes 19 alternating-author sessions across all six destinations,
  including every current response/end path, readiness reversal, later joins,
  author-only resolution/cancellation, idempotency, RLS/outsider isolation,
  immutable events, and persistent Garden/Romantic states without client
  activity.

## Moments `1.0.3` v2 backend — deployed 2026-08-13 (superseded behavior)

- Additive migrations `20260813160000` through `20260813180000` are deployed
  to project `gtdigidqsczptqpbplar`; local and remote histories match.
- `moment_sessions`, `moment_participants`, and immutable completion events
  enforce one nonterminal v2 session per couple, typed destination/action
  allowlists, private completion choices, bounded immutable/removable notes,
  and presence-only idempotent movement.
- Garden/Rest are author-ended, Sofa care and remote Romantic answers end on
  response, Fireplace/Table require two private positive choices, and joined
  Romantic closeness alone has a fixed 20-minute client/`pg_cron` expiry.
- The v2 snapshot masks private choices, carries active state, typed presence,
  Today outcome notes, durable completion IDs, and read-only Earlier moments.
  Raw `__hearth_*` markers never enter it.
- Genuine legacy rows and RPC signatures remain available to old runtimes, but
  v2 rows are excluded from the v1 snapshot and guarded from legacy mutation.
- Validation: 40/40 backend tests and the authenticated two-account matrix pass
  all 29 response actions, transactional one-active locking, RLS, note removal,
  movement/return/end idempotency, completion privacy, legacy isolation, and
  fixed Romantic timing. A separate no-client-call proof confirmed that
  `pg_cron` completed a joined Romantic moment at its fixed 20-minute deadline
  (`2026-08-13T17:56:57.165Z` due; `2026-08-13T17:57:00.029344Z` completed).

## Moments visible consequences — deployed 2026-08-14 (superseded behavior)

- Additive migration `20260814120000` adds participant `joined_at`, immutable
  couple-owned `moment_action_events`, canonical response normalization, and
  the typed `join_moment(signal_id)` RPC. Existing signatures and schedule
  columns remain compatible, but new response paths ignore schedules.
- Fireplace/Table completion requires actual join state; delayed partners can
  join later. Sofa now stays open until its author chooses `feel_cared_for`.
  Creator-owned Garden/Rest endings, Romantic closure/expiry, presence safety,
  and repeat calls remain idempotent.
- The v2 snapshot now exposes participant join state, a typed personal next
  action, and current/today action events. RLS preserves couple isolation and
  action rows reject update/delete.
- Validation passes 47/47 backend tests and the authenticated paired-account
  harness passes all 19 canonical actions, aliases, delayed joining, join
  gates, Sofa completion, event immutability, RLS, idempotency, and persistent
  today props. Local and remote migration histories match.

## P0 production hardening — deployed 2026-08-05

The production-safety pass is complete in this worktree:

- Pairing and membership changes are RPC-only, serialized, and limited to one
  current home per identity. Invite codes remain six characters but now use a
  32-character unambiguous alphabet (30 bits) with collision serialization.
- Leaving a home deletes that relationship's signals, responses, drawings, and
  queued notifications; rotates the reusable invite; and resets the surviving
  home's progression age before another person can join.
- Signal recipients are captured at insert time. Resolution is one-way, and
  table/column grants plus RLS remove direct membership mutation and unnecessary
  writes.
- Push-token registration is epoch-checked, unique per physical token, and safe
  against an older async registration restoring a token after notification-off
  or sign-out.
- Push delivery uses a private Vault-backed webhook secret, a durable claimed
  outbox, bounded retries, Expo ticket/receipt checks, and generation-fenced
  token invalidation. Notification taps are accepted only for the active user
  and home.
- Sign-out first commits token invalidation + relationship cleanup in one server
  transaction, then clears local notification state and the local session.
- Verification: `npm test` (20 tests) and `npx tsc --noEmit` are clean. In this
  Windows checkout, use `node .\\node_modules\\typescript\\bin\\tsc --noEmit`
  if the Unix-style `node_modules/.bin` shim prevents `npx` from finding `tsc`.

### Production rollout completed 2026-08-05

The coordinated rollout is complete. `hardening.sql` preserved signals and
drawings authored by the members of currently paired homes, quarantined rows
that could not belong to a current pair, cleared all push tokens, and rotated
invite codes for currently waiting homes. Profiles and current paired
memberships were preserved.

- Matching Edge/Vault webhook secrets are configured.
- `hardening.sql`, `romantic.sql`, and the durable notification outbox/cron are
  live in Supabase. The migration preserved 93 paired-home signals and all 14
  drawings; it retired 23 stale waiting-home signals and cleared 3 push tokens.
- `notify-signal` version 4 is active with JWT verification off and private
  webhook authentication on.
- OTA update group `919ca2fc-4735-4426-be54-9e99d32f8fd7` is published to the
  `preview` branch for Android and iOS, runtime `1.0.0`.
- Reopen both phones twice so the client applies the OTA and re-registers the
  cleared push tokens, then verify signal → push → tap on the two real devices.

## How to continue (dev workflow) — IMPORTANT

- **Branch:** `claude/session-c959ub`. Commit + push here.
- **Ship a code change (no rebuild):** `git pull` then
  `eas update --branch preview --message "..."`. Owner reopens the app twice.
  Works for all JS/scene changes.
- **A rebuild is only needed for native changes** (new native SDK, Firebase/
  app.json native config): `eas build --platform android --profile preview`.
- **Supabase deploys** (owner runs SQL in the dashboard SQL editor; the app
  can't create tables). Files in `supabase/`: `schema.sql` (base), `unpair.sql`,
  `drawings.sql`, `romantic.sql`, `hardening.sql`, then `notifications.sql` after
  its Edge/Vault secret is configured. Existing production must use the P0 order
  above rather than rerunning `schema.sql`. The `notify-signal` Edge Function is
  deployed via the dashboard Functions editor.
  **A new feature that needs a table won't work until its SQL is run — always
  call this out.**
- **Romantic signal backend is live:** `supabase/romantic.sql` has been applied,
  and the deployed P0 Edge Function includes its tailored push copy ("Someone is
  thinking of you").
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

### Next up — multi-room polish
- **Pan clamp is a square** (`camState.limit` ±box), so you can drag into empty
  void at the diagonal corners. Clamp to a band along the room row (the
  screen-right axis) so panning feels rail-guided between rooms.
- **Room-snap / peek affordance** — the rooms are discoverable only by dragging.
  Consider gentle snap-to-room on release, or small arrow/edge hints so a new
  user knows there's more to scroll to.
- **Furniture fill** — bedroom (wardrobe, nightstand) and garden (more beds, a
  path, memories/seeds) can hold more; general voxel build-out still welcome.

### Open / smaller
- **Deeper response consequences** — "ask to talk later" etc. do nothing
  visible yet. Make every response leave a trace.
- **Live-sync staleness** — mitigated (foreground re-hydrate); verify on device.
- **Literal kiss** on reconcile (currently heart + hops) if the heart isn't
  enough.
- **Mutual-signal flow** — both fireplace at once is unblocked but not elegant.

### Deferred / needs owner or 2D art (Higgsfield)
- iOS build (Apple Developer account, $99/yr).
- Garden memories/seeds; wall paintings; onboarding illustrations.
- Google Play release (Phase 9).

## History (recent, newest first)
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
