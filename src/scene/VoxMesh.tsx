import { useMemo } from 'react';

import { Vox, voxelMaterial } from './voxel';

interface VoxMeshProps {
  /** Fills the voxel grid; runs once on mount and whenever cacheKey changes. */
  build: (v: Vox) => void;
  /** Stable content key for restyleable voxel models. */
  cacheKey?: string;
  /** World size of one voxel. */
  scale?: number;
  jitter?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Non-uniform squash (e.g. thin rugs). */
  meshScale?: [number, number, number];
}

/** A static voxel model rendered with the shared tinted material. */
export function VoxMesh({
  build,
  cacheKey,
  scale = 0.25,
  jitter,
  position,
  rotation,
  meshScale,
}: VoxMeshProps) {
  const geometry = useMemo(() => {
    const v = new Vox();
    build(v);
    return v.build(scale, jitter);
    // The builder is intentionally omitted: most scene components pass an
    // inline closure, while cacheKey explicitly controls content rebuilds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return (
    <mesh
      geometry={geometry}
      material={voxelMaterial}
      position={position}
      rotation={rotation}
      scale={meshScale}
    />
  );
}
