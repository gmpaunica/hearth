import * as THREE from 'three';

// Tiny voxel mesher for the Tuber-Simulator-style art direction.
// Shading is baked into vertex colors per face direction (no scene lights),
// so the look is 100% deterministic. A shared material's `color` acts as a
// global tint that the Atmosphere system animates.

/** Face brightness by direction — fake light from top / front-right. */
const FACES: { dir: [number, number, number]; corners: [number, number, number][]; shade: number }[] = [
  { dir: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], shade: 0.86 },
  { dir: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.58 },
  { dir: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], shade: 1.0 },
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.42 },
  { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.78 },
  { dir: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], shade: 0.62 },
];

/** Deterministic per-voxel brightness jitter (subtle dithered texture). */
function hashJitter(x: number, y: number, z: number, amount: number) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  const r = ((h ^ (h >> 16)) >>> 0) / 4294967295;
  return 1 - amount / 2 + r * amount;
}

export class Vox {
  private cells = new Map<string, THREE.Color>();

  set(x: number, y: number, z: number, color: string | THREE.Color) {
    this.cells.set(`${x},${y},${z}`, color instanceof THREE.Color ? color : new THREE.Color(color));
    return this;
  }

  /** Fill a box of voxels from (x,y,z) spanning w,h,d cells. */
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: string | THREE.Color) {
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    for (let i = 0; i < w; i++)
      for (let j = 0; j < h; j++)
        for (let k = 0; k < d; k++) this.set(x + i, y + j, z + k, c);
    return this;
  }

  remove(x: number, y: number, z: number, w = 1, h = 1, d = 1) {
    for (let i = 0; i < w; i++)
      for (let j = 0; j < h; j++)
        for (let k = 0; k < d; k++) this.cells.delete(`${x + i},${y + j},${z + k}`);
    return this;
  }

  /** Build a merged geometry; hidden interior faces are skipped. */
  build(scale: number, jitter = 0.06): THREE.BufferGeometry {
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    let vi = 0;

    for (const [key, color] of this.cells) {
      const [x, y, z] = key.split(',').map(Number);
      const j = hashJitter(x, y, z, jitter);
      for (const face of FACES) {
        const nKey = `${x + face.dir[0]},${y + face.dir[1]},${z + face.dir[2]}`;
        if (this.cells.has(nKey)) continue;
        const s = face.shade * j;
        for (const c of face.corners) {
          positions.push((x + c[0]) * scale, (y + c[1]) * scale, (z + c[2]) * scale);
          colors.push(
            Math.min(1, color.r * s),
            Math.min(1, color.g * s),
            Math.min(1, color.b * s)
          );
        }
        indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
        vi += 4;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeBoundingSphere();
    return geo;
  }
}

/**
 * Single shared unlit material for all voxel meshes. Its `color` is a live
 * tint that Atmosphere.tsx animates (warm/cool/rain moods + the golden
 * reconciliation pulse).
 */
export const voxelTint = new THREE.Color('#fff3e4');
export const voxelMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
voxelMaterial.color = voxelTint;
