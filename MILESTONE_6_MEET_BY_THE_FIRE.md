# Milestone 6 — Meet by the fire

Date: 8 September 2026

Status: the canonical phone implementation is locally complete and verified;
a compatible APK and two-phone owner review remain explicit gates.

## Outcome

Moments now presents one calm next action for every live state: send, wait,
respond, acknowledge space, meet, and return. The experience keeps the shared
voxel home visible, avoids blame and relationship scoring, and explains
interrupted updates without exposing provider or database details.

Work was performed only in `C:\Windows\System32\hearth`. No backend contract,
Expo dependency, or native configuration changed in this milestone.

## One next action

`momentJourneyPresentation()` translates the server-owned Moment snapshot into
a small, typed presentation model. The active card therefore has one stable
headline and one next-step explanation instead of assembling state-dependent
copy throughout the controller.

- **Send:** create one gentle signal.
- **Waiting:** nothing is required and the Moment stays open until someone
  chooses to close it.
- **Respond:** choose the response that feels true.
- **Acknowledge space:** offer recognition without requesting a reply.
- **Meet:** join or complete the shared reconnect heart.
- **Return:** close only when the person is ready.

Response choices appear before optional notes. Garden language explicitly
supports giving quiet without disappearing, while fire, table, comfort, rest,
and romantic paths retain their existing behavior.

## Truthful connection states

The Moment store now records `idle`, `checking`, `current`, and `reconnecting`
sync states plus the last successful refresh. Cold launch shows a dedicated
loading explanation rather than a false empty state. Realtime timeout, closure,
or channel failure keeps the last saved Moment visible and offers **Check
current state**; it never blindly repeats a mutation.

All Moment sync and action failures pass through `DomainError`. Calm user copy
is separated from diagnostic detail, so JWT, Postgres, RPC, and infrastructure
messages cannot appear in the interface. The sensitive-surface capture shield
continues to mount on native platforms and now safely no-ops on web, where the
Expo screen-capture API is unavailable.

## Clear loss boundaries

Removing an optional note and taking back an entire Moment are separate,
confirmed actions. Each confirmation states exactly what remains, what closes,
and what cannot be restored. Irreversible actions use a distinct danger style;
the safe way back remains adjacent and equally reachable.

No Moment expires automatically, schedules a countdown, scores the
relationship, pressures a reply, or labels either person as responsible.

## Local verification

| Check | Result |
| --- | --- |
| TypeScript | pass |
| ESLint in quiet mode | pass; zero errors |
| `tests/moments-meet-by-fire.test.mjs` | pass; 6/6 focused contracts |
| `npm test` | pass; 145/145 tests |
| `npx expo install --check` | pass; dependencies current |
| `npx expo-doctor` | pass; 21/21 checks |
| Android/iOS/web production exports | pass |
| Responsive browser QA | pass at 360×800, 390×844, and 412×915 |
| Journey-state QA | pass for send, waiting, respond, space, meet, and offline |
| Loss confirmation QA | pass for note removal and Moment cancellation |
| Browser runtime | zero errors after the web capture guard; known Expo/React Native web deprecation warnings only |
| `git diff --check` | pass |

The deterministic `moments-qa` route is development-only and cannot call
Supabase or invoke a Moment mutation. It exercises the real home scene,
continuous Moments sheet, controller, response choices, retry state, and loss
confirmations. Automated sheet tests retain the existing 20-cycle open/close
stress coverage. Browser QA does not replace native realtime, background,
accessibility, or two-phone validation.

## Publication and device gates

No EAS Update, APK, native build, database migration, or Edge Function was
published or deployed. The current local Android fingerprint
`95482aee0b165321dca5300078a8ee2884b95c94` does not match the installed
versionCode 8 fingerprint `f9ee9e04d4d811c47b4eadad68eff2ffa2e9fdb3`.
Do not publish this tree as an OTA to that installed APK.

After explicit authorization for a compatible APK, use two independently
authenticated phones in both author and recipient roles and verify:

1. first sync never flashes a false empty Moment or replays an old reaction;
2. send, wait, response, acknowledge-space, meet, and return each expose one
   obvious next action;
3. background/resume, network loss, realtime reconnect, and manual retry retain
   the last saved state and do not duplicate an action;
4. both readiness halves and the reconnect payoff converge on both phones;
5. note removal and Moment cancellation require the correct confirmation and
   leave the documented records intact or closed;
6. generic notifications reveal no feeling, destination, note, or partner name;
7. TalkBack order, focus, accessibility escape, and labels remain coherent;
8. font scales 1.0, 1.3, and 2.0 keep every action reachable with 44×44 targets;
9. reduced motion and native screenshot/app-switcher protection remain active;
   and
10. rapid sheet cycles, retry taps, and concurrent responses create no stuck
    overlay, duplicate result, or unbounded memory growth.
