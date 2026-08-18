import * as THREE from 'three';

// Tiny voxel mesher for the Tuber-Simulator-style art direction.
// Shading is baked into vertex colors per face direction (no scene lights),
// so the look is 100% deterministic. A shared material's `color` acts as a
// global tint that the Atmosphere system animates.

/** Face brightness by direction — fake light from top / front-right. */
type VoxelVector = [number, number, number];

interface VoxelFace {
  dir: VoxelVector;
  corners: VoxelVector[];
  shade: number;
  /** Warm key light on the top/front, gently cooler fill in recesses. */
  tone: VoxelVector;
}

/**
 * Editorial daylight baked per face. Keeping this in the merged geometry gives
 * us clear cube planes without real-time lights or shadow maps.
 */
const FACES: VoxelFace[] = [
  { dir: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], shade: 0.88, tone: [1.04, 0.97, 0.9] },
  { dir: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.61, tone: [0.94, 0.98, 1.04] },
  { dir: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], shade: 1.02, tone: [1.06, 1.01, 0.92] },
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.46, tone: [0.9, 0.95, 1.02] },
  { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.8, tone: [1.03, 0.97, 0.91] },
  { dir: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], shade: 0.65, tone: [0.94, 0.98, 1.04] },
];

function writeLitColor(
  output: number[],
  color: THREE.Color,
  shade: number,
  tone: VoxelVector,
  occlusion = 1,
) {
  output.push(
    Math.min(1, color.r * shade * tone[0] * occlusion),
    Math.min(1, color.g * shade * tone[1] * occlusion),
    Math.min(1, color.b * shade * tone[2] * occlusion),
  );
}

const chamferedCubeCache = new Map<number, THREE.BufferGeometry>();

function chamferedCube(inset: number) {
  const cached = chamferedCubeCache.get(inset);
  if (cached) return cached;
  const gap = inset * 0.34;
  const half = 0.5 - gap;
  const edge = half - inset * 1.5;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const vertices = new Map<string, number>();

  const vertex = ([x, y, z]: [number, number, number]) => {
    const key = `${x},${y},${z}`;
    const found = vertices.get(key);
    if (found != null) return found;
    const index = positions.length / 3;
    const normal = new THREE.Vector3(x, y, z).normalize();
    positions.push(x, y, z);
    normals.push(normal.x, normal.y, normal.z);
    vertices.set(key, index);
    return index;
  };
  const face = (
    points: [number, number, number][],
    desired: [number, number, number],
  ) => {
    const ab = new THREE.Vector3(...points[1]).sub(new THREE.Vector3(...points[0]));
    const ac = new THREE.Vector3(...points[2]).sub(new THREE.Vector3(...points[0]));
    if (ab.cross(ac).dot(new THREE.Vector3(...desired)) < 0) points.reverse();
    const faceIndices = points.map(vertex);
    indices.push(faceIndices[0], faceIndices[1], faceIndices[2]);
    if (faceIndices.length === 4) {
      indices.push(faceIndices[0], faceIndices[2], faceIndices[3]);
    }
  };

  face([[half, -edge, -edge], [half, edge, -edge], [half, edge, edge], [half, -edge, edge]], [1, 0, 0]);
  face([[-half, -edge, -edge], [-half, edge, -edge], [-half, edge, edge], [-half, -edge, edge]], [-1, 0, 0]);
  face([[-edge, half, -edge], [edge, half, -edge], [edge, half, edge], [-edge, half, edge]], [0, 1, 0]);
  face([[-edge, -half, -edge], [edge, -half, -edge], [edge, -half, edge], [-edge, -half, edge]], [0, -1, 0]);
  face([[-edge, -edge, half], [edge, -edge, half], [edge, edge, half], [-edge, edge, half]], [0, 0, 1]);
  face([[-edge, -edge, -half], [edge, -edge, -half], [edge, edge, -half], [-edge, edge, -half]], [0, 0, -1]);

  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      face([
        [-edge, sy * half, sz * edge], [edge, sy * half, sz * edge],
        [edge, sy * edge, sz * half], [-edge, sy * edge, sz * half],
      ], [0, sy, sz]);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      face([
        [sx * half, -edge, sz * edge], [sx * half, edge, sz * edge],
        [sx * edge, edge, sz * half], [sx * edge, -edge, sz * half],
      ], [sx, 0, sz]);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      face([
        [sx * half, sy * edge, -edge], [sx * half, sy * edge, edge],
        [sx * edge, sy * half, edge], [sx * edge, sy * half, -edge],
      ], [sx, sy, 0]);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        face([
          [sx * half, sy * edge, sz * edge],
          [sx * edge, sy * half, sz * edge],
          [sx * edge, sy * edge, sz * half],
        ], [sx, sy, sz]);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  chamferedCubeCache.set(inset, geometry);
  return geometry;
}

function directionalLight(nx: number, ny: number, nz: number): VoxelVector {
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  const az = Math.abs(nz);
  const weight = ax + ay + az || 1;
  const xFace = nx >= 0 ? FACES[0] : FACES[1];
  const yFace = ny >= 0 ? FACES[2] : FACES[3];
  const zFace = nz >= 0 ? FACES[4] : FACES[5];
  return [0, 1, 2].map((channel) => (
    ax * xFace.shade * xFace.tone[channel]
    + ay * yFace.shade * yFace.tone[channel]
    + az * zFace.shade * zFace.tone[channel]
  ) / weight) as VoxelVector;
}

/** Deterministic per-voxel brightness jitter (subtle dithered texture). */
function hashJitter(x: number, y: number, z: number, amount: number) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  const r = ((h ^ (h >> 16)) >>> 0) / 4294967295;
  return 1 - amount / 2 + r * amount;
}

export class Vox {
  private cells = new Map<string, THREE.Color>();

  /** Small baked contact shadow where neighbouring voxels meet a face corner. */
  private cornerOcclusion(x: number, y: number, z: number, face: VoxelFace, corner: VoxelVector) {
    const tangentAxes = ([0, 1, 2] as const).filter((axis) => face.dir[axis] === 0);
    const axisA = tangentAxes[0];
    const axisB = tangentAxes[1];
    const signA = corner[axisA] === 0 ? -1 : 1;
    const signB = corner[axisB] === 0 ? -1 : 1;
    const outward = [...face.dir] as VoxelVector;
    const sideA = [...outward] as VoxelVector;
    const sideB = [...outward] as VoxelVector;
    const diagonal = [...outward] as VoxelVector;
    sideA[axisA] += signA;
    sideB[axisB] += signB;
    diagonal[axisA] += signA;
    diagonal[axisB] += signB;
    const filled = (offset: VoxelVector) => this.cells.has(
      `${x + offset[0]},${y + offset[1]},${z + offset[2]}`,
    );
    const a = filled(sideA);
    const b = filled(sideB);
    if (a && b) return 0.72;
    return 1 - (a ? 0.1 : 0) - (b ? 0.1 : 0) - (filled(diagonal) ? 0.06 : 0);
  }

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

  /**
   * Build a merged geometry. `inset` leaves a fine seam around every cell,
   * which is used by the character renderer to preserve the concept sheet's
   * visibly assembled cube construction. The room keeps the seamless default.
   */
  build(scale: number, jitter = 0.06, inset = 0): THREE.BufferGeometry {
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    let vi = 0;

    if (inset > 0) {
      const template = chamferedCube(inset);
      const templatePositions = template.getAttribute('position');
      const templateNormals = template.getAttribute('normal');
      const templateIndices = template.getIndex();

      for (const [key, color] of this.cells) {
        const [x, y, z] = key.split(',').map(Number);
        const voxelJitter = hashJitter(x, y, z, jitter);
        for (let i = 0; i < templatePositions.count; i++) {
          const nx = templateNormals.getX(i);
          const ny = templateNormals.getY(i);
          const nz = templateNormals.getZ(i);
          const light = directionalLight(nx, ny, nz);
          positions.push(
            (x + 0.5 + templatePositions.getX(i)) * scale,
            (y + 0.5 + templatePositions.getY(i)) * scale,
            (z + 0.5 + templatePositions.getZ(i)) * scale,
          );
          writeLitColor(colors, color, voxelJitter, light);
        }
        if (templateIndices) {
          for (let i = 0; i < templateIndices.count; i++) {
            indices.push(vi + templateIndices.getX(i));
          }
        } else {
          for (let i = 0; i < templatePositions.count; i++) indices.push(vi + i);
        }
        vi += templatePositions.count;
      }

      const rounded = new THREE.BufferGeometry();
      rounded.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      rounded.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      rounded.setIndex(indices);
      rounded.computeBoundingSphere();
      return rounded;
    }

    for (const [key, color] of this.cells) {
      const [x, y, z] = key.split(',').map(Number);
      const j = hashJitter(x, y, z, jitter);
      for (const face of FACES) {
        const nKey = `${x + face.dir[0]},${y + face.dir[1]},${z + face.dir[2]}`;
        if (this.cells.has(nKey)) continue;
        const s = face.shade * j;
        const cornerLight = face.corners.map((corner) =>
          this.cornerOcclusion(x, y, z, face, corner),
        );
        for (let cornerIndex = 0; cornerIndex < face.corners.length; cornerIndex++) {
          const c = face.corners[cornerIndex];
          const px = c[0] === 0 ? inset : 1 - inset;
          const py = c[1] === 0 ? inset : 1 - inset;
          const pz = c[2] === 0 ? inset : 1 - inset;
          positions.push((x + px) * scale, (y + py) * scale, (z + pz) * scale);
          writeLitColor(
            colors,
            color,
            s,
            face.tone,
            cornerLight[cornerIndex],
          );
        }
        // Choose the less visible interpolation diagonal when AO differs.
        if (cornerLight[0] + cornerLight[2] > cornerLight[1] + cornerLight[3]) {
          indices.push(vi, vi + 1, vi + 3, vi + 1, vi + 2, vi + 3);
        } else {
          indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
        }
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
