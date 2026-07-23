# Hearth — Status, Vision & Backlog

> Living doc. Read this first each session. It captures where we are, the
> long-term vision (owner's words), and the running bug/feature backlog from
> real testing. Update it as things change.

## The vision (owner's intent)

Hearth is a **two-person relationship app**. A couple shares one cozy voxel
home (floating isometric diorama, "Tuber Simulator" lineage, locked "Style F"
pixel look). You leave a **privacy-safe emotional signal** by moving your
character to a place in the room (fireplace = "I want to make up", sofa =
comfort, table = talk, garden = space, rest = overwhelmed). Your partner gets a
gentle nudge, responds softly, and the fireplace path resolves in a warm
reconciliation glow. Low-pressure, non-blaming.

**Where it's going (not built yet — build the systems, art via Higgsfield later):**
- **Customizable characters** — definitely wanted: hair, face, simple stuff
  first; unlockables/clothing later. Also makes identity obvious.
- **Consistent character identity** — your character (colour/look) is *you*,
  shown the same on both phones. Not "self = red, partner = green".
- **A garden**, unlocking ~1 month in, that holds **memories / seeds**.
- **An expandable house** — physically grows over time, not just fills in.
  Room could get slightly bigger + more furniture even before the art pass.
- **Room customization as rewards** — new placeable components granted at
  milestones (a week, a month) AND for resolving conflicts; the couple chooses
  where things go.
- **Daily drawing / note** ★ owner's favourite: a little drawing or message
  from your partner that resets every day; you come check it. Lives somewhere
  in the app AND is represented by a physical object in the room (an easel or
  frame). Higgsfield art could frame this beautifully.
- **Cutesy everything** — Sims-style: sit-down animation, thought bubble over
  the head, bubblier/sweeter message boxes, a little jump or kiss on
  reconciliation. The feel should be soft and bubbly.
- **Component art via Higgsfield** — owner can hook up Higgsfield when needed.
  Note: Higgsfield = 2D art (paintings, onboarding, drawing-frames); in-room
  3D furniture is hand-built voxel code, no Higgsfield needed.
- **Deeper interactions** — the loop is too thin: "ask to talk later" does
  nothing visible; responses should have consequences in the room. The core
  product idea needs sharpening (see "What Hearth is for", below).

## What Hearth is for (working answer to "what does it DO for a couple?")

1. **Say the unsayable, gently.** When talking is hard, moving your character
   says "I want to make up / I need space / I'm overwhelmed" without blame.
2. **Ambient presence.** Opening the app shows where your partner *is*
   (emotionally) right now — like glancing across a shared room.
3. **Low-stakes repair.** The fireplace arc turns "who apologises first" into
   a tiny ritual with a warm payoff both see.
4. **A shared thing you tend.** The home grows with the relationship —
   milestones, unlocked furniture, the daily drawing — so checking in daily
  has a reason beyond conflict.
Every feature should serve one of these. Responses that "do nothing" break #3
and need visible consequences (partner sees acknowledgement; scheduled
check-ins actually schedule something; resolved conflicts leave warmth).

**Guiding priority: FUNCTIONAL FIRST.** The on-screen look is *not* final and
we polish graphics at the very end. Don't spend effort on the visual style now.

## Current state (what works)

- Expo 57 / RN 0.86 / react-three-fiber. Supabase backend (auth, pairing,
  realtime, RLS). Runs on web preview and as an Android EAS build on device.
- **Pairing**: anonymous auth, create/join by 6-letter code, "home is full"
  guard. Onboarding (intro + name).
- **Signals + realtime**: leave a signal → your character walks there → partner
  sees a card; responses sync; fireplace "Sit beside them" → reconciliation
  prompt → "We're okay now" glows on both.
- **Push notifications**: WORKING on real Android devices ✅. Edge Function
  `notify-signal` + DB trigger sends the NOTIFICATIONS copy to the partner;
  Firebase/FCM is set up (google-services.json committed; FCM V1 service-account
  key uploaded to Expo via eas credentials).
- **Over-the-air updates**: EAS Update is configured (expo-updates, channel
  "preview", runtimeVersion appVersion). JS/scene changes now ship via
  `git pull` + `eas update --branch preview` — no rebuild. Only native changes
  (new SDKs, Firebase-type config) need a full `eas build`.
- **On device**: installed as an Android EAS "preview" APK on two phones.
- **Settings**: notifications toggle, privacy note, sign out, leave-home/unpair.
- **Living home**: starts sparse (just the fire), fills in on a milestone ladder
  (sofa d3, table d7, shelves/plants d14, garden d30); signals gated to unlocked
  places; "your home grew" milestone card; drag-to-pan camera.
- **Accessibility**: reduce-motion softens the glow.

Backend pieces the owner deploys via the Supabase dashboard (SQL/functions):
`supabase/schema.sql`, `supabase/notifications.sql`, `supabase/unpair.sql`, and
the `notify-signal` Edge Function.

## Backlog — from real two-phone testing (prioritised)

### Fixed (shipped in the current build)
- **[NOTIFS]** ✅ Push works on device (Firebase/FCM set up).
- **[SCENE]** ✅ Opens at the current spot (snap on hydrate), no replayed walk.
- **[PAN]** ✅ Vertical drag no longer inverted.
- **[SPOTS]** ✅ "Resting area" moved out of the fireplace to its own corner.
- **[IDENTITY]** ✅ Character colour tied to the person (same on both phones).
- **[FLOW]** ✅ Non-join answers now have an "Okay" exit (no more dead-end).
- **[PAIRING]** ✅ "Start over" exit on the waiting screen (was a trap).
- **[OTA]** ✅ Over-the-air updates configured.

### Still open (functional)
1. **[SYNC] State can go stale.** One phone showed the partner at the fireplace
   when they weren't. Mitigation shipped: re-hydrate on app foreground. Verify
   on device; if still flaky, resubscribe the realtime channel on foreground.
2. **[FLOW] Mutual-signal tangle.** Both leaving a fireplace signal at once, both
   answering "Not ready yet", is still confusing. The single-exit "Okay" unblocks
   it, but a fuller reconciliation state machine (who's waiting on whom) is worth
   a dedicated pass.
3. **[FLOW] Thin responses.** "Ask to talk later" (and similar) have no visible
   effect. Design pass needed: every response leaves a trace (ack the partner
   sees, a scheduled nudge, warmth added to the room).

### Round-3 build (daily drawing + love polish)
- **[DRAWING]** ✅ Daily drawing ritual built. `drawings` table (supabase/
  drawings.sql — owner must deploy). Pixel-art canvas (14×14, PALETTE), one per
  person per day (upsert), resets daily (UTC). Envelope button (top-left) opens
  the panel: "From them" (partner's art) / "Yours" (paint + send). Realtime in
  its own channel (won't break signals if drawings.sql not yet run). An **easel**
  in the room (day-0 component) shows the partner's drawing as flat voxels.
- **[CUTE]** ✅ Thought bubble now shows a meaningful icon (heart / "…" / leaf /
  "z") not a dot; a big pink **heart pops** above the pair on reconciliation +
  bigger springy hops; cards/sheets pop-in with bubblier corners.
- TODO next: literal kiss animation (faces together) is still just heart+hop;
  render the drawing bigger/clearer on the easel; deeper response consequences.

### Round-2 device feedback (fixes shipped via OTA — verify on device)
- **[IDENTITY root cause]** Avatar geometry was built once with first-render
  colours (useMemo with empty deps) — identity arrived a moment later and was
  ignored. Fixed: rebuild on colour change. Both phones should now agree.
- **[GLITCH]** A frame of "standing in the middle" before snapping to the real
  spot on open. Fixed: avatars stay hidden until the saved state has loaded,
  then appear already in place.
- **[REST]** Rest was "just sitting on the carpet". Added a small sage couch
  (RestNook) on the right side; rest now sits on it. Bigger room + more
  furniture still queued for the art pass.
- **[CUTE]** Thought bubble over a character with an active signal; a little
  double-hop on reconciliation; bubblier card corners + pop-in animation.

### Polish (later, after functional)
9. Cutesy animations: sit-down motion, Sims-style thought bubble.
10. Graphics/look pass — deferred to the end on purpose.

## Deferred / needs owner or art
- iOS build (needs Apple Developer account, $99/yr).
- Physically-bigger room + garden 3D + new furniture = Higgsfield art pass.
- Google Play release (Phase 9).
