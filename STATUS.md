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
   when they weren't — live updates don't always flow/clear. Needs on-device
   reproduction; check realtime resubscribe on app foreground, and that resolves
   propagate. (The snap-on-open + "Okay" exit help, but verify.)
2. **[FLOW] Mutual-signal tangle.** Both leaving a fireplace signal at once, both
   answering "Not ready yet", is still confusing. The single-exit "Okay" unblocks
   it, but a fuller reconciliation state machine (who's waiting on whom) is worth
   a dedicated pass.

### Polish (later, after functional)
9. Cutesy animations: sit-down motion, Sims-style thought bubble.
10. Graphics/look pass — deferred to the end on purpose.

## Deferred / needs owner or art
- iOS build (needs Apple Developer account, $99/yr).
- Physically-bigger room + garden 3D + new furniture = Higgsfield art pass.
- Google Play release (Phase 9).
