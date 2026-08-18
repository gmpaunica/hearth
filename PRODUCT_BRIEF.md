# Hearth Product Brief

## Working product concept

Hearth is a private mobile app for couples centred around a shared virtual house.

The house is not primarily a decoration game. It is a visual communication system that helps partners express emotional needs when speaking or texting immediately feels difficult.

The app helps couples communicate three difficult messages:

1. Something is wrong, but I cannot explain it yet.
2. I need space, but I am not abandoning the relationship.
3. I am ready to reconcile, even if I do not know how to initiate the conversation.

Hearth must help users begin real communication. It must not replace real conversations, assign blame, diagnose the relationship, or decide which partner is correct.

## Superseding Moments owner-review interaction revision — 18 August 2026

This is the current `1.0.3` owner-review target and supersedes the 17 August
presentation details wherever they conflict:

- Ending a Moment releases each avatar in place. A seated avatar stands at its
  current world position, waits briefly, and begins normal ambient movement
  from there; only cold-launch hydration may snap to a stored destination.
- The west garden threshold has one visual floor owner. The doorway arch no
  longer lays coplanar step voxels over the living/garden floors, and the
  collision corridor stays aligned with the visible opening.
- The floating ritual-fire orb is removed. The real fireplace is the status
  surface: tapping anywhere on it focuses the actual 3D hearth and opens a
  compact card containing only its current state and generic Today outcomes.
  There is no notebook and no permanent Moment history in this revision.
- Daily sketch progress remains the durable ritual truth. While a difficult
  Fireplace Moment is active, both the card and physical flame temporarily say
  **Fire: tending** and visibly respond as reconnect-heart halves fill. Ending
  the Moment returns to the unchanged server ritual state; no score, blame,
  streak, failure history, or penalty is created.
- Fireplace readiness lives in one large projected speech bubble above the
  fireplace, not in the Moments sheet. Member A always owns the left heart half
  and member B the right. Once both have joined, each person taps their own half
  to fill or reverse it; the second filled half completes the heart and resolves
  the Moment through the existing idempotent server RPC.
- Response confirmation uses a relevant code-native scrapbook postcard: the
  destination mosaic plus the actual action prop/gesture and one honest caption.
  It contains no generic 3D pair and no names. Receiving an apology explicitly
  says it reached the recipient without implying forgiveness or resolution.
- The continuously mounted sheet keeps the approved direct drag, scroll
  handoff, velocity/midpoint settling, Android Back, scrim, and accessibility
  actions. Its centered dock is now only 48 pixels tall and 144–214 pixels wide,
  leaving the wardrobe and home controls visible. The minimize chevron is gone;
  expand by tapping/dragging the dock and collapse by dragging, the scrim, Back,
  or the accessibility action.
- Moments uses local Fredoka SemiBold headings and Nunito body faces over soft
  peach/ivory paper, rounded cards, tape/heart stickers, warm cocoa ink, and
  terracotta actions. These are runtime-loaded assets and require no new APK.

Recorded voice notes remain outside this JavaScript/assets-only revision.

## Earlier superseding Moments owner-review direction — 17 August 2026

This direction supersedes the 14 August flow correction wherever they conflict.
Moments remains one timeless, two-step state machine, now presented as a warmer,
more spatial part of the home rather than a status panel.

- Step one asks **“How do you feel right now?”** and groups Fireplace, Table,
  and Romantic under **About us**, with Garden, Sofa, and Rest under **What I
  need**. Each place uses a detailed 40×18 code-native run-length mosaic. Banner
  titles and place labels are pure white over a cocoa scrim with AA contrast.
- Step two contains the Fireplace intent when needed, one optional sentence,
  and Send. Destination previews are miniature room dioramas behind the two
  unnamed avatars with one accurate consequence caption.
- Moments is one continuously mounted draggable sheet with measured expanded
  and 72-pixel docked snap points. It follows the finger in both directions,
  transfers a downward list drag at scroll top, settles from velocity/projected
  position, and leaves the home interactive while docked.
- Incoming partner actions appear for about 3.5 seconds in a small pixel speech
  bubble anchored to Fireplace, Garden, Sofa, Table, Rest, Romantic, or the
  drawing frame. They never take the camera; tapping is the intentional focus.
  Settings/background delivery queues in order, and persisted event IDs prevent
  cold-launch or reconnect replay.
- Fireplace readiness is deliberately visible to both people. Member A owns the
  left half of the split heart and member B the right on both phones. Ready,
  reverse, and ready-again are immutable change events; equal retries produce no
  event or animation. Two lit halves resolve the Moment server-side.
- Rest responses are real: a validated 12×12 six-colour doodle, a duck/frog/
  dancing-toast visitor, or a non-contact hug-wave with a Today heart token.
- Positive Fireplace, Garden, Sofa, Table, and Rest resolutions dock the sheet,
  focus the place, and play a fast fullscreen pixel heart before camera restore.
  Romantic positive actions and endings use two small hearts beside the bed.
  Cancellation, deferral, readiness reversal, and Romantic decline show none.

The circular ritual fire is separate from Moment mood. One server-provided home
date and timezone count one daily sketch per person: no contribution is
**steady** before 7 PM and **low** afterward, one is **warming**, and both are
**glowing**. That single state drives the 52-pixel orb and physical fireplace.
Moments may change rain/tint or briefly boost a positive fire, but never dim it.
No streak, failure history, partner blame, relationship score, or permanent
penalty is stored. A private **Tiny sketch tonight?** prompt concerns only the
current person's missing contribution.

Recorded voice notes are explicitly outside this revision. Expo Audio
microphone configuration changes the native app and requires the next APK-gated
build; it must not be enabled in this JavaScript/assets-only `1.0.3` update.

## Core job to be done

When I feel hurt, disconnected, overwhelmed, or ready to reconnect but do not know what to say, help me clearly communicate what I need and understand what my partner needs without creating more pressure or starting another argument.

## Secondary jobs

- When everyday life is busy, help couples maintain small personalized rituals that make them feel cared for.
- When meaningful moments happen, help couples preserve them inside a shared world that becomes more valuable over time.

## Product differentiation

Hearth is not merely a cute virtual home or another daily-question app. Its primary advantage is a complete emotional-repair system:

- Signal that something is wrong.
- Request space with reassurance and a timeless, person-owned return signal.
- Signal readiness to reconnect.
- Acknowledge a signal without pressure.
- Meet symbolically by the fireplace.
- Show both independent readiness halves without assigning blame.
- Lead the couple toward an offline conversation or call.
- Mutually confirm reconciliation.
- Reflect repair visually in the home.

Its second advantage is a spatial memory system. Memories exist physically inside the shared world instead of appearing in a conventional social feed:

- Photos go on the wall.
- Voice notes live in a record player or another memory object.
- Videos may eventually play on the television.
- Important memories grow as plants in the garden.
- Milestones become trees or permanent objects.
- Couples can walk through the history of their relationship rather than scroll through it.

## Product promise

A private home where couples can show how they feel, signal when they need space, and meet by the fire when they are ready to make up.

## Hero interaction: Meet by the fire

One partner selects: “I am still upset, but I want us to be okay.”

Their avatar moves beside the fireplace. Their partner receives a discreet notification: “The fireplace is glowing.”

The partner opens the home and may select:

- Sit beside them.
- I am ready to talk.
- Send reassurance.
- I need more time.

If they sit beside the first avatar, both avatars appear by the fire. The app then asks each person independently:

- Are you ready to reconnect?
- We are okay now.
- We should talk first.
- I need an apology or acknowledgement.
- I need more time.

The app must not declare a Fireplace disagreement resolved unless both partners select **Ready to reconnect** at the same time. Readiness is visible through the stable member-A-left/member-B-right split heart, and either person may reverse their own half while the Moment is open. When both are ready, the small heart completes, the active repair state closes, and the positive payoff appears. The ritual fireplace remains governed by daily sketches rather than disagreement state.

The app then encourages an appropriate real-world next step:

- Talk in person.
- Start a call.
- Send a voice message.
- Share a small gesture of affection.

## Emotional locations

### Fireplace: “I want to make up”

Use the mutual reconciliation flow above.

### Garden bench: “I need space, but we are still okay”

The partner can give quiet or leave a rose. The state remains open without a
countdown or automatic notification until its creator chooses **I'm ready to
come back**.

### Sofa: “I need comfort or affection”

Possible responses:

- Sit beside them.
- Send a hug.
- Ask what they need.
- Offer practical support.

### Table: “I want to talk”

Possible responses:

- I am ready.
- Can we talk at a selected time?
- I need a little time first.
- Send a voice message.

### Resting area: “I am overwhelmed or tired; this may not be about us”

Possible responses:

- Make a real 12×12 tiny doodle.
- Send a duck, frog, or dancing-toast visitor.
- Send a non-contact little hug-wave and Today heart token.

## Signal structure

Every signal must communicate:

1. Current state.
2. Desired response.
3. Who owns the next explicit action.

Prefer actionable statements such as “I need some quiet and will signal when I
am ready” over vague mood labels such as “angry.”

Allow the sender to select “This is not about you.” Writing an explanation must always be optional. A core emotional signal should take no more than approximately five seconds.

## Daily relationship rituals

During onboarding, the couple may select up to three rituals that matter to them:

- Say good morning.
- Say goodnight.
- Kiss before leaving.
- Greet each other intentionally.
- Eat together.
- Share one ordinary moment.
- Express one appreciation.
- Check in after work.
- A custom ritual.

Reminders should be gentle. Never ask partners to report whether the other person failed. Do not assign blame or show which partner completed more rituals. The current daily drawing is the first shared ritual: each person's sketch adds one aggregate unit to the server-owned fire state. Missing rituals must not create permanent damage or destroy progress.

## House state

The house represents the current emotional atmosphere. Temporary changes may include:

- Rain outside.
- Dimmer lighting.
- A cooler room tint while the ritual fireplace keeps its daily-sketch state.
- A fogged window.
- A crooked photograph.
- A small leak.
- A drooping but recoverable plant.

A unilateral emotional signal may alter the atmosphere but must not permanently damage the shared home. A visible repair spot may appear only when both partners acknowledge that an unresolved issue exists. After successful reconciliation, it may become a subtle golden seam representing something the couple worked through.

Never track or imply which partner caused the issue.

## Memory garden and spatial memories

The garden represents accumulated relationship history, not current relationship health. A memory may include:

- Title.
- Date.
- Written note.
- Photograph.
- Voice message.
- Optional manually entered location.
- Contributions from both partners.

A new memory begins as a seed. When the other partner adds their contribution, the seed blooms.

Use an extensible hierarchy:

- Flowers for everyday memories.
- Trees for major milestones.
- Vines for recurring traditions.
- Lanterns for future plans.
- Stones or golden ornaments for meaningful challenges overcome together.

For the MVP, implement one basic flower type while leaving the wider plant system extensible. Tapping a plant opens its associated memory. The interface should feel like walking through the relationship’s history, not scrolling through a social feed.

Spatial memory objects inside the house may expand this idea: framed photos, voice notes stored in a record player or meaningful object, videos on the television, and permanent objects for milestones.

## Low-effort participation

The app must remain useful when one partner enjoys writing and the other does not. Do not require:

- Long diary entries.
- Daily questionnaires.
- Multiple quizzes.
- Mandatory comments.
- Watching advertisements.
- Repetitive virtual-pet maintenance.

Optional depth may exist, but basic participation must remain extremely lightweight.

## Unequal-engagement protection

Never display or imply:

- Your partner broke the streak.
- Your partner has ignored you for two days.
- You contributed more than your partner.
- Your partner has not completed today’s task.
- Your relationship is declining because one user was inactive.

Do not create competitive effort statistics. A partner’s inactivity must not become visible evidence for an argument.

## Communication bridge

The app must lead users toward real communication. Signals should end with an appropriate real-world action:

- Talk now.
- Talk later at a selected time.
- Start a call.
- Send a voice message.
- Offer affection.
- Acknowledge the need for space.
- Confirm reconciliation.

Do not build an AI therapist, AI conflict judge, or automated relationship diagnosis for the MVP.

## Notifications

Use private, non-accusatory language:

- Something has changed at home.
- Your partner has left a signal.
- The fireplace is glowing.
- Someone is waiting in the garden.
- A new seed was planted.

Never show sensitive details on the lock screen. Generic notifications are the default, notification previews can be disabled, and repeated notifications must stop after a request for space.

## Safety and privacy requirements

Include:

- Optional biometric or PIN lock.
- No location tracking.
- No message scanning.
- No contact monitoring.
- No last-seen status.
- Screenshot prevention for private notes where platform controls allow it.
- Private notes visible only to their author unless explicitly shared.
- Safe unpairing without partner approval.
- Immediate stopping of real-time sharing after unpairing.
- Ability to block future invitations.
- Clear handling of jointly created memories.
- Ability to export and delete personal data.
- Ability to remove individually uploaded content.
- Generic notifications by default.

The product must not enable surveillance, coercion, or pressure to remain paired.

## MVP priorities

### Priority 0: essential

1. Account creation.
2. Couple pairing.
3. Shared home.
4. Two avatars.
5. Fireplace reconciliation signal.
6. Garden space signal with an explicit creator-owned return.
7. Sofa comfort signal.
8. Table conversation signal.
9. Resting or overwhelmed signal.
10. Partner acknowledgements.
11. Mutual reconciliation confirmation.
12. Temporary environmental state changes.
13. Discreet push notifications.
14. Safe unpairing.
15. Privacy controls.

### Priority 1: retention

1. Couple-selected daily rituals.
2. One basic memory-flower system.
3. Text and photograph memories.
4. Optional voice memories.
5. Basic house progression.
6. Weekly factual recap.
7. Biometric lock.
8. Customizable notification schedule.

### Priority 2: later expansion

1. Hidden daily video compilation played on the house television.
2. Multiple rooms.
3. Deeper garden hierarchy.
4. Custom furniture placement.
5. Relationship maps and travel memories.
6. Seasonal house styles.
7. More avatar animations.
8. Shared asynchronous drawing.
9. Home-screen and lock-screen widgets.
10. Printed annual memory book.

## Non-goals

Do not build:

- Relationship scores or compatibility percentages.
- Public profiles or social feeds.
- Location sharing or automatic conflict detection.
- AI therapy, sentiment analysis, or conflict judging.
- Couple leaderboards or punitive streaks.
- Permanent house destruction.
- Systems for reporting a partner’s failures.
- Chore management or shared finances.
- A general messaging replacement.
- A large collection of daily quizzes.
- Extensive virtual-pet maintenance.

## Success metrics

Measure:

- Percentage of invited partners who pair successfully.
- Percentage of emotional signals acknowledged.
- Median time between a signal and acknowledgement.
- Percentage of fireplace signals where both partners sit together.
- Percentage of fireplace sessions resulting in mutual reconciliation confirmation.
- Percentage of space requests respected without repeated prompting.
- Number of personalized rituals selected.
- Number of shared memories created.
- Seven-day and thirty-day couple retention.
- Percentage of couples returning after their first disagreement-related interaction.

Do not optimize for maximum screen time.

## Launch positioning

Primary: “The app that tells you when your partner is ready to make up.”

Alternatives:

- When neither of you wants to text first, meet by the fire.
- Say “I need space, but we’re okay” without starting another argument.
- A shared home that helps couples communicate when words are difficult.
- When they say they’re fine but do not know how to explain what is wrong.
- Your relationship has a home. Take care of it together.

## Primary viral demonstration

The value proposition should be understandable without narration:

1. A couple has an argument.
2. Neither person wants to send the first message.
3. One person moves their avatar beside the fireplace.
4. The other receives “The fireplace is glowing.”
5. They open the app and sit beside the avatar.
6. Both avatars sit together while the room warms.
7. The couple begins talking again.
