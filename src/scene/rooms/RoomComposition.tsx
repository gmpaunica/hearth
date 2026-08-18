import { useHomeProgress } from '@/state/homeProgress';
import { room } from '@/theme/hearth';
import { LockedBedroom, LockedGarden } from '../LockedRoom';
import { S } from '../shell';
import { VoxMesh } from '../VoxMesh';
import { Vox } from '../voxel';
import { Bedroom } from './Bedroom';
import { Garden } from './Garden';
import { LivingRoom, VoidBackdrop } from './LivingRoom';

function buildGardenArch(v: Vox) {
  v.box(0, 0, 0, 2, 11, 2, '#754830');
  v.box(0, 0, 5, 2, 11, 2, '#754830');
  v.box(-4, 10, 0, 7, 2, 7, '#865238');
  for (let x = -4; x <= 2; x += 2) v.box(x, 12, -1, 1, 1, 9, '#a56547');
  v.box(-1, 2, -1, 2, 8, 2, '#416e3a');
  v.box(-1, 1, 6, 2, 9, 2, '#4e7d43');
  v.box(-3, 9, 0, 5, 3, 7, '#527f43');
  for (const [x, y, z, c] of [
    [-2, 8, 0, '#f3a7bc'], [-1, 5, 6, '#efc85e'], [-3, 10, 3, '#f7e9dc'],
    [1, 8, 6, '#e78b9f'], [-4, 11, 1, '#ffd58a'], [-3, 9, 6, '#f5c2cf'],
  ] as const) v.set(x, y, z, c);
}

function GardenPassage() {
  return <VoxMesh build={buildGardenArch} scale={S} position={[-4.5, 0, 2.25]} />;
}

function buildBedroomThreshold(v: Vox) {
  v.box(0, -1, 0, 6, 1, 2, room.doorWood);
  v.box(0, -1, 0, 6, 1, 1, room.woodDark);
}

/** Integrator-owned topology for the connected dollhouse. */
export function Room() {
  const { components } = useHomeProgress();
  const hasBedroom = components.has('bed');
  const hasGarden = components.has('garden');

  return (
    <group>
      <VoidBackdrop />
      <LivingRoom />
      <GardenPassage />
      {hasBedroom && (
        <VoxMesh build={buildBedroomThreshold} scale={S} position={[2.75, 0.01, -4.5]} />
      )}
      {hasBedroom ? <Bedroom /> : <LockedBedroom />}
      {hasGarden ? <Garden /> : <LockedGarden />}
    </group>
  );
}
