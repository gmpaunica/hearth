# Hearth — Art Bible (v2)

The product world is a **sun-washed shared cottage and memory garden**, with the
fireplace reconciliation remaining its hero emotional interaction. The owner’s
Memory Garden reference supplied on 8 August 2026 is the approved whole-app
visual target. Everything below serves that world.

## Visual style

Cozy isometric **voxel storybook diorama** — handcrafted, dense, warm, and
quiet. Chunky readable silhouettes sit inside layered architecture, collected
interior details, flowering paths, water, lanterns, and sculptural foliage.
Zero realism ambitions. The connected home rests in ivory/peach atmospheric
haze like a cherished miniature rather than floating in outer space.

## Color palette

| Role | Hex | Use |
|---|---|---|
| Ivory haze | `#fff1db` / `#f4cbb0` | App atmosphere and distance |
| Cream wall | `#efd8bd` / `#e6c8ab` | Plaster walls and panels |
| Terracotta | `#c9875f` / `#9d4f39` | Floors, coping, architecture |
| Cocoa wood | `#75452f` / `#9b6041` | Furniture, frames, plinth trim |
| Blush | `#e9869b` / `#f5b2bc` | Blossoms, textiles, affection |
| Flame gold | `#ff9b3d` → `#ffe08a` | Fire, lamps, the reconciliation glow |
| Sage/olive | `#71804f` / `#557440` | Plants, hedges, garden |
| Terracotta red | `#bd5133` | UI actions and sparse heart motifs |

Rule: warm hues dominate. Cool and rain modes stay within a muted editorial
slate/sage family. Mood shifts are a **global tint and atmosphere**, never
per-object blame or destructive recoloring.

## Lighting direction

No dynamic lights. Shading is baked per voxel face with warm directional color,
deterministic variation, and per-corner contact occlusion. Light "sources"
(fire, windows, lanterns, sun) are self-colored bright voxels plus translucent
or additive decal pools. Color-matched depth fog separates room layers.
Atmosphere = tint presets: **warm** (near-white), **cool** (blue-gray),
**rain** (darker blue-gray), **reconciliation** (gold push above white).

## Material language

One geometry material family: flat unlit vertex color. No gloss, no PBR, no
photographic textures. Texture richness comes from voxel patterning (brick courses,
plank alternation, book spines), never from image textures on geometry.
Generated images appear only as *flat framed art* in the world (paintings,
window sky, garden view) and in UI.

## Environment architecture

Connected corner-room diorama: living room, bedroom, and garden share real
architectural thresholds on layered cocoa/terracotta plinths. Structural grid:
0.25 world units per voxel, with finer environmental detail where useful. Every
emotional signal spot is a physical place: fireplace+rug, sofa, table+chairs,
garden bench+door, bedroom doorway. Diagonal sight-line from camera to the
fireplace must never be blocked.

## Character proportions

Big-head voxel people at 0.09 units/voxel: head 8×7×7, body 6×5×4, legs 3
tall — total ≈ 1.35 units (≈ 40% head). Faces: 2 eye voxels, 2 blush voxels,
2 mouth voxels. Identity via hair shape + outfit/accent colors only. Both
partners always same proportions — nobody is "bigger" in the relationship.

## UI style

Translucent ivory paper panels with cocoa serif hierarchy, terracotta actions,
sage/gold secondary accents, fine warm borders, and restrained shadows. Panels
remain rounded and friendly without feeling like a dark game HUD. Emotional
copy stays verbatim from `src/copy`. The same system applies to onboarding,
pairing, signals, settings, drawing, wardrobe, and Character Lab.

## Camera & post

Fixed orthographic isometric: position (12, 9.8, 12), 45° azimuth, ~30°
elevation. Default framing is close enough for furniture and garden details to
read on a phone; drag and pinch reveal the connected outer rooms. One lightweight
nearest-neighbour finishing pass may add art-pixel-aligned highlight glow,
golden daylight, warm grading, and a restrained vignette without smoothing edges.

## Animation style

Eased, damped, gentle — nothing snaps. Walk: position damp + leg scissor +
bob. Sit: pose blend over ~0.3s. Breathing always on. Particles are square
pixels moving on coarse snapped grids (fire, embers, rain, gold motes).
Every meaningful action gets feedback: signal chosen → avatar walks; partner
joins → sits beside; both confirm → gold pulse + sparkles.

## Hero visual target

The owner’s Memory Garden frame is the whole-app style target: amber-windowed
terracotta cottage, dense sage garden, sculptural pink blossom tree, stone path,
wood bench, small keepsakes, ivory-to-peach haze, and elegant editorial paper UI.
The fireplace moment remains the interaction target inside that same world.

---

# Asset List (Higgsfield production)

Estimates include selection waste (≈2 candidates kept per 3–4 generated).

| # | Asset | Used where | Gens (est.) |
|---|---|---|---|
| 1 | **Hero visual target** — approved Memory Garden cottage frame | Art direction reference only | 8 |
| 2 | App icon (cozy hearth motif, voxel style) | Icon, adaptive icon | 12 |
| 3 | Splash screen art | Expo splash | 6 |
| 4 | Peach daylight painting (sun + distant garden, flat naive style) | Window backdrop quad | 3 |
| 5 | Garden view painting | Garden door backdrop quad | 4 |
| 6 | 3 wall paintings (heart motif, landscape, botanical) | Framed art voxels/quads | 6 |
| 7 | Onboarding illustrations ×3 (meet the home / signals / garden) | Welcome flow | 12 |
| 8 | Memory-card decorative frame + seed/bloom illustrations | Garden & memories UI | 8 |
| 9 | Style refs: room mood ×2, character sheet ×2 | Palette/proportion tuning | 8 |
| 10 | Buffer for rejects & reworks (~25%) | — | 17 |
| | **Total image generations** | | **~84** |

Not from Higgsfield: all 3D geometry (code-built voxels), fonts, sounds
(sourced free/CC0 later — fire crackle, soft chime).
