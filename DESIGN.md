---
name: Hearth
description: An intimate shared-story interface where twilight covers, parchment folios, and tactile clay-and-sage controls lead two partners gently home.
colors:
  cover: "#2D2436"
  cover-raised: "#3A2D43"
  parchment: "#FFF8EE"
  parchment-raised: "#FFFCF7"
  parchment-warm: "#FCEBDD"
  ink: "#4B2E24"
  ink-muted: "#77594B"
  ink-faint: "#806357"
  clay: "#C95850"
  clay-pressed: "#A83F3B"
  coral: "#F0787F"
  coral-soft: "#F8D1D6"
  sage: "#78906A"
  sage-soft: "#DDE9D7"
  twilight: "#584766"
  twilight-soft: "#E8DFEC"
  gold: "#BE8745"
  line: "rgba(88, 57, 43, 0.18)"
  line-strong: "rgba(126, 68, 51, 0.34)"
  on-accent: "#FFFDF8"
  danger: "#A23F3A"
  danger-soft: "#F7DDD8"
  success: "#52734B"
  success-soft: "#DDEAD8"
  scrim: "rgba(31, 23, 37, 0.72)"
  focus: "#875E99"
typography:
  display:
    fontFamily: "HearthFredoka"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.147
  title:
    fontFamily: "HearthFredoka"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "HearthNunito"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4375
  label:
    fontFamily: "HearthNunito-ExtraBold"
    fontSize: "15px"
    fontWeight: 800
    lineHeight: 1.333
  caption:
    fontFamily: "HearthNunito"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.385
rounded:
  sm: "10px"
  md: "16px"
  lg: "24px"
  page: "30px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  page: "28px"
components:
  story-page:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink}"
    rounded: "{rounded.page}"
    padding: "24px 28px 24px 42px"
  button-primary:
    backgroundColor: "{colors.clay}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.sage-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "48px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.clay-pressed}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "48px"
  button-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "48px"
  text-field:
    backgroundColor: "{colors.parchment-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "54px"
  notice-neutral:
    backgroundColor: "{colors.twilight-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: "12px"
  notice-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: "12px"
  notice-error:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: "12px"
---

# Design System: Hearth

## Overview

**Creative North Star: "The Shared Storybook Hearth"**

Hearth should feel like opening a private story that belongs to two people. A deep twilight cover protects a warm parchment folio; coral binding stitches, friendly type, and a tiny code-built voxel hearth make the interface feel held, handmade, and recognizably connected to the shared home. The reviewed visual direction originates in the shared-house field-guide concept, seed `45488e1d`.

This is a calm operating interface, not decorative nostalgia. Each surface leads with one plain promise or task, keeps supporting copy brief, and makes the next action obvious without urgency, blame, scoring, or surveillance cues. `HearthTheme` is the normative semantic source and the reusable storybook primitives in `HearthPrimitives.tsx` are its canonical expression. The exported `ui`, `editorial`, and `hearthUi` objects are compatibility-only surfaces for older screens: migrate them toward `HearthTheme`; never treat them as parallel themes or source new work from them. Voxel-scene palettes and avatar presets remain separate art domains.

**Key Characteristics:**

- Protective twilight outer cover with one warm parchment working surface.
- Coral binding and code-built pixel details that connect UI to the voxel home.
- Fredoka-led promises with Nunito-led explanation, controls, and status.
- Clay for the one primary action; sage for supportive or parallel actions.
- Left-led reading order, generous quiet space, and a thumb-reachable action foot.
- Calm, relationship-safe state copy with visible recovery and no raw infrastructure detail.

## Colors

The palette pairs protective twilight and cocoa neutrals with edible, natural accents: fired clay, coral thread, garden sage, and a small hearth-gold spark.

### Primary

- **Fired Clay** (`clay`): The decisive action color for the single forward action on a surface.
- **Kiln Clay** (`clay-pressed`): The deeper edge, pressed state, quiet-action text, and compact pixel shading that give clay tactile weight.
- **Candle White** (`on-accent`): High-contrast text and activity indicators on decisive accent fills.

### Secondary

- **Garden Sage** (`sage`): Supportive action borders, patient activity, and positive connective cues.
- **Sage Wash** (`sage-soft`): The calm filled surface for secondary actions.
- **Deep Leaf** and **Success Wash** (`success`, `success-soft`): Reserved for confirmed, non-competitive success feedback.

### Tertiary

- **Coral Binding** and **Blush Binding** (`coral`, `coral-soft`): Book construction, progress, and selective warmth; coral is not a second call-to-action color.
- **Twilight Plum** and **Lavender Dusk** (`twilight`, `twilight-soft`): Supporting dusk accents and neutral notice surfaces.
- **Hearth Gold** (`gold`): A tiny ember or meaningful glint, especially inside voxel marks; never a broad fill.
- **Focus Violet** (`focus`): The semantic focus accent when an explicit focus treatment is needed.
- **Grounded Red** and **Error Blush** (`danger`, `danger-soft`): Recoverable error and destructive-action roles, with reassuring copy rather than alarm styling.

### Neutral

- **Twilight Cover** and **Raised Twilight** (`cover`, `cover-raised`): The protective outer shell and raised dark surfaces.
- **Parchment Folio**, **Fresh Parchment**, and **Warm Parchment** (`parchment`, `parchment-raised`, `parchment-warm`): The main page, editable controls, and inset story panels.
- **Cocoa Ink**, **Soft Cocoa**, and **Faded Cocoa** (`ink`, `ink-muted`, `ink-faint`): Primary reading, supporting prose, and placeholder or low-emphasis text.
- **Cocoa Hairline** and **Clay Outline** (`line`, `line-strong`): Quiet structural boundaries that preserve the paper character.
- **Night Scrim** (`scrim`): A protective modal backdrop, not a decorative overlay.

### Named Rules

**The Cover-and-Folio Rule.** Twilight belongs outside the working page; parchment owns the content field. Preserve that nesting whenever a flow needs the storybook shell.

**The One-Clay-Action Rule.** Give clay to the single forward action. Use sage for a meaningful alternative and quiet clay text for retreat or reset.

**The Compatibility-Is-Not-A-Theme Rule.** New UI consumes `HearthTheme`; `ui`, `editorial`, and `hearthUi` exist only to keep older surfaces stable while they migrate.

## Typography

**Display Font:** HearthFredoka, loaded from Fredoka SemiBold

**Body Font:** HearthNunito, loaded from Nunito Regular

**Label Font:** HearthNunito-ExtraBold, loaded from Nunito ExtraBold

**Character:** Fredoka gives promises and scene-setting headings a rounded, spoken warmth. Nunito stays quieter and clearer for instructions, labels, inputs, progress, and recovery copy, while ExtraBold supplies confident control labels without resorting to all caps.

### Hierarchy

- **Display** (SemiBold, 34px, 39px line): One expressive, left-aligned promise or task heading per major state; keep its measure within 330px.
- **Title** (SemiBold, 24px, 30px line): Smaller story headings and section titles when display scale would overstate the moment.
- **Body** (Regular, 16px, 23px line): Concise explanation and relationship-safe guidance; keep primary prose within 350px.
- **Label** (ExtraBold, 15px, 20px line): Buttons and field labels that need a steady, tactile voice.
- **Caption** (Regular or ExtraBold, 13px, 18px line): Progress, hints, statuses, and notices; weight communicates emphasis, not urgency.

### Named Rules

**The Promise-and-Prose Rule.** Fredoka says what the moment means; Nunito explains what happens next. Do not use generic serif, system display, or unrelated novelty faces as substitutes.

**The Sentence-Case Rule.** Controls and guidance read like calm speech. Reserve spaced uppercase for the small `HEARTH` wordmark and intentionally letterspaced private codes.

## Layout

The canonical shell fills the safe area with the twilight cover, then insets one rounded folio by 12px horizontally and 10px vertically. The coral binding owns the left 18px edge; folio content compensates with 42px left padding, 28px right padding, and 24px vertical padding. On heights below 720px, vertical content padding compresses to 16px while the reading order and touch sizes remain intact.

Each state follows one vertical story: progress or wordmark, optional voxel mark, one left-aligned heading, concise body, one focused field or choice, feedback, then actions. Headings and prose have bounded measures rather than stretching edge to edge. `StoryActions` uses automatic top margin, 32px breathing room, and 8px gaps to keep the decisive action at the reachable page foot without pinning content under the keyboard.

The shell always respects safe areas, avoids the keyboard on both platforms, and scrolls instead of clipping on short screens or large text. Every interactive primitive is at least 48px tall, and side-by-side actions retain an 8px gap. When width cannot support two readable actions, stack them without changing their semantic order.

**The One-Story-Column Rule.** Preserve a single obvious reading path and a single major task per surface; the folio is not a dashboard grid.

**The Reachable-Ending Rule.** The primary action closes the visual sentence at the page foot, but scrolling and keyboard avoidance always outrank a fixed bottom position.

## Elevation & Depth

Depth is a restrained hybrid of tonal nesting and three purposeful shadows. The folio lifts from the twilight cover with a broad ambient shadow (`#201629`, 24% opacity, 22px radius, 0/12px offset, Android elevation 12). Primary clay actions use a smaller grounded shadow (`clay-pressed`, 24% opacity, 9px radius, 0/5px offset, Android elevation 4). The voxel hearth mark uses a hard 4px by 4px offset with no blur, preserving pixel-art logic. All other hierarchy comes from parchment variants, borders, and spacing rather than stacks of floating cards.

**The Folio-Casts-the-Room Rule.** Ambient elevation belongs to the main folio; nested content is usually tonal and bordered, not independently floating.

**The Tactile-Only Rule.** Add a control shadow only when it helps the primary action feel pressable. Secondary, quiet, and informational surfaces remain grounded.

## Shapes

The form language is soft but constructed: a generous 30px folio corner, 24px inset story panels, 16px controls and notices, 10px compact details, and fully pill-shaped stitches or progress segments. One-pixel cocoa/clay boundaries keep pale surfaces legible without making them feel boxed in.

The code-built hearth is the deliberate geometric counterpoint. Its 7px square pixels remain crisp, blocky, and unrounded, with a hard shadow; never smooth it into a generic fireplace icon. The coral binding is flush to the folio edge, while seven pale pill stitches make the book metaphor physical rather than ornamental wallpaper.

**The Soft-Paper, Crisp-Pixel Rule.** Paper and controls curve; voxel marks remain square. Do not blur the distinction.

## Components

### HearthScreen

The canonical storybook shell combines safe-area handling, keyboard avoidance, twilight cover, ambient page lift, parchment folio, wordmark, coral binding, and a vertically scrollable content column. Reuse it for focused entry, recovery, and other one-purpose flows; do not rebuild its layers per screen.

### StoryHearthMark

A 9-by-9 code-built voxel fireplace rendered from 7px squares in clay, kiln clay, cocoa, and gold. It is decorative and hidden from accessibility traversal; the adjacent heading carries the meaning.

### StoryProgress

Progress states the current step in ExtraBold Nunito, then repeats it visually as 4px pill segments. Completed/current segments use coral binding; future segments use lavender dusk. The group exposes a native progressbar role and numerical value.

### StoryHeading and StoryBody

Headings are Fredoka, left aligned, and accessibility headers. On native state changes, the heading receives accessibility focus after the quick motion interval; web retains normal document focus behavior. Body copy uses muted cocoa Nunito and stays concise.

### HearthButton

- **Shape:** Gently rounded tactile rectangle (16px radius), at least 48px tall, with 16px horizontal and 12px vertical padding.
- **Primary:** Fired-clay fill, kiln-clay border and grounded shadow, candle-white ExtraBold label.
- **Secondary:** Sage-wash fill, garden-sage border, cocoa label; use for a genuine alternative such as Copy or Share.
- **Quiet:** Transparent surface and kiln-clay label; use for Back, Start over, or another non-destructive retreat.
- **Danger:** Error-blush surface, grounded-red border and label; reserve for destructive choices.
- **States:** Pressed controls scale to 98.5% and 90% opacity. Disabled or busy controls use 46% opacity; busy replaces the label with a role-colored activity indicator. Native Android ripple is a restrained translucent white.

### HearthTextField

The field pairs an ExtraBold cocoa label with a 54px-high fresh-parchment input, clay outline, 16px radius, and Nunito text. Placeholder text uses faded cocoa. Error changes the outline and supporting message to grounded red; otherwise one muted hint may sit below. Screen-specific transformations such as a centered, letterspaced six-character home code extend this primitive rather than creating a second input system.

### HearthNotice

A compact, polite live-region panel with 16px corners, a one-pixel semantic outline, and 12px padding. Neutral notices use lavender dusk, success notices use success wash with a sage edge, and errors use error blush with grounded-red type. Notices reassure and explain the next safe action; they never expose service names, tokens, URLs, status codes, or database diagnostics.

### StoryActions

The action group closes the story column with 32px top breathing room and 8px between controls. It accepts stacked actions by default and a two-column row when labels remain readable. Preserve primary-first semantic order even when the visual arrangement changes responsively.

## Do's and Don'ts

### Do:

- **Do** source every new application UI decision from semantic `HearthTheme` roles and the storybook primitives.
- **Do** keep one expressive Fredoka heading, brief Nunito guidance, and one obvious next action in each focused state.
- **Do** preserve the twilight-cover, parchment-folio, coral-binding nesting when using the canonical storybook shell.
- **Do** keep touch targets at least 48px, content scrollable at large type, controls clear of the keyboard and safe area, and state changes understandable with reduced motion.
- **Do** use the code-built voxel hearth or equally intentional code-native pixel details to connect interface and shared home.
- **Do** pair error color with calm, actionable, relationship-safe language and a visible recovery path.

### Don't:

- **Don't** import `ui`, `editorial`, or `hearthUi` into new surfaces; they are compatibility-only exports to migrate, not normative alternatives.
- **Don't** replace the one-story column with a generic account modal, dashboard card stack, or dense settings composition.
- **Don't** spend coral, sage, gold, and clay as interchangeable accents; each has a distinct semantic job.
- **Don't** smooth the voxel hearth into a generic icon, add decorative raster art without provenance, or detach UI imagery from the recognizable voxel world.
- **Don't** use urgency, blame, competitive progress, surveillance cues, or raw infrastructure language in visual feedback.
- **Don't** pin actions over content when the keyboard, short height, or larger text needs the folio to scroll.
