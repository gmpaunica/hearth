# Hearth Experience Roadmap

> **Read this before planning or implementing product experience changes.**
> `PRODUCT_BRIEF.md` remains the source of truth for Hearth's purpose, safety
> boundaries, and MVP priorities. This document records the owner's experience
> direction, delivery order, and review gates.

## Why this work exists

Hearth already communicates useful information, but an important interaction
can currently end after two taps:

1. One person says they want to make up.
2. Their partner says they want to make up too.
3. The app returns to normal.

That communicates a status, but it does not make the couple feel that something
happened between them. The experience should create a beginning, a shared
middle, a visible ending, and a gentle reason to return on ordinary days.

The goal is not to add many disconnected features. Important interactions
should follow one reusable emotional arc:

**Signal -> anticipation -> response -> shared ritual -> lasting trace**

This is how Hearth should turn existing functionality into an experience worth
participating in.

## Non-negotiable experience rules

- Writing is always optional. Reconciliation must not become homework.
- A basic emotional signal should remain fast and low effort.
- A partner responds meaningfully; they do not merely press an identical
  confirmation button.
- A Fireplace moment resolves only when both visible split-heart readiness
  states are positive at the same time; other places keep their creator-owned
  ending.
- Every response should produce a visible, understandable consequence.
- The flow should lead toward real conversation, affection, or agreed space.
- Saving a reconciliation artifact is optional. Minor disagreements do not
  automatically become permanent records.
- Never assign blame or identify who caused damage in the house.
- Never show last-active status, effort comparisons, punitive streaks, or signs
  that can become surveillance or pressure.
- Ambient activity represents intentional signals and shared history, not
  inferred real-world activity.

## The five connected systems

1. **Emotional signalling** — fireplace, sofa, table, garden, and resting area.
2. **Meaningful partner responses** — choices with different emotional and
   visual consequences.
3. **Shared micro-rituals** — one tiny action that needs participation from both
   people.
4. **Persistent memories and consequences** — embers, repaired marks, plants,
   drawings, and keepsakes.
5. **Ambient daily life** — avatars, lighting, drawings, notes, and small
   environmental changes that make the house feel inhabited.

These are not separate product modules. Together, they form the emotional loop.

## Delivery agreement: one reviewable feature at a time

Work through the roadmap in order. For each numbered feature:

1. Implement only that feature and the minimum supporting infrastructure.
2. Validate it locally and on the relevant two-person/realtime paths.
3. Publish it to the `preview` branch when it is a compatible app update.
4. Stop and let the owner try it on the installed preview app.
5. Record feedback and revise or approve the feature before starting the next
   numbered feature.

For every JavaScript/assets-only feature, publishing is part of completion, not
an optional handoff step. Run the preview EAS Update command from `AGENTS.md`,
verify that the new update is the latest update on the `preview` branch, and
then tell the owner to:

1. Open the installed preview app once so it downloads the update.
2. Fully close the app.
3. Open it a second time to run the update.

Only request a new APK when a native dependency, native configuration change,
or incompatible runtime makes an over-the-air update impossible.

Do not silently bundle later roadmap features into the current feature. Small
technical prerequisites are allowed, but the owner should review one visible
experience change at a time.

## Current owner-review revision — 18 August 2026

This remains the single `1.0.3` review gate. The owner kept the successful
continuous drag behavior and revised the interaction/presentation details:

- Moment endings never teleport avatars. Release means stand at the live world
  position, then resume natural movement from that point. Hydration snaps only
  on a cold/open-state load.
- The garden doorway's visual floor and collision corridor are aligned, with
  the old coplanar arch steps removed.
- The floating fire orb and proposed notebook are removed. The real 3D
  fireplace opens a compact current-state/Today card when tapped.
- An active difficult Fireplace Moment temporarily presents **Fire: tending**
  in that card and the physical flame. Readiness raises the tending flame; the
  unchanged server daily-ritual state resumes after the Moment. This is a mood
  presentation, never a durable score or contribution mutation.
- The projected reconnect bubble above the fireplace is the only readiness
  control. It is large enough to read with the characters, uses stable
  member-A-left/member-B-right halves, waits for both people to join, and lets
  each person toggle only their own half before mutual completion.
- Confirmation previews are action-specific 2D scrapbook postcards with no
  avatar names or generic random pair render.
- The sheet docks as a centered 48-pixel-high, 144–214-pixel-wide pill so the
  wardrobe remains reachable. The chevron/minimize button is removed while
  drag, scroll handoff, scrim, Android Back, and accessibility collapse remain.
- Fredoka headings, Nunito body copy, pastel paper, rounded cards, stickers, and
  warm cocoa/terracotta styling replace the sharp professional treatment.

Implementation and automated/browser validation are complete in the canonical
phone checkout. JS/font-assets update group
`726847ac-2fab-4344-95b9-f6e1e842151a` is verified latest on `preview` for
runtime `1.0.3` and matches the installed Android native fingerprint. Perform
the two-open install and alternating-author two-phone smoke, then stop for owner
review. Voice recording remains the next separate native-build gate.

## Earlier superseding owner direction — Moments Owner Review, 17 August 2026

This is the single current `1.0.3` review gate. It retains the timeless flow
correction and supersedes its fire, private-readiness, Rest-response, sheet,
reaction, and payoff presentation.

- The first screen asks **How do you feel right now?** and divides six detailed
  40×18 place mosaics into **About us** and **What I need**. Only pure-white
  banner text may appear over the cocoa AA-contrast scrim.
- One mounted draggable sheet owns one measured vertical position, follows the
  thumb continuously, hands off a top-of-list downward drag, uses projected
  velocity/midpoint snapping, and leaves about 72 pixels visible while docked.
- A 52-pixel circular ritual-fire orb replaces the status ribbon. The server
  home day/timezone and aggregate daily sketches produce steady/low/warming/
  glowing; the same state drives the real Three.js fire. Moments never dim it.
- The current user's missing sketch gets a pencil satellite and one private
  after-7-PM prompt. Drawing arrivals use the spatial reaction system rather
  than a wide banner.
- Partner action, readiness, and drawing events become exactly-once pixel
  bubbles at seven stable world anchors. Bubbles queue behind Settings or app
  backgrounding and never seize the camera.
- Fireplace readiness is visible in a stable split heart: member A always owns
  the left half and member B the right. Change-only immutable events make ready
  and reverse visible to the partner; two ready halves resolve server-side.
- Rest now accepts only a real 12×12 doodle, duck/frog/dancing-toast visitor, or
  non-contact hug-wave. Each has a truthful preview, reaction, scene consequence,
  and durable Today prop.
- Positive non-Romantic endings dock, focus, play a roughly 800 ms fullscreen
  pixel heart, and restore the camera unless interrupted. Romantic keeps two
  small bed-side hearts. Negative/deferral paths have no payoff.

Backend migration `20260817120000_moments_owner_review_revision.sql` is deployed.
The 59-test backend suite and a 20-session authenticated alternating-author live
matrix pass. The phone passes TypeScript, 60 tests, and Android/iOS/web export.
Expo Doctor passes 20/21 checks; the sole failure is SDK 57 patch recommendations
newer than the installed versionCode 7 fingerprint, so native packages remain
pinned for this OTA. Update group `a75cf0c3-ceba-4f6b-96f0-bf4400eff7a5` is
verified latest on `preview` for runtime `1.0.3` and the installed Android
fingerprint. Run the two-open and two-phone smoke gates, then stop for review.

Recorded voice notes remain the next separate APK gate because enabling Expo
Audio microphone configuration changes the native binary.

## Historical superseding direction — Moments Flow Correction, 14 August 2026

This direction replaces the scheduling, countdown, automatic Romantic expiry,
immutable negative completion, multi-page review, generic-action, and
destination-small-payoff behavior in all older Moments sections below. Those
sections remain historical rationale only where they conflict with this one.

Moments is now one short, dead-end-free state machine:

| Place | Invited partner | Final resolution |
| --- | --- | --- |
| Fireplace | Intent-specific acceptance or timeless **Not now**, optional note | Both people may revise private readiness; two simultaneous **Ready to reconnect** states resolve |
| Table | **Talk now** or timeless **Not now**, optional note | Creator chooses **We talked—resolve** after both join |
| Garden | Give quiet or leave a rose | Creator chooses **I'm ready to come back** |
| Sofa | Sit together, bring tea, or send a hug | Creator chooses **I feel cared for** |
| Rest | Quiet the room, leave a blanket, or leave a drawing | Creator chooses **I'm feeling ready** |
| Romantic | Come close or send affection | Creator resolves positively; **Kindly decline** closes immediately without a heart |

- No current state stores or exposes a return schedule. Garden and Romantic
  never auto-close, and old finalizer calls are harmless.
- Every nonterminal state exposes exactly one clear personal action or an
  explicit wait. Fireplace/Table **Not now** can always become a later join.
- Creation is banner → intent when required, with an optional one-sentence
  note; there is no separate review page or explanatory interstitial.
- The high-contrast next action is pinned under the sheet header. The sheet has
  dock and expanded positions, a visible grabber, and a small collapse chevron.
- Every positive resolution collapses the sheet before focusing the place,
  playing avatar/prop/environment motion and one large heart, then restoring
  the prior camera unless the user intervenes. Cancellation, deferral, and
  Romantic decline never emit a heart.
- **Fire: steady / low / banked embers / warming / glowing** describes only the
  current shared atmosphere. It is never a relationship score or historical
  judgment.
- Settings is opaque and exclusive. Playback queues while Settings is open;
  cold launch does not replay old events, Today props persist, Realtime is
  exactly once, and reduced motion uses a static focus/payoff.

The additive backend migration `20260814180000_moments_flow_correction.sql` is
deployed. Its authenticated live matrix passed 19 alternating-author sessions
across all six places, and the backend suite passes 53 tests. The compatible
runtime `1.0.3` phone update remains the current release gate; after publishing,
complete the two-open install flow and alternating-author two-phone smoke test,
then stop for owner review.

## Owner visual direction — 8 August 2026

The owner explicitly authorized a whole-app art-direction pass while the
interaction queue remains gated. The supplied **Memory Garden** cottage frame
is now the visual source of truth: dense warm voxel architecture and garden
detail, ivory/peach daylight haze, terracotta and cocoa construction, sage
foliage, blush blossoms, golden window light, and editorial cream paper UI.

This authorization un-parks visual map polish, renderer/shader work, furniture
detail, and consistent styling across the existing screens. It does **not**
approve or silently advance P0, F2, or any later interaction feature. Emotional
state behavior, safety rules, and the ordered feature-review gates remain intact.

## Owner visual review — 9 August 2026

The warm Memory Garden art style is approved. The first implementation's scene
composition is not: the house is too crowded, some furniture/wall art reads as
intersecting, and the garden does not have enough usable space. The large pink
tree and koi pond should return with the later expandable-garden system rather
than dominate the current small garden.

Apply the feedback in two owner-review gates:

1. **Character correction — current gate.** Match the supplied character sheet
   first: compact head-heavy proportions, reference faces, canonical olive and
   coral looks, closed stepped hair from every direction, clear idle positions,
   and seated poses that do not enter furniture. Publish and stop for review.
2. **Map composition correction — next gate, not bundled.** Enlarge the garden,
   reduce props, remove/defer expansion-stage hero objects, repair the painting
   wall, and restore clear negative space around paths, furniture, and emotional
   locations while retaining the approved lighting/material style.

This feedback changes visual composition only. It does not advance P0, F2, or
any later interaction feature.

## Owner-authorized F1 consolidation — 11 August 2026

The owner authorized one complete **Stackable Fireplace Pathways** review build
instead of continuing the older one-signal-at-a-time delivery split. This F1
therefore includes the shared interaction-stack foundation and the
fireplace-specific behavior formerly scheduled across P0 and F2–F4:

- any number of independent open moments, with one intentional avatar location
  per person and a compact focused-card/chip tray;
- explicit separate-versus-connected creation, with no inferred linking or
  sibling auto-closure;
- all six complete fireplace response pathways, return timing, optional
  240-character sentences, author redaction, and visible fixed outcome sockets;
- a deliberate **Continue when ready** pause followed by two private,
  independently stored readiness choices; and
- completion only after two **I feel reconnected** choices, with completed
  outcomes retained through the initiator's completion day.

This authorization does **not** complete or absorb the reusable general note
system (N1), permanent keepsakes (F5), or the garden-space flow (G1). Those
remain separate reviewable features. The older F2–F4 descriptions below remain
as historical design rationale; their fireplace-specific acceptance behavior
is now delivered and reviewed through this consolidated F1 build rather than
through separate future fireplace releases.

## Owner-authorized F1 calm-moments revision — 12 August 2026

The owner replaced the interrupting always-visible F1 card with one compact
**Moments** surface and tightened presence/completion semantics before review:

- cold launches and incoming activity keep a minimized count/action pill;
  opening it reveals stable focus, other-moment chips, today's outcomes, an
  explicit minimize control, and the unified new-moment composer;
- the six fireplace intents send immediately except **More time, still us**,
  which requires a return time; optional sentences are authored and edited only
  after sending/responding and never enter notifications;
- ordinary movement is independent, presence-only, idempotent, and excluded
  from moment ordering; scheduled return is an explicit one-time server action;
- private readiness remains independent and only two **I feel reconnected**
  choices complete a moment; and
- a live completion produces one 2.5-second shared fireplace beat (short/static
  under reduced motion), fences Realtime replays, then restores persisted
  independent locations.

This revision requires a new Android `1.0.2` preview client. The prior runtime
`1.0.1` rollback remains the latest compatible update for old installations;
the `1.0.2` APK and update have cleared their fingerprint gate but still need
the physical two-phone smoke gate. N1, G1, F5, and deeper non-fireplace
pathways remain out of scope.

## Owner-authorized Moments `1.0.3` revision — 13 August 2026

The owner replaced the stack-based review candidate with **Meaningful Shared
States** as one consolidated `1.0.3` release. For new-system moments, this
authorization supersedes the count pill, chips, inferred relationships,
multiple-open stack, Continue step, and generic destination responses above:

- one unresolved v2 moment may exist per couple; unresolved legacy rows remain
  preserved as read-only **Earlier moments** and do not block the first v2;
- a persistent household ribbon and contextual minimized capsule expose one
  shared state without auto-opening on incoming activity;
- creation is feeling → destination purpose → Fireplace intent when relevant →
  optional one-sentence note → review; presets are complete without writing;
- Fireplace, Garden, Sofa, Table, Rest, and Romantic each own their response
  allowlist, movement rule, ending, atmosphere, props, and static voxel card;
- confirmed notes are immutable, author-removable, capped at 240 characters,
  notification-free, and retained in typed Today outcomes after immediate
  endings; private completion choices never cross to the other participant;
- only mutual Fireplace/Table completion receives the large live-only heart;
  other endings receive a smaller destination change, and event IDs are
  deduplicated persistently per device; and
- joined Romantic closeness alone starts a fixed 20-minute shared timer. An
  exact connected-client due call and `pg_cron` fallback share one idempotent
  terminal transition; early departure moves only the leaver.

The additive backend lives in the backend-hardening checkout. The canonical
phone implementation, validation, build, and publication remain isolated in
this checkout. Runtime `1.0.1` and genuine legacy RPC signatures remain intact;
legacy clients cannot mutate authoritative v2 rows.

## Owner preview feedback — 4 August 2026

This feedback came from testing the first F1 preview on two real phones. It is
part of the product record and must remain available in future sessions.

### Current F1 revision scope

- **Stable character identity:** member A is always the red character and
  member B is always the green character on both phones. A person must keep the
  same colour, scene slot, seat, and thought bubble everywhere. Later character
  customization will replace the presets without changing this identity model.
- **Clear anticipation:** after leaving a fireplace need, the sender should
  understand that they are waiting by the fire, what their partner can see, and
  that they can take the signal back. It should feel like a moment, not a raw
  database status.
- **Friendly presentation:** the F1 picker and cards need a warmer, rounder,
  more legible hierarchy. Signal cards must not cover the relationship-day
  label.
- **Header simplification:** remove the heart prefix and capsule treatment.
  Show **Day N of being together** as quiet text using the current warm label
  colour.

### F2 response feedback — recorded, not part of the F1 revision

- Never show a response control before its outcome exists. **Send warmth** must
  visibly add warmth or a log; **Leave/Send a note** must open an actual optional
  note composer.
- Explain outcomes through clear labels and visual cause-and-effect. The user
  should not have to guess what a button will do.
- **Sit beside them** should first seat the responder at the fireplace. It must
  not immediately push the couple to the table or into another decision.
- The reconciliation question currently arrives too early and creates too many
  consecutive questions. Ask it later, after the shared moment has had time to
  land.
- A shared prompt may appear on both phones, but one person's answer must not
  dismiss or resolve the other person's private choice. Model both answers
  explicitly and advance only when the state machine has the required mutual
  participation.

### Later location and system feedback — recorded for its matching gate

- **Garden navigation:** remove the visible doorway jump/burst. Cross-room
  routes must begin from the avatar's real position and walk continuously.
- **All signals need aftermath:** an acknowledgement such as **I understand**
  cannot simply produce an **Okay** dismissal. The scene and flow must explain
  what happened, what remains active, and what comes next.
- **Interaction history/state:** maintain enough structured state to explain
  the current stage and recent intentional action without becoming a social
  feed, surveillance log, or blame record.
- **Short note:** the table's **Send a short note** response must launch a real,
  optional composer and leave a visible note artifact.
- **Drawing notification:** **Your partner drew you something** and its unread
  badge must disappear as soon as the partner has actually opened/checked the
  drawing.

Do not mark these later issues complete merely because they are written here.
Implement and review them in their assigned feature/session.

## Complete owner requirement ledger — 4 August 2026

Use a separate Codex session for each row below. These rows group changes by
shared realtime/state infrastructure, not merely by screen, so each update can
be tested from both phones before the next one begins.

| Session | Requirement | Acceptance test on two phones |
| --- | --- | --- |
| C1 | Drawing read receipt and header typography | Opening the partner's drawing clears both the banner and envelope badge for that person for the rest of the UTC day, including after fully closing and reopening the app. A later drawing/update may become unread again. **Day N of being together** uses the same colour, weight, casing, and type treatment as **HEARTH**. |
| F1 | Permanent avatar identity | The home creator/member A is red and the joining member/member B is green on both phones. Initiating from either phone moves the same person's colour, seat, and thought bubble everywhere. Later customization replaces appearance without replacing identity. |
| P0 | Independent locations with a compact interaction surface | Each partner may maintain one current intentional location independently: for example, one avatar can remain in the garden while the other sits at the fireplace. Starting, responding to, or ending one person's state must not erase the other's. When two states coexist, use compact presence chips/tray or one focused card plus a collapsed status—not two large overlapping notification boxes. |
| F2 | Fireplace response consequences | Every visible response explains and performs its outcome. **Sit beside them** seats the responder at the fireplace. **Send warmth** adds a log/visible warmth. Talk, more-time, note, and hug choices each create their own understandable state; unfinished controls stay hidden. |
| N1 | Real reusable short-note system | **Send a short note** opens an optional composer instead of echoing the button label. The recipient gets a small speech/note bubble above the sender's avatar; tapping it opens the note. Notes are private to the couple, have a clear read/dismiss path, use discreet push copy, and can be reused by table/fireplace flows. |
| F3 | Shared micro-ritual | Both partners complete the chosen small ritual. Participation is stored separately per person and the shared scene advances only when both required actions exist. |
| F4 | Mutual reconciliation and aftermath | The readiness question arrives only after the shared moment has landed. Each phone records its own private answer; one answer cannot dismiss the other person's prompt. The state shows what happened and what comes next, and only mutual confirmation closes repair. |
| G1 | Garden space flow and continuous navigation | The avatar walks from its real current position through the doorway with no teleport burst. A space request includes return timing; **I understand** produces a visible acknowledged state rather than an **Okay** dead end, while leaving the other partner free to occupy another location. |
| M1 | Shared moments from either phone | Either partner can create an everyday moment/memory. It synchronizes to both phones and becomes a spatial object/seed rather than a social-feed entry. The other partner may optionally contribute so the seed can bloom; authorship never becomes a score. |

The following owner statements are therefore explicit requirements, not ideas:

- Do not display a response button whose consequence is not implemented.
- Do not move fireplace participants to the table merely because one person
  chose **Sit beside them** or **I want to talk**.
- Do not ask several consecutive reconciliation questions without showing the
  current stage and giving the shared moment time to land.
- Do not let one phone's private answer silently resolve the other phone's
  unanswered choice.
- Do not cover the relationship-day header with signal UI.
- Do not use a large stack of cards to represent two independent avatar states.
- Do not treat **Send warmth**, **Send a short note**, or **I understand** as
  plain status strings. Each needs a visible action, artifact, or aftermath.

## Build first: the complete fireplace experience

The fireplace is the hero interaction and the pattern for the rest of the app.
Develop it fully before adding another broad system.

### F1 — Give the first person's signal meaning

After choosing **I want to make up**, the person may optionally choose one need:

- I just want you beside me.
- I need reassurance.
- I want to talk.
- I want to be heard first.
- I would like an apology.
- I'm sorry, but I don't know how to say it.
- I want us to be okay, but I need more time.

They can skip the choice without writing anything. Their avatar walks to the
fireplace and sits. The fire begins very low. Their partner sees the selected
need inside the app, while lock-screen notification copy remains discreet.

**Review outcome:** the initiating action feels vulnerable and meaningful while
remaining quick, optional, and safe.

### F2 — Give the partner a meaningful response

The responding partner chooses a response rather than repeating the first
person's action:

- **Sit beside them** — their avatar walks over and sits down.
- **Send warmth** — their avatar places another log on the fire.
- **I'm ready to talk** — the scene acknowledges readiness and offers an
  appropriate real-world conversation path.
- **I need a little longer** — an hourglass appears with a chosen return time;
  repeated nudges pause until then.
- **Leave a note** — a folded note appears beside the waiting avatar. Writing
  the note remains optional.
- **Offer a hug** — a hug is offered, and the avatars hug only after the other
  person accepts.

Every response must have its own visual action and state consequence. A request
for more time is treated as a valid response, not a rejection or failure.

**Review outcome:** the responder feels that they made a real emotional choice,
and the initiator can understand that choice without pressure.

### F3 — Add one shared ritual

Start with **Hold to reconnect** as the first fireplace ritual. Each person holds
their button for three seconds. Participation does not need to be simultaneous;
neither person should be punished for arriving later. When both have completed
the action, their avatars move closer and the fire becomes brighter.

Keep these alternative rituals in reserve until the core hold ritual has been
tested:

#### One-word check-in

Each person privately chooses one word:

- Hurt
- Tired
- Misunderstood
- Worried
- Overwhelmed
- Sorry
- Okay now

Once both answer, the words appear briefly above the fire.

#### Add something to the fire

Each person chooses one contribution:

- Patience
- Honesty
- Affection
- Understanding
- Forgiveness
- Space

The two contributions become logs, sparks, or coloured flames.

#### Exchange one sentence

Each person may optionally complete one starter:

- What I wish you understood is...
- What I needed was...
- I'm sorry for...
- I still care about...
- Tomorrow, I want us to...

**Review outcome:** both people perform a tiny, emotionally legible action and
the shared scene visibly changes because they both participated.

### F4 — Make reconciliation a visible ending

After the ritual, either person can suggest talking now or later. Appropriate
bridges include:

- Talk in person.
- Start a call.
- Send a voice message.
- Choose a time to talk.
- Share a small gesture of affection.

Both people privately confirm when they feel reconnected. If either needs more
time or wants to talk first, the app keeps the repair state open without blame.
Once both confirm, the avatars complete their animation, the fire brightens,
and the room becomes warmer.

**Review outcome:** the flow has a clear emotional payoff without allowing the
app to decide that the relationship is repaired.

### F5 — Leave an optional lasting trace

After successful reconciliation, offer the couple a choice to keep a small
artifact. Start with one restrained MVP artifact: **a glowing ember added to a
jar on the mantel**.

Future artifact options can include:

- A small crack repaired with gold.
- A new photograph frame.
- A flower near the fireplace.
- A tiny unlocked ornament.
- A private date in a **moments we chose each other** book.

The artifact records that the couple chose to reconnect, not what happened or
who was responsible. Do not save it automatically.

**Review outcome:** returning to normal leaves a warm, optional sense of shared
history rather than erasing the experience.

## Then reuse the fireplace structure

Only after F1-F5 feel emotionally satisfying should the same interaction
grammar expand to other locations:

- **Sofa:** comfort and affection.
- **Table:** conversation.
- **Garden:** space, reassurance, and return timing.
- **Resting area or bedroom:** rest and low-pressure presence.
- **Garden plants:** spatial memories and relationship history.

Each location should still have a meaningful signal, anticipation, distinct
responses, one shared action where appropriate, and a visible aftermath.

## Make the home feel inhabited

The house should have quiet life even when nobody is actively pressing a
button:

- An avatar reads, sleeps, draws, or looks out the window.
- The fireplace remembers that someone is waiting.
- A drawing hangs on the wall and a fridge note can remain visible.
- New memories cause something to bloom outside.
- Lighting changes with local time.
- Rain, sunshine, and seasons create variation without location tracking.
- Tapping a partner's avatar shows the last thing they intentionally left for
  you, never their online activity.

These states should feel calm and non-demanding. The home is inhabited, not a
monitoring dashboard.

## Give each day a gentle episode

### Morning: an intention

Each person may leave one tiny intention:

- Thinking of you.
- Busy today.
- Could use encouragement.
- Looking forward to tonight.
- Feeling affectionate.
- Need a quiet day.

The intention changes what their avatar is doing.

### During the day: one lightweight contribution

A person may add a drawing, photo, voice note, fridge message, small emotional
signal, or five-second moment.

### Evening: gather the day together

The home displays the day's drawing, opens notes, brings the avatars together,
offers one short question, and lets the couple save one part of the day as a
memory.

This rhythm should create anticipation and a reason to return without requiring
daily completion or optimizing for screen time.

## Evolve the daily drawing

- Today's drawing hangs prominently on the wall.
- At midnight it moves into a sketchbook instead of being deleted.
- A blank canvas appears for the new day.
- The partner can respond with a heart, colour, tiny addition, or short caption.
- At the end of each month, the app can generate a flipbook of the drawings.

Possible turn patterns to test later:

- Partner A draws one day and Partner B the next.
- On selected days, both contribute to the same image without seeing the other
  addition until evening.

The visible canvas resets, but the relationship history accumulates.

## Add presence without requiring communication

A person may invite or place their avatar without sending a serious emotional
message:

- Sit by me.
- Watch the fire together.
- Meet me in the garden.
- Have virtual coffee.
- Go to sleep together.
- Listen to a song together.

These moments require no text and stay lightweight and optional. They are
especially useful for long-distance couples who want to share a sense of place.

## Review checklist for every feature

Before asking the owner to approve a feature, verify:

- The feature advances the five-part interaction loop.
- The core action is quick and writing remains optional.
- Both people's states and choices are respected.
- The consequence is visible in the shared house.
- Realtime behavior works from both roles and after reopening the app.
- Notifications reveal no sensitive detail.
- Nothing implies blame, surveillance, comparative effort, or relationship
  scoring.
- Reduced-motion and basic accessibility paths still communicate the outcome.
- The state has a safe exit, cancellation, or more-time path.
- Compatible code/assets changes are published and verified on the `preview`
  branch before review.

## Ordered feature queue

| Order | ID | Reviewable feature | Status |
| --- | --- | --- | --- |
| 1 | F1 | Moments 1.0.3 Flow Correction across six destinations | Backend deployed; phone release validation in progress |
| 1A | C1 | Drawing read receipt and matching header typography | Awaiting owner review |
| 2 | P0 | Independent avatar locations and compact interaction UI | Included in Moments 1.0.3; release validation in progress |
| 3 | F2 | Distinct fireplace responses and visual consequences | Included in Moments 1.0.3; release validation in progress |
| 4 | N1 | One-sentence sender and responder note composer | Included in Moments 1.0.3; release validation in progress |
| 5 | F3 | Shared fireplace participation | Included in Moments 1.0.3 via joining actions and private completion choices; release validation in progress |
| 6 | F4 | Mutual fireplace ending and aftermath | Included in Moments 1.0.3; release validation in progress |
| 7 | G1 | Continuous garden route, return timing, and acknowledged-space aftermath | Queued |
| 8 | F5 | Optional ember-jar trace | Queued |
| 9 | M1 | Shared memory flower/moment creatable from either phone | Queued |
| 10 | L1 | Meaningful comfort state at the sofa | Included in Moments 1.0.3; release validation in progress |
| 11 | L2 | Meaningful conversation state at the table | Included in Moments 1.0.3; release validation in progress |
| 12 | A1 | First ambient-life slice | Later |
| 13 | D1 | Morning/day/evening rhythm | Later |
| 14 | DR1 | Drawing sketchbook instead of deletion | Awaiting owner review |
| 15 | P1 | Lightweight shared presence invitations | Later |

Set a feature to **Awaiting owner review** only after its preview update has
been published and verified. Mark it **Approved** only after the owner has tried
it. The consolidated **F1**, its included P0/F2/F3/F4/N1/L1/L2 behavior, and
the direct **C1** correction must follow their statuses above. Do not begin G1,
F5, or another queued interaction feature until the owner reviews the current
preview.

### Moments Owner Review `1.0.3` release candidate

- Backend migration `20260817120000` is deployed to project
  `gtdigidqsczptqpbplar`. It adds the validated home timezone and aggregate
  ritual snapshot, visible change-only readiness events, optional immutable
  action payloads, and the strict Rest-response RPC while preserving legacy
  signatures and timeless/author-owned endings.
- The backend passes 59 tests. The authenticated live matrix passes 20
  alternating-author sessions with aggregate fire progress, both-member
  readiness, reverse/ready sequences, Rest payload rejection/idempotency,
  outsider isolation, and event immutability.
- The canonical phone implements the detailed mosaics, two feeling sections,
  destination diorama previews, one continuous sheet, ritual orb/physical fire,
  private sketch prompt, seven spatial anchors, split readiness heart, three
  functional Rest actions, and destination-specific payoff routing.
- TypeScript and all 60 phone tests pass. The tests include AA banner contrast,
  390×844 layout contracts, and 20 repeated sheet settle cycles. Android, iOS,
  and web export pass. Changed owner-review files lint with zero errors; the
  full repository retains the documented pre-existing React compiler/R3F lint
  backlog. Expo Doctor passes 20/21, with only patch recommendations newer than
  the installed versionCode 7 native fingerprint.
- Update group `a75cf0c3-ceba-4f6b-96f0-bf4400eff7a5` is verified latest on
  `preview`, runtime `1.0.3`. Android update
  `01a00fa9-5ce1-737d-8ca5-33975f9d62d9` has fingerprint
  `24a442c968109b1b090e222da541456e2390372a`, matching the installed versionCode
  7 APK. iOS update `01a00fa9-5ce1-7d7c-9169-bf50765ad9f9` has fingerprint
  `b9747cef0ff6165094070e26b8305a67a5b14e8a`.
- No Android or portable phone is attached to this workstation. Complete the
  two-open install and alternating-author two-phone smoke test, then stop for
  owner review. Status remains **Release validation in progress** until then.

### Moments visible-playful-consequences `1.0.3` prior release candidate

- Additive backend migration `20260814120000` is deployed to project
  `gtdigidqsczptqpbplar`. It adds participant `joined_at`, immutable/RLS-scoped
  action events, canonical action normalization, the delayed `join_moment`
  path, join-gated Fireplace/Table completion, explicit Sofa author completion,
  and typed current/today event and next-action snapshot fields. Existing RPC
  signatures and schedule columns remain wire-compatible; new actions do not
  schedule returns.
- Backend validation passes 47/47 repository tests. The authenticated paired-
  account harness passes all 19 canonical response actions, legacy aliases,
  delayed join, join-gated completion, Sofa author completion, event
  immutability, cross-couple RLS, idempotency, daily gift persistence, and the
  Romantic 20-minute state. Linked database lint has no errors; its warnings
  are the two pre-existing compatibility warnings plus intentionally retained
  unused schedule parameters.
- The canonical phone client now shares one typed consequence catalog across
  concise response copy, the selected miniature character/prop preview, and
  action-specific effects at real scene anchors. Creation uses six colorful
  destination banners, Fireplace's four intents, and an optional one-sentence
  note. The pinned Next-for-you panel exposes delayed joins and every ending;
  no new flow exposes a schedule or countdown.
- The real scene supports stable today gift slots, temporary ending-safe cues,
  distinct movement/pose choreography, the garden arch, local interruptible
  camera focus, and exactly-once realtime playback without remote camera theft.
  The Moments surface is a Gesture Handler/Reanimated sheet with one shared
  slide-down exit for swipe, scrim, Back home, and Android Back.
- Canonical-phone validation passes TypeScript, all 52 tests, changed-file lint
  with zero errors, Expo Doctor 20/20, and Android/iOS/web exports. A paired
  Chrome run at 390x844 passes 20 consecutive rounds of button, scrim, real
  touch swipe-down, scroll recovery, and reopen: 80 dismiss/reopen sequences.
- Fresh Android preview APK: EAS build
  `97f88a60-a96e-46c2-81d7-5066db2d39e6`, app/runtime `1.0.3`, versionCode `7`,
  native fingerprint `24a442c968109b1b090e222da541456e2390372a`.
  Direct artifact:
  `https://expo.dev/artifacts/eas/c8JAo7pJ31xK8f048drv0QV1IwaGkGtDSE84u0H-EG0.apk`.
  The 120,255,738-byte APK is stored as
  `tmp/releases/hearth-1.0.3-preview-v7.apk`; SHA-256
  `452D510349AAE7633ADE4DF662D80D00218391C2C558DD881837388CF5F61B20`.
  Its ZIP contains the Android manifest and primary DEX.
- Matching `preview` update group
  `b1e2e01b-f45b-4f78-8d03-fbd19068fe0a`; Android update
  `019ffdcd-e0bb-762e-a98a-8e3b80f16707`. The live update has runtime `1.0.3`;
  the post-publication Android fingerprint exactly matches the v7 APK.
- The EAS install page and scannable
  `tmp/releases/hearth-1.0.3-preview-v7-qr.png` were opened in Chrome. Windows
  enumerates no Android or portable device, so the APK could not be installed
  and the alternating-author, two-account physical smoke matrix remains the
  only release gate. Status remains **Release validation in progress** until
  both phones pass; then stop for owner review.

### Moments meaningful-shared-states `1.0.3` prior release candidate

- Additive backend migrations `20260813160000` through `20260813180000` are
  deployed to project `gtdigidqsczptqpbplar`. Local and remote migration
  histories matched at deployment; linked database lint reported only the two
  pre-existing non-v2 warnings in `new_invite_code` and the legacy
  `respond_to_interaction` compatibility signature.
- Backend validation passes 40/40 repository tests. The authenticated
  two-account matrix passes transactional one-active locking, legacy isolation,
  cross-couple RLS, private choices, durable completion identities, note
  removal, movement/return/end idempotency, and all 29 destination actions.
  A separate run made no client due call and proved the durable Romantic
  fallback: due `2026-08-13T17:56:57.165Z`, completed by `pg_cron` at
  `2026-08-13T17:57:00.029344Z`.
- Canonical-phone validation passes TypeScript, all 51 tests, changed-file lint
  with zero errors (24 expected Three JSX property warnings), Expo Doctor
  20/20, `expo install --check`, and Android/iOS/web production exports.
  Twenty consecutive Moments open/minimize cycles are covered by the focused
  regression test. Repository-wide lint still contains unrelated pre-existing
  React compiler errors and Three JSX warnings outside this release scope.
- Six original optimized static WebP vignettes are local under
  `assets/images/moments/` and are delivered through the already-installed
  Expo Image package. Each active destination also owns one dominant scene
  atmosphere and destination-specific props/payoff behavior.
- Android app/runtime: `1.0.3`; SDK `57.0.0`; versionCode `6`. Final Android
  fingerprint: `24a442c968109b1b090e222da541456e2390372a`.
- Final Android preview APK: EAS build
  `b5ac8c73-4529-4d96-a6be-08b30acf2a1c`. Direct install URL:
  `https://expo.dev/artifacts/eas/x3wnUxqgbGZO5dV_w_pUXC-04N9sJd8MTEM4dcTh3wg.apk`.
  The 120,104,910-byte download is stored as
  `tmp/releases/hearth-1.0.3-preview-v6.apk`; SHA-256
  `F99A4588ED45504E62D80D7618476C83AD617F1F60B1D76D05A3AC3000DF112F`.
  Its local MD5 matches the remote ETag, and its ZIP structure contains the
  Android manifest and primary DEX.
- Matching Android `preview` update group
  `5d0d31cb-69d2-4b20-9207-a5ee47c7c6a5`; update
  `019ffc2e-f1fb-7e81-a2eb-e9f3ff3044cf`. The live EAS manifest serves that
  update on branch `preview` with runtime `1.0.3`, including all six WebP
  assets. A post-publication fingerprint generation exactly matches the APK.
  The final Today-note outcome UI landed in this matching OTA after the native
  build upload, so a fresh APK install must be opened, fully closed, and opened
  once more before the smoke test.
- A scannable install QR is stored as
  `tmp/releases/hearth-1.0.3-preview-v6-qr.png`. No Android phones are currently
  enumerated by this workstation, so installing the APK and completing the
  two-phone interaction/scene smoke matrix remain the only release gates.
- Status remains **Release validation in progress**, not Awaiting owner review,
  until both physical phones pass the smoke test.

### F1 calm-moments `1.0.2` release candidate

- Backend migrations `20260811183000` and `20260812120000` are deployed to
  project `gtdigidqsczptqpbplar`; linked database lint is clean and local/remote
  migration histories match.
- Validation: 32/32 backend tests and 42/42 canonical-phone tests pass;
  TypeScript, SDK dependency compatibility, Expo Doctor 20/20, changed-file
  lint (zero errors), and Android/iOS/web production exports pass. A live
  authenticated three-account harness proves six concurrent moments,
  independent/idempotent presence and return, server-derived response movement,
  author-owned sentence add/edit/remove, private readiness, one-way completion,
  connected-thread independence, repeated outcomes, and cross-couple RLS.
- Android app/runtime: `1.0.2`; native fingerprint:
  `00c14063e47f2452bbb341e5ccec2d830cc69f25`.
- Final Android preview APK: EAS build
  `3c4cd50c-abee-45dc-9c5b-9771359f821c`, versionCode `5`; downloaded locally
  as `tmp/releases/hearth-1.0.2-preview-v5.apk` with SHA-256
  `6910F883A16CCAA7944FF760A07B63FA82754B7B4331754432E5D0631E4563D1`.
- Initial matching Android `1.0.2` update group:
  `3e839fc8-909c-48bd-8c8b-940dfc5cf6f0`; update
  `019ff712-4af5-7481-9856-16caefda4ed6`. Owner testing exposed a render loop
  when opening the Moments sheet, caused by uncached derived-array Zustand
  selectors under React 19.
- The 13 August correction uses cached shallow selectors in both sheet views
  and has a source regression test. Android update group
  `7704a258-9a2f-4d51-b781-efed2f5dabf2`; update
  `019ffb76-cbd0-7b6a-9b00-ec0f77fcbdb1` was published as the freeze correction.
  Expo Doctor 20/20, TypeScript, all 42 client tests, changed-file lint, and the
  Android production export pass. EAS fingerprint comparison proves the APK
  and correction both use `00c14063e47f2452bbb341e5ccec2d830cc69f25`.
- Owner review then found the generic bubble controls, place-only creation
  choices, manual `Connect this signal` switch, and movement-led response copy
  emotionally unclear. The 13 August feeling-first revision routes six plainly
  described needs to the fireplace, garden, sofa, table, resting area, or
  bedroom; explains what each destination communicates; keeps the six
  fireplace needs; replaces the manual relation switch with automatic grouping
  when a new moment is opened from an existing one; and gives every response a
  distinct emotional meaning. Avatar movement is still explicitly separate
  from responding. Optional sentences remain optional and notification-safe.
- The corresponding Android update group
  `5072ef26-e9a9-4c2a-b4f6-5890eb8746ab`; update
  `019ffb94-3e90-7bd2-94f5-0df659960ea5` is the latest `preview` update.
  TypeScript, all 42 client tests, changed-file lint, SDK dependency checks,
  Expo Doctor 20/20, and Android/iOS/web production exports pass. Its
  fingerprint exactly matches the `1.0.2` APK.
- Runtime `1.0.1` still points to rollback group
  `0cea55a1-ec64-4529-a4c1-e06c0613b459` as its latest compatible update.
- Physical validation of the correction on both phones remains pending; this
  workstation does not currently have Android platform-tools/ADB installed.
- Status is **Release validation in progress**, not owner review, until the APK,
  update fingerprint, and two-phone smoke gates pass.

### Latest consolidated F1 stack review build

- Owner-authorized and published 11 August 2026 to the `preview` branch.
- EAS Update group: `789de52b-d849-4090-b9dc-1d5653c40eb7`.
- Runtime: `1.0.1`, Android and iOS.
- Verified as the latest preview update after publishing.
- Backend migration deployed first to project `gtdigidqsczptqpbplar`.
- Validation: 26/26 backend tests and 40/40 canonical-phone tests passed;
  TypeScript and all changed-file lint checks have zero errors; Android, iOS,
  and web Expo exports passed. A live three-account/two-member harness proved
  six simultaneous open pathways, independent presence and leaving, explicit
  versus connected groups, private readiness, explicit scheduled return,
  author-only closure, two same-path completions with one aggregated outcome,
  expiry bounds, and cross-couple RLS.
- Status is **Awaiting owner review**. Reusable notes (N1), permanent keepsakes
  (F5), and garden G1 remain separate and have not been advanced.

### Latest F1 review build

- Published 4 August 2026 to the `preview` branch.
- EAS Update group: `d6491944-0673-4b2e-a169-25c24fe31650`.
- Runtime: `1.0.0`, Android and iOS.
- Verified as the latest preview update after publishing.
- Validation: TypeScript clean, 18/18 focused tests, live Supabase harness
  passed, and two consecutive 390x844 paired-phone browser runs passed all
  sender/partner/together/end-state checks with zero browser errors.
- Status remains **Awaiting owner review**. F2 is not started.

### Latest C1 correction build

- Published 4 August 2026 to the `preview` branch.
- EAS Update group: `6db8fb55-6359-4d05-9046-b011394656f9`.
- Runtime: `1.0.0`, Android and iOS.
- Verified as the latest preview update after publishing.
- Validation: TypeScript clean, 19/19 focused tests, lint clean, and a real
  paired-browser Supabase/realtime run proved unread-before-open,
  banner-and-badge dismissal, persistence after a fresh app/page launch, and
  matching computed header font family/colour/weight/casing with zero browser
  errors.
- Status is **Awaiting owner review**.

### Latest P0 review build

- Explicitly requested by the owner on 11 August 2026: a person remains at an
  intentional signal location for as long as they choose, either participant
  can independently leave a shared location from their own app, and the other
  avatar must not be pulled away.
- Fireplace and bedroom join pathways now play the existing heart animation
  when the second person arrives, then leave the shared scene open without
  forcing another prompt.
- Published 11 August 2026 to the `preview` branch.
- EAS Update group: `6a8fe334-da7f-4eb0-82e1-6a43bfb8f6a6`.
- Runtime: `1.0.1`, Android and iOS.
- Verified as the latest preview update after publishing.
- Validation: TypeScript clean, 38/38 repository tests passed, focused lint has
  zero errors, Expo web export passed, and the live two-account Supabase harness
  proved both independent departure directions and that the shared signal stays
  open until the remaining person leaves.
- Status is **Awaiting owner review**. F2 remains queued.

### Latest DR1 review build

- Explicitly requested by the owner on 10 August 2026 as one reviewable drawing
  experience pass; this does not advance F2 or another emotional-signal gate.
- Published 10 August 2026 to the `preview` branch.
- EAS Update group: `c0379b8a-68fa-4ec3-bf6e-4132c68c9dd5`.
- Runtime: `1.0.0`, Android and iOS.
- Verified as the latest preview update after publishing.
- Validation: TypeScript clean, 31/31 focused tests, focused lint clean, Expo
  web export passed, live Supabase harness passed, and a paired drawing check
  proved realtime delivery, named profiles, cross-day archive ordering, and
  dense sketch storage.
- Status is **Awaiting owner review**.
