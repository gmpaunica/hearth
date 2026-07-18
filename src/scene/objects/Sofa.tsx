import { room } from '@/theme/hearth';

/** Two-seat sofa. Built facing local +z; rotated into place by the parent. */
export function Sofa(props: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group {...props}>
      {/* Base */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[2.3, 0.34, 0.95]} />
        <meshStandardMaterial color={room.sofa} roughness={0.9} />
      </mesh>
      {/* Seat cushions */}
      <mesh position={[-0.55, 0.5, 0.06]}>
        <boxGeometry args={[1.04, 0.16, 0.8]} />
        <meshStandardMaterial color={room.sofaCushion} roughness={0.95} />
      </mesh>
      <mesh position={[0.55, 0.5, 0.06]}>
        <boxGeometry args={[1.04, 0.16, 0.8]} />
        <meshStandardMaterial color={room.sofaCushion} roughness={0.95} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.72, -0.38]}>
        <boxGeometry args={[2.3, 0.85, 0.22]} />
        <meshStandardMaterial color={room.sofa} roughness={0.9} />
      </mesh>
      {/* Back cushions, slightly tilted */}
      <mesh position={[-0.55, 0.82, -0.26]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[1.0, 0.52, 0.16]} />
        <meshStandardMaterial color={room.sofaCushion} roughness={0.95} />
      </mesh>
      <mesh position={[0.55, 0.82, -0.26]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[1.0, 0.52, 0.16]} />
        <meshStandardMaterial color={room.sofaCushion} roughness={0.95} />
      </mesh>
      {/* Armrests */}
      <mesh position={[-1.26, 0.52, 0]}>
        <boxGeometry args={[0.24, 0.66, 0.95]} />
        <meshStandardMaterial color={room.sofa} roughness={0.9} />
      </mesh>
      <mesh position={[1.26, 0.52, 0]}>
        <boxGeometry args={[0.24, 0.66, 0.95]} />
        <meshStandardMaterial color={room.sofa} roughness={0.9} />
      </mesh>
      {/* Throw pillow */}
      <mesh position={[-0.95, 0.68, 0.05]} rotation={[0, 0, 0.6]}>
        <boxGeometry args={[0.34, 0.34, 0.14]} />
        <meshStandardMaterial color="#e5b25f" roughness={0.95} />
      </mesh>
      {/* Legs */}
      {[-1.05, 1.05].map((x) =>
        [-0.38, 0.38].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.06, z]}>
            <cylinderGeometry args={[0.04, 0.03, 0.12, 8]} />
            <meshStandardMaterial color={room.woodDark} roughness={0.7} />
          </mesh>
        ))
      )}
    </group>
  );
}
