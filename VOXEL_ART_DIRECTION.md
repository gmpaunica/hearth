# Hearth voxel art direction

## Current Moments cozy-scrapbook revision — 18 August 2026

- The real code-native 3D fireplace is the hero and the tap target. Keep it
  visible behind a compact ivory status card; do not add a floating orb or a
  notebook/history prop.
- During a difficult Fireplace Moment, flame height, opacity, embers, glow, and
  status copy share the temporary **tending** presentation. Zero/one/two ready
  halves produce clearly different tending intensities before the unchanged
  ritual state returns.
- The split heart is a projected 2D speech bubble above the fire, approximately
  character-sized. Off halves are warm dusty pixels; member A's left and member
  B's right half fill coral. Its label is part of the bubble, not a sheet form.
- Response previews are layered scrapbook postcards: a 40×18 destination
  mosaic, warm wash, taped rounded sticker, and a readable action-specific prop
  such as a note/flame, rose, mugs, doodle, visitor, blanket, or heart. Do not
  render a generic pair of avatars in a random miniature scene.
- Moments typography is Fredoka SemiBold for warm bubbly headings and Nunito for
  body/action copy. Use peach/ivory paper, cocoa ink, coral/terracotta actions,
  softly uneven stickers/tape, generous rounded corners, and small handcrafted
  asymmetry. Avoid uppercase tracking, sharp corporate dividers, and generic
  AI-minimal cards.
- The garden threshold must never stack two coplanar floor meshes. Express the
  stone threshold inside the garden's existing floor cells and keep arch posts,
  foliage, and route colliders outside the open corridor.

## Earlier Moments owner-review visual system — 17 August 2026

- Moments place art is code-native and deliberately lightweight: 40×18
  horizontal color runs, not raster banners and not hundreds of mounted cell
  views. Each mosaic must read as a miniature composition—architecture first,
  then furniture/paths, hero props, and collected details.
- Fireplace includes the brick arch, mantel objects, logs, chairs, and layered
  flame; Garden includes bench, stepped path, hedge/flower layers, and pond/koi;
  Sofa includes terracotta seating, distinct cushions, rug, lamp, and tea;
  Table includes perspective, chairs, two mugs, flowers, and window light; Rest
  includes quilt, books, dim window, lamp, and bedside detail; Romantic includes
  a proper bed, twin lantern/nightstands, moonlit window, and paired hearts.
- Banner titles and place labels are always pure `#FFFFFF` over the dark cocoa
  lower scrim with a cocoa shadow/outline. Cream, amber, gold, and pale yellow
  are environmental colors, never banner text.
- Response previews use a small destination diorama behind two unnamed avatars
  and one result caption. Spatial notifications use dark pixel speech bubbles
  with a directional tail at stable world anchors; do not replace these with
  full-width ribbons.
- The ritual fire uses four distinct pixel sprites inside a 52-pixel cocoa orb.
  Its steady/low/warming/glowing silhouette must agree with the real fireplace,
  whose height, opacity, embers, and glow share the same server state.
- Positive non-Romantic resolution uses a fast fullscreen code-native heart.
  Romantic stays intimate with two small in-scene hearts beside the pair/bed.
  Reduced motion holds a readable static heart without flash or burst.

## Approved visual target — 8 August 2026

The owner-supplied **Memory Garden** cottage-and-garden frame is the visual
source of truth for the entire app. It supersedes the earlier dark-night-void
target. Hearth should feel like a sun-washed, handcrafted voxel storybook:

- Warm ivory and peach atmosphere rather than a navy void.
- Terracotta architecture, cocoa timber, muted sage foliage, blush blossoms,
  amber windows, and creamy stone.
- Dense, layered landscaping and collected interior details, while important
  routes and emotional locations remain immediately readable.
- Golden window shafts, soft color-matched distance haze, restrained highlight
  glow, grounding shadows, and a gentle vignette.
- Editorial UI made from translucent ivory paper, cocoa serif hierarchy,
  terracotta actions, and sage/gold secondary accents.

The look remains unmistakably voxel-built. Do not use photographic textures,
smooth realistic materials, or generic 3D-store assets to imitate the target.
Richness comes from stepped silhouettes, palette variation, layered props,
directional face color, and small intentional details.

## Owner character correction — 9 August 2026

The owner approved the warm storybook style but rejected the first pass's
scene density and character fidelity. The supplied **Character Reference
Sheet** is now the source of truth for people. Correct the characters first;
do not bundle the later house-and-garden cleanup into the same review update.

The two canonical figures are:

- A coral crew-sweater character with long tapered auburn waves, slate jeans,
  and cocoa ankle boots.
- A muted-olive hoodie character with a tousled chocolate crop, charcoal
  trousers, and cream trainers.

Stable membership identity still wins over screen-relative ownership: member A
uses the coral character and member B uses the olive character everywhere.
Wardrobe choices may change their appearance without changing member identity,
scene slot, seat, signal, or thought bubble.

Reference construction requirements:

- Keep each default figure approximately 26 primary cells tall: 11 below the
  chin and a head-heavy 15-cell head/hair silhouette.
- Build the face inside the hair silhouette with a tapered jaw and cheeks;
  never use a full-width peach visor or a flat forehead band.
- Use the same near-black cocoa ink for neutral eyes in every mood. Expression
  options change voxel placement, not eye colour.
- Hair must be an overlapping set of fringe, crown, temple, rear, and nape
  locks. No crown holes, square rims, isolated top pegs, rear skin bands, or
  flat long-hair curtains are allowed.
- A true side view must retain one readable profile eye and a tiny projecting
  nose. A true rear view must show a closed, shaded hair mass with no scalp gap.
- Arms meet the clothing boundary without sharing cells. Hair, hats, torso,
  legs, shoes, and furniture seats must not interpenetrate.
- Validate the same saved appearance at front, front three-quarter, side, back
  three-quarter, and back angles, then in the real Home camera and Wardrobe.

The next visual review, after character approval, must simplify the existing
map composition, enlarge the usable garden, repair the painting-wall layout,
and restore negative space around furniture and routes. The large pink tree and
animated koi pond are expansion-stage garden components; do not treat their
current crowded placement as approved final composition.

Characters retain the warm, coarse voxel-diorama style in the approved Hearth
character sheet: oversized rounded-square heads, compact chibi bodies, simple
one-to-two-voxel dark eyes, block hands, chunky shoes, stepped hair clumps, and
clothes built as a few readable layered volumes. The target is approximately
24–30 uniform primary voxels per character. Do not subdivide faces, hair, or
textiles onto a half-step character grid; the large visible cube is the art pixel.

Silhouettes must remain readable at the normal house camera distance. The
wardrobe view should reveal the same coarse construction seen in the home, not
a denser close-up model.

Hair silhouettes must close across the crown, rear plane, and nape in every
style so a rotated character always reads as a complete voxel model.
Build overlapping fringe, crown, temple, and rear clumps from the same primary
grid. Create texture through stepped volumes and two or three warm shade tones,
not through thin highlight bars or smaller voxels.

## Shared scale system

- Character base voxel: approximately 0.052 world units.
- Main-house pixel pass: 360 art pixels on the shorter screen side, using
  nearest-neighbour scaling so detail stays crisp rather than smoothed.
- Architecture and large furniture: use a coarser structural grid.
- Architecture trim and small environmental props may use finer grids, but
  character faces, hair, textiles, and accessories stay on the primary grid.
- Use stepped silhouettes and baked directional voxel shading; do not smooth
  geometry or add photographic textures.

## Rendering and light

- Keep voxel surfaces unlit and deterministic. Directional face shades and
  per-corner contact occlusion are baked by the shared mesher.
- The shared nearest-neighbour pixel pass may add a lightweight art-pixel-aligned
  warm grade, thresholded highlight lift, static daylight veil, and vignette.
- Light sources are bright voxels plus translucent/additive decals. Soft window
  rays, pond shimmer, lantern halos, and color-matched depth fog are approved.
- Reduced-motion mode must keep the visual meaning while stopping shimmer,
  falling petals, and unnecessary oscillation.
- Cool and rain states remain part of the same editorial palette; do not return
  to neon blue rims or a disconnected outer-space look.

## Construction rules for future house customization

- Keep room shells, wall finishes, floors, trim, doors, windows, furniture,
  and decorations as separate modular builders or meshes.
- Do not bake swappable finishes or decorations into a monolithic room mesh.
- Every customizable object needs a stable slot or anchor, a palette/style ID,
  and conservative bounds for navigation and camera framing.
- Reuse the shared `Vox` mesher and deterministic palette shading so purchased
  or unlocked pieces always look native to the same house.
- Build environmental density in layers: architecture, paths, hero foliage,
  furniture, then small props and flowers. Preserve negative space around
  navigation routes and emotional interaction spots instead of leaving the
  rest of the world sparse.

## Wardrobe direction

Wardrobe releases should be coherent full looks rather than unrelated colored
pieces. Outfit names and silhouettes may follow current youth style, while all
looks and accessories remain freely selectable regardless of gender.
Tops, bottoms, and shoes must also work as modular slots. Selecting a modular
piece exits the active full-look override; dresses, suits, and other inseparable
silhouettes remain available as full looks with their intended component set.
