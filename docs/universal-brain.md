# Hearth — Universal Brain

Durable product memory for accepted owner feedback, decisions, and staged work.
This document records intent; `PRODUCT_BRIEF.md`, `EXPERIENCE_ROADMAP.md`, and
the repository review gates continue to control implementation order.

## Accepted direction — 18 August 2026

### Moments review gate

- Keep the Shared Moments draggable dock, snap points, and gesture behavior.
- Make the surface unmistakably Hearth: warm ivory stationery, tactile coral
  buttons, pastel chips, rounded keepsake cards, coherent small line marks,
  Fredoka/Nunito type, and destination-specific storybook art.
- Furniture moments require explicit approach, seated, and egress anchors.
  Avatars must leave a bed, chair, sofa, bench, or mat before standing upright.
- The garden gateway belongs to the garden side of the wall. Its threshold has
  one floor owner, posts remain outside the route, and vines frame rather than
  cover the opening.
- Tapping the real fireplace opens an illustrated keepsake card whose glow and
  embers reflect the live fire state. The artwork is an original Hearth asset,
  not a copy of the supplied UI reference.

### Our Diary — next native/database gate

- A private chronological story combines photos, foreground-only voice notes,
  daily sketches, gentle completed actions, and safe shared keepsakes.
- Existing sketches and non-sensitive gifts may be included. Conflict notes,
  readiness, declines, and private Moment text are never backfilled
  automatically.
- Media lives in a private couple-scoped bucket with authenticated or
  short-lived signed access, author-owned deletion, upload limits, and cleanup
  for partial failures.

### Together Actions — following experience gate

The bottom-left Rituals entry becomes a Together Actions hub with a prominent
Our Diary entry and six deliberately small actions:

1. Send a voice note.
2. Share a photo.
3. Tiny sketch.
4. Sit together in an unlocked place in the home.
5. Draw one offline idea from a small curated deck.
6. Answer one gentle question for us.

Actions stay invitation-like: no scores, deadlines, streaks, repeated nudges,
or sensitive lock-screen copy. Sit Together cannot compete with an active
emotional Moment. Question answers meet only after both people submit.

### Deferred

- Nightly Recap is deliberately out of the current implementation. Do not add
  it indirectly to Diary or Together Actions until the owner returns to it.

## Supplied UI reference

Reference: [Our Little Home UI direction](reference/ui-direction-our-little-home.png)

Use it as visual vocabulary rather than a screen specification. Hearth keeps
its voxel home as the core interface and does not inherit the reference's tab
bar or dashboard information architecture.
