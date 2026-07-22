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
- **Customizable characters** — unlockables, hairstyles, clothing. (Later.)
- **Consistent character identity** — your character (colour/look) is *you*,
  shown the same on both phones. Not "self = red, partner = green".
- **A garden**, unlocking ~1 month in, that holds **memories / seeds**.
- **An expandable house** — physically grows over time, not just fills in.
- **Cutesy animations** — Sims-style: a little sit-down animation, a thought
  bubble over the head, small delightful touches.
- **Component art via Higgsfield** — new furniture/room designs come from there;
  we build the *systems* now so art slots in.
- **More interactions** — right now you can only leave a signal; the emotional
  flows need depth (see backlog).

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
- **Push notifications**: Edge Function `notify-signal` deployed + a DB trigger;
  sends the exact NOTIFICATIONS copy to the partner. (⚠️ not delivering on real
  devices yet — see backlog.)
- **Settings**: notifications toggle, privacy note, sign out, leave-home/unpair.
- **Living home**: starts sparse (just the fire), fills in on a milestone ladder
  (sofa d3, table d7, shelves/plants d14, garden d30); signals gated to unlocked
  places; "your home grew" milestone card; drag-to-pan camera.
- **Accessibility**: reduce-motion softens the glow.

Backend pieces the owner deploys via the Supabase dashboard (SQL/functions):
`supabase/schema.sql`, `supabase/notifications.sql`, `supabase/unpair.sql`, and
the `notify-signal` Edge Function.

## Backlog — from real two-phone testing (prioritised)

### Bugs (functional)
1. **[NOTIFS] Push not arriving on device.** Both phones opted in; sending a
   fireplace signal delivers nothing. Likely Android standalone needs FCM
   credentials, or the push token isn't stored. Diagnose via Supabase →
   Functions → notify-signal → Logs first.
2. **[SCENE] Opens replaying the walk.** On launch the character animates from
   its old spot to the current one; it should *start* at the current spot.
3. **[PAN] Up/down inverted.** Left/right feels perfect; vertical drag is
   backwards both ways.
4. **[SPOTS] "Resting area" is inside the fireplace** — the character stands in
   the fire, and rest overlaps the reconciliation spot. Give rest its own place
   (a couch/corner).
5. **[SYNC] State goes stale.** One phone shows the partner at the fireplace
   when they aren't. Live updates don't flow reliably / don't clear.
6. **[IDENTITY] Character colour isn't consistent.** Each phone shows "me" as
   red and "partner" as green, so the same person is red on one phone and green
   on the other. Colour/identity must be tied to the person, the same on both.
7. **[FLOW] Reconciliation/response dead-ends.** After a non-join answer (e.g.
   "Not ready yet") there's no way forward — you're stuck at the fire with no
   button to resolve. Mutual fireplace signals ("I want to make up" on both,
   both answer "Not ready yet") make no sense. Needs a proper state machine with
   clear exits for every branch.

### Infrastructure
8. **[OTA] Over-the-air updates.** Owner doesn't want to rebuild for every
   change — set up EAS Update so JS fixes ship without a new build.

### Polish (later, after functional)
9. Cutesy animations: sit-down motion, Sims-style thought bubble.
10. Graphics/look pass — deferred to the end on purpose.

## Deferred / needs owner or art
- iOS build (needs Apple Developer account, $99/yr).
- Physically-bigger room + garden 3D + new furniture = Higgsfield art pass.
- Google Play release (Phase 9).
