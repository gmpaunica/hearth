# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Two partners using personal phones, often at an emotionally sensitive moment.
They may be new to relationship apps and should not need technical knowledge or
a long tutorial. Each person needs to create or join one private shared home and
understand the next safe action quickly.

## Product Purpose

Hearth is a private two-person relationship app centred on a shared voxel home.
It gives partners a low-pressure way to express an emotional need, respond, and
move toward real conversation, affection, or agreed space. Success means the
couple reaches the shared home, understands Moments, and can complete a gentle
two-person interaction without blame or ambiguity.

## Positioning

Emotional signals are expressed spatially inside a shared, persistent home:
moving to the fireplace, sofa, table, garden, rest nook, or bedroom communicates
a specific need and gives the other partner a relationship-safe response.

## Operating Context

- First use begins with an anonymous account, a chosen name, and a short
  create-or-join pairing journey.
- The core loop is Moments: send, wait, acknowledge, respond, give space, or
  mutually meet.
- The home also holds shared rituals, sketches, optional photo/voice/diary
  material, memories, styling, and decorating through progressive disclosure.
- Two independently authenticated phones and intermittent mobile connectivity
  are normal operating conditions.

## Capabilities and Constraints

- Expo SDK 57, React Native, Expo Router, Supabase Auth/Realtime/RLS, and EAS.
- Android is the current physical release gate; iOS and web exports remain
  supported validation targets.
- Moments and the voxel home remain the core experience.
- Sensitive content must never appear in diagnostic errors, notification
  payloads, analytics, or unauthorized exports.
- Database deployments, native builds, and incompatible previews are explicit
  release gates.
- One major home surface may be active at a time.

## Brand Commitments

- Product name: Hearth.
- Voice: warm, plain, calm, neutral, non-blaming, and never urgent or
  surveillance-like.
- The visual direction is an intimate storybook interpretation of the shared
  voxel home, using Fredoka headings and Nunito body/UI text.
- The recognizable voxel scene, existing character identities, and approved
  relationship-safety language must be preserved.

## Evidence on Hand

- `PRODUCT_BRIEF.md` records purpose, safety boundaries, and approved flows.
- `EXPERIENCE_ROADMAP.md` records review gates and interaction direction.
- `VOXEL_ART_DIRECTION.md` and `docs/art-bible.md` record scene constraints.
- The repository contains the complete `1.0.4` phone client, existing voxel
  assets, local fonts, tests, and production export tooling.
- There are no approved testimonials or external product claims; none may be
  fabricated.

## Product Principles

1. Say the unsayable gently.
2. Lead toward real connection rather than replacing conversation.
3. Keep every interaction private, reversible where possible, and free of
   blame, scoring, pressure, or inferred surveillance.
4. Preserve one shared home and one obvious next action.
5. Reveal secondary rituals and customization progressively.

## Accessibility & Inclusion

Target WCAG AA contrast, 44×44 minimum touch targets, dynamic type, safe areas,
keyboard avoidance, screen-reader focus management, meaningful TalkBack order,
and reduced-motion behavior. Relationship language must remain neutral and safe
for different partners, identities, and conflict contexts.
