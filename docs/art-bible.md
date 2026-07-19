# Hearth — Art Bible (v1)

The vertical slice: **one warm evening in the shared room, ending in a fireplace
reconciliation.** Everything below serves that scene. Nothing ships that
contradicts this document.

## Visual style

Cozy isometric **voxel diorama** — Tuber Simulator / Crossy Road lineage, but
warmer and quieter. Chunky, readable silhouettes; zero realism ambitions.
The room floats in a deep night-blue void like a lit dollhouse — the world is
small on purpose: it's *theirs*.

## Color palette

| Role | Hex | Use |
|---|---|---|
| Night void | `#1a2340` | App background, sky |
| Cream wall | `#f0dcbc` | Walls, window frames |
| Honey wood | `#cd9a60` / `#c08b52` | Floor planks (alternating) |
| Brick ember | `#bf5a40` / `#a84a34` | Fireplace courses |
| Coral | `#d05f48` | Sofa, accents of affection |
| Flame gold | `#ff9b3d` → `#ffe08a` | Fire, lamps, the reconciliation glow |
| Leaf | `#59a04c` / `#478540` | Plants, garden |
| Heart red | `#d0564a` | The pixel heart motif — used sparingly |

Rule: warm hues dominate interiors; cool hues exist only *outside* the windows.
Mood shifts are a **global tint**, never per-object recolors.

## Lighting direction

No dynamic lights. Shading is baked per voxel face (top 1.0, camera-facing
0.78–0.86, away 0.55–0.62, bottom 0.42) with ±3% per-voxel dither. Light
"sources" (fire, lamps, moon) are self-colored bright voxels plus decal pools.
Atmosphere = tint presets: **warm** (near-white), **cool** (blue-gray),
**rain** (darker blue-gray), **reconciliation** (gold push above white).

## Material language

One material family: flat unlit vertex color. No gloss, no PBR, no gradients
inside a face. Texture richness comes from voxel patterning (brick courses,
plank alternation, book spines), never from image textures on geometry.
Generated images appear only as *flat framed art* in the world (paintings,
window sky, garden view) and in UI.

## Environment architecture

Corner diorama: two walls (back, left), open front/right, on a dark wood
plinth. Grid: 0.25 world units per voxel. Room ~5.4 × 6.75 units. Every
emotional signal spot is a physical place: fireplace+rug, sofa, table+chairs,
garden bench+door, bedroom doorway. Diagonal sight-line from camera to the
fireplace must never be blocked.

## Character proportions

Big-head voxel people at 0.09 units/voxel: head 8×7×7, body 6×5×4, legs 3
tall — total ≈ 1.35 units (≈ 40% head). Faces: 2 eye voxels, 2 blush voxels,
2 mouth voxels. Identity via hair shape + outfit/accent colors only. Both
partners always same proportions — nobody is "bigger" in the relationship.

## UI style

Dark warm glass panels (`rgba(24,15,11,0.82)`) with 1px `rgba(255,200,150,0.18)`
borders, 14–18px radii; text cream `#f5e6d8`, dim `#b9a291`, accent amber
`#e8a35c`. Emotional copy is always set in quotes, italic, verbatim from
`src/copy`. Generated illustration appears in UI as small warm vignettes
(onboarding, memory cards), never full-screen photo art.

## Camera & post

Fixed orthographic isometric: position (12, 9.8, 12), 45° azimuth, ~30°
elevation, responsive zoom fitting the whole diorama. No camera motion except
a possible 90° room-rotation later. No post-processing — the "bloom" of the
reconciliation is faked by tint overshoot + sparkles.

## Animation style

Eased, damped, gentle — nothing snaps. Walk: position damp + leg scissor +
bob. Sit: pose blend over ~0.3s. Breathing always on. Particles are square
pixels moving on coarse snapped grids (fire, embers, rain, gold motes).
Every meaningful action gets feedback: signal chosen → avatar walks; partner
joins → sits beside; both confirm → gold pulse + sparkles.

## Hero visual target

One Higgsfield-generated image (see asset list) of the ideal frame: both
characters seated at the glowing fireplace, warm room, night window, gold
motes. Every visual pass is screenshotted and compared against it; fix the
five largest gaps before adding anything new.

---

# Asset List (Higgsfield production)

Estimates include selection waste (≈2 candidates kept per 3–4 generated).

| # | Asset | Used where | Gens (est.) |
|---|---|---|---|
| 1 | **Hero visual target** — ideal fireplace-reconciliation frame | Art direction reference only | 8 |
| 2 | App icon (cozy hearth motif, voxel style) | Icon, adaptive icon | 12 |
| 3 | Splash screen art | Expo splash | 6 |
| 4 | Night-sky painting (moon + stars, flat naive style) | Window backdrop quad | 3 |
| 5 | Garden view painting | Garden door backdrop quad | 4 |
| 6 | 3 wall paintings (heart motif, landscape, botanical) | Framed art voxels/quads | 6 |
| 7 | Onboarding illustrations ×3 (meet the home / signals / garden) | Welcome flow | 12 |
| 8 | Memory-card decorative frame + seed/bloom illustrations | Garden & memories UI | 8 |
| 9 | Style refs: room mood ×2, character sheet ×2 | Palette/proportion tuning | 8 |
| 10 | Buffer for rejects & reworks (~25%) | — | 17 |
| | **Total image generations** | | **~84** |

Not from Higgsfield: all 3D geometry (code-built voxels), fonts, sounds
(sourced free/CC0 later — fire crackle, soft chime).
