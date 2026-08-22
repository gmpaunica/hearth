import { useHomeStore } from '@/state/homeStore';
import { room } from '@/theme/hearth';
import { LockedBedroom, LockedGarden } from '../LockedRoom';
import { S } from '../shell';
import { VoxMesh } from '../VoxMesh';
import { Vox } from '../voxel';
import { Bedroom } from './Bedroom';
import { Garden } from './Garden';
import { LivingRoom, VoidBackdrop } from './LivingRoom';

function buildBedroomThreshold(v: Vox) {
  v.box(0, -1, 0, 6, 1, 2, room.doorWood);
  v.box(0, -1, 0, 6, 1, 1, room.woodDark);
}

/** Shared topology for the connected dollhouse. */
export function Room() {
  const rooms = useHomeStore((state) => state.resolved.rooms);
  const gardenTier = useHomeStore((state) => state.resolved.gardenTier);
  const hasBedroom = rooms.some((candidate) => candidate.moduleId === 'bedroom');
  const hasGarden = rooms.some((candidate) => candidate.moduleId === 'garden');

  return (
    <group>
      <VoidBackdrop />
      <LivingRoom />
      {hasBedroom && (
        <VoxMesh build={buildBedroomThreshold} scale={S} position={[2.75, 0.01, -4.5]} />
      )}
      {hasBedroom ? <Bedroom /> : <LockedBedroom />}
      {hasGarden ? <Garden tier={gardenTier} /> : <LockedGarden />}
    </group>
  );
}
