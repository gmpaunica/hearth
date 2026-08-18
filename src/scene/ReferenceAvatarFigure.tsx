import { useMemo, type RefObject } from 'react';
import * as THREE from 'three';

import { characterPose } from '@/character/characterPoses';
import type {
  CharacterColors,
  CharacterPoseId,
  CharacterRigRefs,
} from '@/character/characterTypes';
import { Vox, voxelMaterial } from './voxel';

export type AvatarColors = CharacterColors;

// One primary cube is one visible art pixel. The two default figures are
// exactly 26 cells tall: 11 below the chin and 15 in the head/hair silhouette.
// This head-heavy ratio is the defining proportion of the supplied sheet.
const V = 0.052;
const LEG_CELLS = 5;
const TORSO_CELLS = 6;
const ARM_CELLS = 2;
const SHOULDER_CELLS = 7;
const CUBE_SEAM = 0.035;
const FACE_FRONT_Z = 7;
export const AVATAR_HEAD_WIDTH_CELLS = 11;
export const AVATAR_HIP_Y = LEG_CELLS * V;
export const AVATAR_HEAD_Y = (LEG_CELLS + TORSO_CELLS) * V;
export const AVATAR_TORSO_HEIGHT = TORSO_CELLS * V;

// Lab and wardrobe previews must not inherit the last room mood through the
// shared voxel tint. The fixed warm-white material preserves the approved
// reference palette, while Home's default material remains atmosphere-aware.
const referenceVoxelMaterial = new THREE.MeshBasicMaterial({
  vertexColors: true,
  color: '#fff3e4',
});

function hasWideTorso(colors: AvatarColors) {
  return colors.topStyle === 'striped-rugby';
}

function mixedColor(color: string, target: string, amount: number) {
  return '#' + new THREE.Color(color).lerp(new THREE.Color(target), amount).getHexString();
}

const lighter = (color: string, amount: number) => mixedColor(color, '#fff0d2', amount);
const darker = (color: string, amount: number) => mixedColor(color, '#211812', amount);

function buildLeg(colors: AvatarColors, side: -1 | 1) {
  const v = new Vox();
  const trouserLight = lighter(colors.bottom, 0.14);
  const trouserDark = darker(colors.bottom, 0.18);
  const skirt = colors.bottomStyle === 'pleated-skirt' || colors.bottomStyle === 'dress-skirt';
  const ankleX = side < 0 ? 1 : 0;

  if (skirt) {
    // One exposed leg course ends directly below the skirt. The volumes meet
    // at a boundary instead of occupying the same cells.
    v.box(ankleX, 2, 0, 2, 1, 2, colors.skin);
  } else {
    v.box(ankleX, 2, 0, 2, 3, 2, colors.bottom);
    v.box(side < 0 ? 2 : 0, 3, 1, 1, 2, 1, trouserLight);
    v.set(side < 0 ? 1 : 0, 2, 0, trouserDark);
    if (colors.bottomStyle === 'carpenter-cargos') {
      v.set(side < 0 ? 2 : 0, 3, 1, trouserDark);
      v.set(side < 0 ? 2 : 0, 4, 1, colors.detail);
    } else if (colors.bottomStyle === 'straight-denim') {
      v.box(ankleX, 2, 0, 2, 1, 2, trouserLight);
    } else if (colors.bottomStyle === 'wide-trousers') {
      v.box(ankleX, 2, 0, 2, 1, 3, trouserDark);
    }
  }

  const sole = '#eadcc4';
  const soleDark = '#9d8062';
  const trainerSole = '#6a5948';
  if (colors.shoeStyle === 'mary-janes') {
    v.box(0, 0, 0, 3, 1, 4, soleDark);
    v.box(0, 1, 0, 3, 1, 4, colors.shoes);
    v.box(0, 2, 1, 3, 1, 1, colors.shoes);
    v.set(1, 2, 2, lighter(colors.shoes, 0.3));
  } else if (colors.shoeStyle === 'ankle-boots') {
    v.box(0, 0, 0, 3, 1, 4, darker(colors.shoes, 0.3));
    v.box(0, 1, 0, 3, 2, 3, colors.shoes);
    v.set(1, 2, 3, lighter(colors.shoes, 0.2));
  } else if (colors.shoeStyle === 'loafers' || colors.shoeStyle === 'derby-shoes') {
    v.box(0, 0, 0, 3, 1, 4, darker(colors.shoes, 0.3));
    v.box(0, 1, 0, 3, 1, 4, colors.shoes);
    v.box(0, 2, 1, 3, 1, 1, colors.shoes);
    v.set(1, 1, 3, colors.detail);
  } else {
    // Reference trainer: contrasting sole, cream upper/toe, dark tongue.
    v.box(0, 0, 0, 3, 1, 4, trainerSole);
    v.box(0, 1, 0, 3, 1, 4, colors.shoes);
    v.box(0, 1, 3, 3, 1, 1, sole);
    v.set(1, 2, 1, darker(colors.shoes, 0.16));
  }

  const geometry = v.build(V, 0.035, CUBE_SEAM);
  geometry.translate(-1.5 * V, -LEG_CELLS * V, -V);
  return geometry;
}

function buildTorso(colors: AvatarColors) {
  const v = new Vox();
  const outerLight = lighter(colors.outer, 0.2);
  const outerDark = darker(colors.outer, 0.2);

  const hoodie = () => {
    v.box(0, 0, 0, SHOULDER_CELLS, 6, 4, colors.outer);
    // The hood ends directly below the head, leaving a clean hair/hood seam.
    v.box(0, 4, -2, 7, 2, 3, outerDark);
    // A quiet pouch seam reads as clothing; contrast spots read as a face at
    // this coarse scale, so keep the pocket close to the base olive.
    v.box(2, 1, 4, 3, 2, 1, lighter(colors.outer, 0.06));
    v.box(2, 1, 4, 3, 1, 1, darker(colors.outer, 0.08));
    v.set(2, 4, 4, colors.detail);
    v.set(4, 4, 4, colors.detail);
    v.box(2, 5, 3, 3, 1, 2, outerDark);
    v.box(0, 0, 0, 7, 1, 4, outerDark);
  };
  const sweater = () => {
    v.box(0, 0, 0, SHOULDER_CELLS, 6, 4, colors.outer);
    v.box(2, 5, 2, 3, 1, 2, outerDark);
    v.box(0, 0, 0, 7, 1, 4, outerDark);
  };
  const knit = () => {
    v.box(0, 0, 0, 7, 6, 4, colors.outer);
    v.box(2, 5, 1, 3, 2, 3, outerDark);
    v.box(3, 5, 2, 1, 2, 2, colors.inner);
    for (const x of [1, 3, 5]) {
      v.box(x, 1, 4, 1, 4, 1, outerLight);
      v.set(x, 2, 4, outerDark);
    }
    v.box(0, 0, 0, 7, 1, 4, outerDark);
  };
  const puffer = () => {
    v.box(-1, 0, 0, 9, 6, 4, colors.outer);
    for (const y of [1, 3, 5]) {
      v.box(-1, y, 3, 9, 1, 2, y === 3 ? colors.inner : outerLight);
      v.box(-1, y, 0, 9, 1, 4, outerDark);
    }
    v.box(3, 0, 4, 1, 6, 1, colors.detail);
  };
  const cardigan = (scarf = false) => {
    v.box(1, 0, 0, 5, 6, 4, colors.inner);
    v.box(0, 0, 0, 3, 6, 5, colors.outer);
    v.box(4, 0, 0, 3, 6, 5, colors.outer);
    v.box(0, 0, 0, 7, 1, 4, outerDark);
    for (const y of [1, 3, 5]) v.set(3, y, 4, colors.detail);
    if (scarf) {
      v.box(2, 5, 4, 3, 1, 1, colors.detail);
      v.set(3, 4, 4, lighter(colors.detail, 0.18));
    }
  };
  const overalls = () => {
    v.box(0, 0, 0, 7, 6, 4, colors.inner);
    v.box(2, 0, 3, 3, 4, 2, colors.outer);
    v.box(1, 4, 3, 2, 2, 2, colors.outer);
    v.box(4, 4, 3, 2, 2, 2, colors.outer);
    v.set(2, 4, 4, colors.detail);
    v.set(4, 4, 4, colors.detail);
    v.box(2, 1, 4, 3, 1, 1, outerDark);
  };
  const jacket = () => {
    v.box(1, 0, 0, 5, 6, 4, colors.inner);
    v.box(0, 0, 0, 3, 6, 5, colors.outer);
    v.box(4, 0, 0, 3, 6, 5, colors.outer);
    v.box(0, 0, 0, 7, 1, 4, outerDark);
    v.box(0, 4, 4, 2, 1, 1, outerLight);
    v.box(5, 4, 4, 2, 1, 1, outerLight);
    v.set(1, 4, 4, colors.detail);
    v.set(5, 4, 4, colors.detail);
  };

  if (colors.outfitStyle === 'heritage-street' || colors.outfitStyle === 'ember-hoodie') hoodie();
  else if (colors.outfitStyle === 'modern-prep') knit();
  else if (colors.outfitStyle === 'layered-90s') sweater();
  else if (colors.outfitStyle === 'soft-tailoring') cardigan();
  else if (colors.outfitStyle === 'slip-dress') overalls();
  else if (colors.outfitStyle === 'relaxed-suit') jacket();
  else if (colors.outfitStyle === 'lilac-layers') cardigan();
  else if (colors.topStyle === 'berry-puffer') sweater();
  else if (colors.topStyle === 'striped-rugby') puffer();
  else if (colors.topStyle === 'garden-overalls') overalls();
  else if (colors.topStyle === 'golden-cardigan' || colors.topStyle === 'cropped-cardigan') cardigan();
  else if (colors.topStyle === 'denim-weekend') jacket();
  else if (colors.topStyle === 'lilac-cardigan') cardigan();
  else if (colors.topStyle === 'oatmeal-knit' || colors.topStyle === 'fitted-turtleneck') knit();
  else hoodie();

  if (colors.bottomStyle === 'pleated-skirt' || colors.bottomStyle === 'dress-skirt') {
    v.box(-1, -2, 0, 9, 3, 5, colors.bottom);
    v.box(-1, -1, 0, 9, 1, 5, darker(colors.bottom, 0.14));
    for (const x of [0, 3, 6]) v.box(x, -2, 4, 1, 2, 1, lighter(colors.bottom, 0.12));
  } else {
    v.box(0, 0, 0, 7, 1, 4, colors.bottom);
    v.box(0, 0, 3, 7, 1, 1, darker(colors.bottom, 0.18));
  }

  const geometry = v.build(V, 0.035, CUBE_SEAM);
  geometry.translate(-3.5 * V, 0, -2 * V);
  return geometry;
}

function buildArm(colors: AvatarColors, side: -1 | 1) {
  const v = new Vox();
  const sleeve = colors.topStyle === 'garden-overalls' ? colors.inner : colors.outer;
  v.box(0, 2, 0, ARM_CELLS, 4, 2, sleeve);
  v.box(0, 2, 0, ARM_CELLS, 1, 2, darker(sleeve, 0.16));
  if (colors.topStyle === 'striped-rugby') {
    v.box(0, 3, 1, ARM_CELLS, 1, 1, lighter(sleeve, 0.22));
    v.box(0, 5, 0, ARM_CELLS, 1, 2, darker(sleeve, 0.14));
  } else if (colors.topStyle === 'oatmeal-knit' || colors.topStyle === 'fitted-turtleneck') {
    v.set(side < 0 ? 0 : 1, 3, 1, lighter(sleeve, 0.24));
    v.set(side < 0 ? 1 : 0, 5, 1, darker(sleeve, 0.1));
  }
  v.set(side < 0 ? 0 : 1, 4, 1, lighter(sleeve, 0.18));
  v.box(0, 0, 0, ARM_CELLS, 2, 2, colors.skin);
  v.set(side < 0 ? 1 : 0, 0, 1, lighter(colors.skin, 0.06));
  const geometry = v.build(V, 0.035, CUBE_SEAM);
  geometry.translate(-V, -TORSO_CELLS * V, -V);
  return geometry;
}

function buildHead(colors: AvatarColors) {
  const v = new Vox();
  const hairLight = colors.hairAccent;
  const hairMid = mixedColor(colors.hair, colors.hairAccent, 0.42);
  const hairDark = darker(colors.hair, 0.22);

  // The skin sits inside the eleven-cell hair silhouette: a seven-cell jaw,
  // nine-cell cheek course and seven-cell crown keep the face compact instead
  // of reading as a flat visor. Every visible unit remains a primary voxel.
  v.box(2, 0, 1, 7, 2, 6, colors.skin);
  v.box(1, 2, 0, 9, 6, 8, colors.skin);
  v.box(2, 8, 1, 7, 2, 6, colors.skin);

  const crown = (rearLow = 3) => {
    // A tapered nape closes the skull from behind. Previously this started
    // several courses too high and exposed a peach band in rear views.
    v.box(2, 0, 1, 7, 2, 1, rearLow === 0 ? colors.hair : hairDark);
    v.box(1, 2, 0, 9, 4, 2, hairDark);
    v.box(0, 6, 0, 11, 4, 2, colors.hair);
    v.box(0, 7, 0, 11, 3, 7, colors.hair);
    v.box(1, 9, 1, 9, 3, 6, colors.hair);
    v.box(2, 12, 2, 3, 1, 4, hairMid);
    v.box(5, 12, 2, 4, 1, 4, hairLight);
  };
  const temples = (low = 4, height = 4) => {
    v.box(0, low, 2, 2, height, 6, hairDark);
    v.box(9, low, 2, 2, height, 6, hairMid);
  };
  const front = (x: number, y: number, width: number, height: number, color: string) => {
    v.box(x, y, FACE_FRONT_Z, width, height, 2, color);
  };

  if (colors.hairStyle === 'curly-volume') {
    crown(2);
    temples(4, 5);
    for (const [x, y, z, tone] of [
      [-1, 7, 1, 0], [1, 10, 1, 1], [3, 12, 1, 0], [5, 13, 2, 2],
      [7, 11, 1, 0], [9, 8, 1, 1], [0, 6, 6, 1], [3, 8, 7, 2],
      [6, 8, 7, 0], [9, 6, 6, 0],
    ] as const) {
      v.box(x, y, z, 2, 2, 2, tone === 0 ? colors.hair : tone === 1 ? hairMid : hairLight);
    }
    front(1, 6, 3, 3, hairDark);
    front(4, 7, 3, 3, colors.hair);
    front(7, 6, 3, 3, hairMid);
  } else if (colors.hairStyle === 'center-part') {
    crown(0);
    v.box(-1, 0, 1, 3, 9, 6, hairDark);
    v.box(9, 0, 1, 3, 9, 6, hairMid);
    front(0, 6, 5, 3, colors.hair);
    front(6, 6, 5, 3, hairMid);
    v.box(1, 10, 1, 4, 3, 5, colors.hair);
    v.box(6, 10, 1, 4, 3, 5, hairLight);
  } else if (colors.hairStyle === 'layered-bob' || colors.hairStyle === 'italian-bob') {
    crown(0);
    v.box(-1, 0, 1, 3, 9, 6, hairDark);
    v.box(9, 0, 1, 3, 9, 6, hairMid);
    v.box(1, 0, 0, 9, 4, 2, colors.hair);
    front(1, 6, colors.hairStyle === 'italian-bob' ? 6 : 4, 3, colors.hair);
    front(0, 4, 3, 4, hairMid);
    front(8, 3, 3, 5, hairLight);
    v.box(4, 12, 2, 3, 2, 4, colors.hair);
  } else if (colors.hairStyle === 'long-waves') {
    // Reference long waves: a closed rear skull under a handful of broad crown
    // locks. The lower lengths are narrow, staggered, and live entirely behind
    // the arm depth range so the silhouette never fuses at either shoulder.
    v.box(2, 0, 0, 7, 3, 2, hairDark);
    v.box(1, 2, 0, 9, 5, 2, colors.hair);
    v.box(0, 6, 0, 4, 5, 3, hairDark);
    v.box(3, 7, -1, 4, 5, 3, colors.hair);
    v.box(7, 6, 0, 4, 5, 3, hairMid);

    v.box(0, 8, 1, 4, 3, 6, hairDark);
    v.box(2, 9, 1, 4, 4, 6, colors.hair);
    v.box(5, 9, 1, 4, 5, 6, hairMid);
    v.box(8, 8, 1, 3, 3, 6, hairLight);
    v.box(2, 11, 2, 4, 3, 4, colors.hair);
    v.box(6, 11, 2, 3, 4, 4, hairLight);
    v.box(4, 13, 3, 3, 2, 3, hairMid);

    // Temple courses frame the cheeks above the shoulder line.
    v.box(-1, 3, 1, 3, 6, 5, hairDark);
    v.box(0, 2, 4, 2, 5, 4, hairMid);
    v.box(9, 3, 1, 3, 6, 5, hairMid);
    v.box(9, 2, 4, 2, 5, 4, hairLight);

    // Four distinct rearward tips give the front, side and back views an
    // obvious lock rhythm. Hoodie combinations use a shallower rear course;
    // the canonical sweater keeps the fuller connected wave from the sheet.
    const clearsRearHood =
      colors.outfitStyle === 'heritage-street' ||
      colors.outfitStyle === 'ember-hoodie' ||
      colors.topStyle === 'moss-hoodie' ||
      colors.topStyle === 'ember-hoodie' ||
      colors.topStyle === 'oversized-hoodie';
    const tipZ = clearsRearHood ? -2 : -1;
    const tipDepth = clearsRearHood ? 2 : 3;
    v.box(0, -3, tipZ, 2, 6, tipDepth, hairMid);
    // A technical backpack occupies the inner pair's plane, so that saved
    // combination keeps the two outer locks instead of intersecting it.
    if (colors.accessory !== 'technical-pack') {
      v.box(2, -1, tipZ, 2, 4, tipDepth, hairDark);
      v.box(7, -2, tipZ, 2, 5, tipDepth, hairLight);
    }
    v.box(9, -4, tipZ, 2, 7, tipDepth, colors.hair);

    // The centre stays open below the jaw while staggered fringe locks soften
    // the forehead edge without covering the eyes.
    front(0, 7, 4, 3, hairDark);
    front(3, 8, 2, 3, colors.hair);
    front(6, 8, 3, 3, hairLight);
    front(8, 7, 3, 3, hairMid);
  } else if (colors.hairStyle === 'braided-pony') {
    crown(2);
    temples(4, 5);
    front(1, 6, 3, 3, hairMid);
    front(4, 7, 3, 3, colors.hair);
    front(7, 6, 3, 3, hairLight);
    // Centered rear puff: readable from either side and from the back.
    for (const [x, y, z, tone] of [
      [2, 6, -4, 0], [4, 8, -5, 1], [6, 6, -4, 0],
      [3, 10, -4, 2], [5, 10, -4, 0], [4, 4, -5, 1],
    ] as const) {
      v.box(x, y, z, 3, 3, 3, tone === 0 ? colors.hair : tone === 1 ? hairMid : hairLight);
    }
  } else if (colors.hairStyle === 'butterfly-layers') {
    crown(2);
    temples(4, 5);
    front(1, 6, 5, 3, colors.hair);
    front(6, 7, 4, 3, hairLight);
    // The bun is centred behind the skull, never biased to the preview side.
    v.box(3, 10, -4, 5, 4, 5, colors.hair);
    v.box(4, 13, -3, 3, 3, 4, hairMid);
    v.box(5, 15, -2, 2, 1, 3, hairLight);
  } else if (colors.hairStyle === 'soft-wolf') {
    crown(0);
    v.box(-1, 0, 0, 3, 9, 5, hairDark);
    v.box(9, -1, 0, 3, 10, 5, hairMid);
    v.box(1, -2, 0, 2, 5, 2, hairMid);
    v.box(8, -3, 0, 2, 6, 2, colors.hair);
    front(1, 6, 5, 3, colors.hair);
    front(0, 4, 3, 3, hairLight);
    front(7, 5, 3, 3, hairDark);
    v.box(4, 12, 2, 3, 2, 4, hairMid);
  } else if (colors.hairStyle === 'modern-mullet') {
    crown(3);
    temples(5, 3);
    front(1, 6, 3, 3, hairDark);
    front(3, 7, 3, 3, colors.hair);
    front(6, 6, 3, 3, hairLight);
    front(8, 5, 2, 3, hairMid);
    v.box(1, 10, 1, 3, 3, 4, hairDark);
    v.box(4, 11, 1, 3, 3, 5, colors.hair);
    v.box(7, 10, 2, 3, 3, 4, hairLight);
    v.box(4, 13, 2, 3, 2, 3, hairMid);
  } else if (colors.hairStyle === 'beanie-crop') {
    crown(4);
    temples(5, 3);
    front(1, 6, 4, 2, colors.hair);
    front(6, 6, 4, 2, hairMid);
  } else {
    // Reference short crop: one low, closed skull shell with irregular lock
    // clusters around it. Outer cells appear for only a course or two, so the
    // contour widens and narrows instead of forming two helmet-like side walls.
    v.box(2, 0, 0, 7, 3, 2, hairDark);
    v.box(1, 2, 0, 9, 4, 2, colors.hair);
    v.box(0, 6, 0, 3, 2, 3, hairDark);
    v.box(2, 6, 0, 4, 4, 3, colors.hair);
    v.box(6, 6, 0, 4, 3, 3, hairMid);
    v.box(9, 5, 0, 2, 3, 3, hairLight);

    v.box(1, 7, 1, 3, 3, 6, hairDark);
    v.box(3, 8, 1, 4, 3, 6, colors.hair);
    v.box(6, 7, 1, 3, 4, 6, hairMid);
    v.box(8, 6, 2, 3, 3, 5, hairLight);

    // Three overlapping top locks share a broad base. Only the centre rises
    // for the last course, avoiding both a flat roof and a detached top peg.
    v.box(2, 10, 2, 3, 2, 4, hairDark);
    v.box(4, 10, 1, 4, 3, 6, colors.hair);
    v.box(7, 10, 2, 3, 2, 5, hairMid);
    v.box(5, 11, 6, 2, 2, 2, hairLight);

    // The five forehead locks have staggered roots, heights, widths and tones;
    // they overlap enough to close the hairline but leave both eyes open.
    front(1, 7, 2, 2, hairDark);
    front(3, 8, 2, 2, colors.hair);
    front(5, 7, 2, 3, hairMid);
    front(7, 8, 2, 2, colors.hair);
    front(9, 6, 2, 2, hairLight);

    // Tiny exterior notches make the side/back perimeter visibly hand-shaped.
    v.remove(0, 7, 1);
    v.remove(10, 6, 2);
  }

  const innerEar = mixedColor(colors.skin, '#a8514a', 0.22);
  const coveredEars = [
    'center-part',
    'layered-bob',
    'italian-bob',
    'long-waves',
    'soft-wolf',
  ].includes(colors.hairStyle);
  if (!coveredEars) {
    v.box(0, 3, 3, 1, 2, 2, colors.skin);
    v.box(10, 3, 3, 1, 2, 2, colors.skin);
    v.set(0, 4, 4, innerEar);
    v.set(10, 4, 4, innerEar);
  }

  const eye = colors.face;
  if (colors.eyeStyle === 'upturned') {
    v.box(2, 4, FACE_FRONT_Z, 2, 1, 1, eye);
    v.set(3, 5, FACE_FRONT_Z, eye);
    v.box(7, 4, FACE_FRONT_Z, 2, 1, 1, eye);
    v.set(7, 5, FACE_FRONT_Z, eye);
  } else if (colors.eyeStyle === 'soft-lidded') {
    v.box(2, 4, FACE_FRONT_Z, 2, 1, 1, eye);
    v.box(7, 4, FACE_FRONT_Z, 2, 1, 1, eye);
  } else {
    v.box(3, 4, FACE_FRONT_Z, 1, 2, 1, eye);
    v.box(7, 4, FACE_FRONT_Z, 1, 2, 1, eye);
  }

  // Recessed profile pixels stay hidden behind the frontal cheek cells, but
  // reveal one warm-cocoa eye when the model reaches an exact side view.
  v.set(1, 4, FACE_FRONT_Z - 1, eye);
  v.set(9, 4, FACE_FRONT_Z - 1, eye);

  // One projecting skin voxel gives the three-quarter and side views the
  // tiny profile break visible in the sheet without introducing realism.
  v.set(5, 3, FACE_FRONT_Z + 1, darker(colors.skin, 0.05));
  if (colors.faceStyle === 'soft') {
    v.set(5, 2, FACE_FRONT_Z + 1, darker(colors.skin, 0.24));
  } else if (colors.faceStyle === 'bright') {
    const blush = mixedColor(colors.skin, '#cf695d', 0.35);
    v.set(1, 3, FACE_FRONT_Z, blush);
    v.set(9, 3, FACE_FRONT_Z, blush);
    v.set(4, 2, FACE_FRONT_Z + 1, eye);
    v.set(5, 1, FACE_FRONT_Z + 1, eye);
    v.set(6, 2, FACE_FRONT_Z + 1, eye);
  }

  // Head accessories share this occupancy map with hair, so hats and
  // headbands replace covered cells instead of z-fighting with them.
  if (colors.accessory === 'metal-frames') {
    const metal = '#c69b55';
    for (const x of [2, 6]) {
      v.box(x, 3, FACE_FRONT_Z + 1, 3, 1, 1, metal);
      v.box(x, 6, FACE_FRONT_Z + 1, 3, 1, 1, metal);
      v.box(x, 4, FACE_FRONT_Z + 1, 1, 2, 1, metal);
      v.box(x + 2, 4, FACE_FRONT_Z + 1, 1, 2, 1, metal);
    }
    v.set(5, 4, FACE_FRONT_Z + 1, metal);
  } else if (colors.accessory === 'zigzag-headband') {
    const rose = '#dc7c84';
    v.box(-1, 8, 2, 1, 2, 6, rose);
    v.box(11, 8, 2, 1, 2, 6, lighter(rose, 0.14));
    v.box(1, 9, FACE_FRONT_Z, 9, 1, 1, rose);
    v.box(3, 10, FACE_FRONT_Z - 1, 5, 1, 2, lighter(rose, 0.1));
  } else if (colors.accessory === 'cream-beanie') {
    const wool = '#ddc9a5';
    v.remove(0, 7, -1, 11, 9, 10);
    v.box(0, 7, 0, 11, 2, 8, darker(wool, 0.12));
    v.box(1, 9, 1, 9, 3, 6, wool);
    v.box(2, 12, 2, 7, 2, 4, lighter(wool, 0.12));
    v.box(0, 7, 6, 11, 2, 2, '#efe1c4');
  }

  const geometry = v.build(V, 0.04, CUBE_SEAM);
  geometry.translate(-(AVATAR_HEAD_WIDTH_CELLS / 2) * V, 0, -4 * V);
  return geometry;
}

function buildBodyAccessory(colors: AvatarColors) {
  const body = new Vox();
  if (colors.accessory === 'beaded-necklace') {
    const beads = ['#dc6655', '#e3b84f', '#65988a', '#9d71a8'];
    [[2, 5], [3, 4], [4, 4], [5, 5]].forEach(([x, y], index) => {
      body.set(x, y, 5, beads[index % beads.length]);
    });
  } else if (colors.accessory === 'technical-pack') {
    body.box(1, 0, -2, 5, 5, 2, '#455967');
    body.box(2, 3, -3, 3, 2, 1, '#617684');
    body.box(2, 1, -3, 3, 2, 1, '#314451');
    body.set(3, 2, -3, '#d0a65d');
  } else if (colors.accessory === 'brooch-cluster') {
    body.set(1, 3, 5, '#d5a13f');
    body.set(2, 4, 5, '#9a71a7');
    body.set(2, 3, 5, '#d56456');
  }
  const geometry = body.build(V, 0.035, CUBE_SEAM);
  geometry.translate(-3.5 * V, 0, -2 * V);
  return geometry;
}

interface CharacterGeometryParts {
  leftLeg: THREE.BufferGeometry;
  rightLeg: THREE.BufferGeometry;
  torso: THREE.BufferGeometry;
  leftArm: THREE.BufferGeometry;
  rightArm: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  bodyAccessory: THREE.BufferGeometry;
}

const characterGeometryCache = new Map<string, CharacterGeometryParts>();

function geometryParts(colors: AvatarColors): CharacterGeometryParts {
  const key = JSON.stringify(colors);
  const cached = characterGeometryCache.get(key);
  if (cached) return cached;
  const parts = {
    leftLeg: buildLeg(colors, -1),
    rightLeg: buildLeg(colors, 1),
    torso: buildTorso(colors),
    leftArm: buildArm(colors, -1),
    rightArm: buildArm(colors, 1),
    head: buildHead(colors),
    bodyAccessory: buildBodyAccessory(colors),
  };
  characterGeometryCache.set(key, parts);
  return parts;
}

interface ReferenceAvatarFigureProps {
  colors: AvatarColors;
  pose?: CharacterPoseId;
  rigRefs?: CharacterRigRefs;
  fixedPalette?: boolean;
  /** @deprecated Use rigRefs.hips. */
  legsRef?: RefObject<THREE.Group | null>;
  /** @deprecated Use rigRefs.torso. */
  torsoRef?: RefObject<THREE.Group | null>;
  /** @deprecated Use rigRefs.head. */
  headRef?: RefObject<THREE.Group | null>;
}

export function ReferenceAvatarFigure({
  colors,
  pose = 'idle',
  rigRefs,
  fixedPalette = false,
  legsRef,
  torsoRef,
  headRef,
}: ReferenceAvatarFigureProps) {
  const parts = useMemo(() => geometryParts(colors), [colors]);
  const transforms = characterPose(pose);
  const material = fixedPalette ? referenceVoxelMaterial : voxelMaterial;
  // Canonical seven-cell tops meet the two-cell arms at the boundary. Only
  // the intentionally oversized compatibility puffer needs a wider pivot.
  const armOffset = (hasWideTorso(colors) ? 5.5 : 4.5) * V;

  return (
    <group
      ref={rigRefs?.bodyRoot}
      position={transforms.body.position}
      rotation={transforms.body.rotation}
    >
      <group ref={rigRefs?.hips ?? legsRef} position={[0, AVATAR_HIP_Y, 0]}>
        <group
          ref={rigRefs?.leftLeg}
          position={[-2 * V, 0, 0]}
          rotation={transforms.leftLeg.rotation}
        >
          <mesh geometry={parts.leftLeg} material={material} />
        </group>
        <group
          ref={rigRefs?.rightLeg}
          position={[2 * V, 0, 0]}
          rotation={transforms.rightLeg.rotation}
        >
          <mesh geometry={parts.rightLeg} material={material} />
        </group>
      </group>
      <group
        ref={rigRefs?.torso ?? torsoRef}
        position={[0, AVATAR_HIP_Y, 0]}
        rotation={transforms.torso.rotation}
      >
        <mesh geometry={parts.torso} material={material} />
        {colors.accessory !== 'none' && (
          <mesh geometry={parts.bodyAccessory} material={material} />
        )}
        <group
          ref={rigRefs?.leftArm}
          position={[-armOffset, AVATAR_TORSO_HEIGHT, 0]}
          rotation={transforms.leftArm.rotation}
        >
          <mesh geometry={parts.leftArm} material={material} />
        </group>
        <group
          ref={rigRefs?.rightArm}
          position={[armOffset, AVATAR_TORSO_HEIGHT, 0]}
          rotation={transforms.rightArm.rotation}
        >
          <mesh geometry={parts.rightArm} material={material} />
        </group>
        <group
          ref={rigRefs?.head ?? headRef}
          position={[0, AVATAR_TORSO_HEIGHT, 0]}
          rotation={transforms.head.rotation}
        >
          <mesh geometry={parts.head} material={material} />
        </group>
      </group>
    </group>
  );
}
