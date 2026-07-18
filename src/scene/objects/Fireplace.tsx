import { room } from '@/theme/hearth';
import { Fire } from '../Fire';

/** Stone fireplace with mantel, chimney breast, logs and the shader fire. */
export function Fireplace({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Hearth slab on the floor */}
      <mesh position={[0, 0.06, -3.15]}>
        <boxGeometry args={[2.3, 0.12, 0.85]} />
        <meshStandardMaterial color="#4c4038" roughness={0.95} />
      </mesh>
      {/* Main body */}
      <mesh position={[0, 0.75, -3.7]}>
        <boxGeometry args={[1.95, 1.5, 0.55]} />
        <meshStandardMaterial color={room.fireplaceStone} roughness={0.9} />
      </mesh>
      {/* Dark firebox opening (plane just proud of the body face) */}
      <mesh position={[0, 0.52, -3.42]}>
        <planeGeometry args={[1.15, 0.9]} />
        <meshBasicMaterial color={room.fireplaceInner} />
      </mesh>
      {/* Mantel shelf */}
      <mesh position={[0, 1.56, -3.65]}>
        <boxGeometry args={[2.25, 0.13, 0.65]} />
        <meshStandardMaterial color={room.mantel} roughness={0.7} />
      </mesh>
      {/* Chimney breast rising above the mantel */}
      <mesh position={[0, 2.5, -3.78]}>
        <boxGeometry args={[1.7, 1.9, 0.4]} />
        <meshStandardMaterial color={room.fireplaceStone} roughness={0.9} />
      </mesh>
      {/* Logs */}
      <mesh position={[-0.12, 0.2, -3.35]} rotation={[0, 0.5, Math.PI / 2]}>
        <cylinderGeometry args={[0.075, 0.075, 0.55, 8]} />
        <meshStandardMaterial color="#3d2a1a" roughness={1} />
      </mesh>
      <mesh position={[0.1, 0.24, -3.32]} rotation={[0, -0.6, Math.PI / 2]}>
        <cylinderGeometry args={[0.065, 0.065, 0.5, 8]} />
        <meshStandardMaterial color="#4a3220" roughness={1} />
      </mesh>
      {/* Candles on the mantel */}
      <mesh position={[-0.75, 1.71, -3.6]}>
        <cylinderGeometry args={[0.045, 0.05, 0.18, 10]} />
        <meshStandardMaterial color="#e8d9c4" roughness={0.6} />
      </mesh>
      <mesh position={[-0.75, 1.83, -3.6]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#ffca6a" />
      </mesh>
      <mesh position={[0.7, 1.68, -3.62]}>
        <cylinderGeometry args={[0.05, 0.055, 0.12, 10]} />
        <meshStandardMaterial color="#d9c6ad" roughness={0.6} />
      </mesh>
      <mesh position={[0.7, 1.77, -3.62]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshBasicMaterial color="#ffca6a" />
      </mesh>
      {/* The fire itself */}
      <Fire position={[0, 0.24, -3.42]} />
    </group>
  );
}
