import { room } from '@/theme/hearth';

function Chair({ position, rotationY }: { position: [number, number, number]; rotationY: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.44, 0]}>
        <boxGeometry args={[0.44, 0.07, 0.44]} />
        <meshStandardMaterial color={room.tableWood} roughness={0.8} />
      </mesh>
      {/* Backrest: two posts + rails (local -z) */}
      {[-0.18, 0.18].map((x) => (
        <mesh key={x} position={[x, 0.68, -0.2]}>
          <cylinderGeometry args={[0.022, 0.025, 0.55, 6]} />
          <meshStandardMaterial color={room.tableWood} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.93, -0.2]}>
        <boxGeometry args={[0.44, 0.09, 0.05]} />
        <meshStandardMaterial color={room.tableWood} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.7, -0.2]}>
        <boxGeometry args={[0.4, 0.06, 0.04]} />
        <meshStandardMaterial color={room.tableWood} roughness={0.8} />
      </mesh>
      {[-0.17, 0.17].map((x) =>
        [-0.17, 0.17].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.2, z]}>
            <cylinderGeometry args={[0.025, 0.02, 0.4, 6]} />
            <meshStandardMaterial color={room.woodDark} roughness={0.8} />
          </mesh>
        ))
      )}
    </group>
  );
}

/** Small round table with two chairs and a flower vase. */
export function TableSet({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Table top */}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.58, 0.58, 0.06, 24]} />
        <meshStandardMaterial color={room.tableWood} roughness={0.65} />
      </mesh>
      {/* Pedestal + base */}
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.7, 10]} />
        <meshStandardMaterial color={room.woodDark} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.06, 16]} />
        <meshStandardMaterial color={room.woodDark} roughness={0.8} />
      </mesh>
      {/* Vase with a single flower */}
      <mesh position={[0, 0.83, 0]}>
        <cylinderGeometry args={[0.055, 0.075, 0.16, 10]} />
        <meshStandardMaterial color="#a86f4f" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.18, 5]} />
        <meshStandardMaterial color="#5f7d4f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.09, 0]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#d96a8a" roughness={0.6} emissive="#d96a8a" emissiveIntensity={0.15} />
      </mesh>
      {/* Chairs: far side faces the camera (-z), near side faces away (+z) */}
      <Chair position={[0, 0, 0.83]} rotationY={Math.PI} />
      <Chair position={[0, 0, -0.83]} rotationY={0} />
    </group>
  );
}
