import { room } from '@/theme/hearth';

/** Small wooden bench beside the garden door (the "I need some space" seat). */
export function Bench(props: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group {...props}>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.45, 0.07, 1.35]} />
        <meshStandardMaterial color={room.doorWood} roughness={0.8} />
      </mesh>
      {/* Thin seat cushion */}
      <mesh position={[0, 0.46, 0]}>
        <boxGeometry args={[0.4, 0.05, 1.25]} />
        <meshStandardMaterial color="#9db08a" roughness={0.95} />
      </mesh>
      {[-0.55, 0.55].map((z) => (
        <mesh key={z} position={[0, 0.19, z]}>
          <boxGeometry args={[0.4, 0.38, 0.07]} />
          <meshStandardMaterial color={room.woodDark} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}
