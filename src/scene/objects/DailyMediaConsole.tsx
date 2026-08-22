import { DailyCamera, DailyRecordPlayer } from './MediaConsole';

export function DailyMediaConsole() {
  return (
    <group>
      <DailyRecordPlayer position={[-0.42, 0, 0.08]} />
      <DailyCamera position={[0.38, 0, 0.2]} rotation={[0, -Math.PI / 8, 0]} />
    </group>
  );
}

