import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';

import type { MomentActionEventV2 } from '@/lib/db';
import { useSceneStore } from '@/state/sceneStore';

function Block({ position, scale, color, rotation }: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} scale={scale} rotation={rotation}>
      <boxGeometry />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function Lantern({ position, rose = false }: { position: [number, number, number]; rose?: boolean }) {
  return (
    <group position={position}>
      <Block position={[0, 0.12, 0]} scale={[0.18, 0.22, 0.16]} color={rose ? '#f2a4a0' : '#ffc66d'} />
      <Block position={[0, 0.3, 0]} scale={[0.22, 0.04, 0.2]} color="#6e4526" />
      <Block position={[0, -0.03, 0]} scale={[0.22, 0.04, 0.2]} color="#6e4526" />
    </group>
  );
}

function Rose() {
  return <group position={[-5.7, 0.16, 2.8]}><Block position={[0, 0, 0]} scale={[0.035, 0.22, 0.035]} color="#63804f" /><Block position={[0, 0.23, 0]} scale={[0.12, 0.1, 0.12]} color="#df696f" /></group>;
}

function TeaTray() {
  return <group position={[1.58, 0.43, -2.55]}><Block position={[0, 0, 0]} scale={[0.5, 0.05, 0.28]} color="#8c542d" /><Block position={[-0.16, 0.14, 0]} scale={[0.13, 0.16, 0.13]} color="#f4dfbd" /><Block position={[0.16, 0.14, 0]} scale={[0.13, 0.16, 0.13]} color="#efb96b" /></group>;
}

function HeartCushion() {
  return <group position={[0.82, 0.91, -3.08]} rotation={[0, 0, 0.08]}><Block position={[-0.13, 0.06, 0]} scale={[0.22, 0.2, 0.15]} color="#e8837f" /><Block position={[0.13, 0.06, 0]} scale={[0.22, 0.2, 0.15]} color="#e8837f" /><Block position={[0, -0.12, 0]} scale={[0.24, 0.23, 0.15]} color="#e8837f" /></group>;
}

function Mug({ second = false }: { second?: boolean }) {
  return <group position={[second ? 0.48 : -0.48, 1, 0.42]}><Block position={[0, 0, 0]} scale={[0.18, 0.22, 0.18]} color={second ? '#d6c3e0' : '#f3dfbd'} /><Block position={[0.18, 0.01, 0]} scale={[0.08, 0.1, 0.08]} color={second ? '#78825a' : '#c28a45'} /></group>;
}

function Blanket() {
  return <group position={[-2.45, 0.5, 3.05]}><Block position={[0, 0, 0]} scale={[0.54, 0.12, 0.35]} color="#d7c79e" /><Block position={[0, 0.12, 0]} scale={[0.48, 0.09, 0.31]} color="#eadfbd" /></group>;
}

function TinyDrawing() {
  return <group position={[-3.12, 0.58, 2.72]} rotation={[0, Math.PI / 4, 0]}><Block position={[0, 0, 0]} scale={[0.38, 0.32, 0.04]} color="#f5e8cc" /><Block position={[-0.08, 0.03, 0.05]} scale={[0.07, 0.1, 0.025]} color="#d9786e" /><Block position={[0.09, -0.04, 0.05]} scale={[0.08, 0.07, 0.025]} color="#6f9365" /></group>;
}

const REST_COLORS = ['#D96F64', '#E7A35C', '#EFC4D1', '#7FA36A', '#79AFC1', '#4A3028'];

function RestDoodle({ event }: { event: MomentActionEventV2 }) {
  const payload = event.payload;
  if (!payload || !('cells' in payload) || payload.cells.length !== 144) return <TinyDrawing />;
  return (
    <group position={[-3.12, 0.58, 2.72]} rotation={[0, Math.PI / 4, 0]}>
      <Block position={[0, 0, 0]} scale={[0.43, 0.43, 0.035]} color="#FFF4DB" />
      {[...payload.cells].map((cell, index) => cell === '.' ? null : (
        <Block
          key={index}
          position={[(index % 12 - 5.5) * 0.065, (5.5 - Math.floor(index / 12)) * 0.065, 0.045]}
          scale={[0.031, 0.031, 0.018]}
          color={REST_COLORS[Number(cell)] ?? REST_COLORS[0]}
        />
      ))}
    </group>
  );
}

function SillyVisitor({ event }: { event: MomentActionEventV2 }) {
  const ref = useRef<THREE.Group>(null);
  const reduceMotion = useSceneStore((state) => state.reduceMotion);
  const visitor = event.payload && 'visitor' in event.payload ? event.payload.visitor : 'duck';
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = reduceMotion ? 0.34 : 0.34 + Math.abs(Math.sin(state.clock.elapsedTime * (visitor === 'toast' ? 5 : 3))) * 0.12;
    ref.current.rotation.z = reduceMotion ? 0 : Math.sin(state.clock.elapsedTime * 4) * 0.08;
  });
  const color = visitor === 'duck' ? '#F1C75B' : visitor === 'frog' ? '#6F9B63' : '#D49A62';
  return (
    <group ref={ref} position={[-1.45, 0.34, 3.35]}>
      <Block position={[0, 0.18, 0]} scale={[0.18, 0.2, 0.12]} color={color} />
      <Block position={[0, 0.43, 0]} scale={[0.14, 0.14, 0.12]} color={color} />
      <Block position={[-0.06, 0.47, 0.13]} scale={[0.025, 0.025, 0.02]} color="#2D2623" />
      <Block position={[0.06, 0.47, 0.13]} scale={[0.025, 0.025, 0.02]} color="#2D2623" />
      {visitor === 'duck' && <Block position={[0, 0.4, 0.2]} scale={[0.1, 0.04, 0.08]} color="#E67D39" />}
      {visitor === 'toast' && <><Block position={[-0.1, -0.03, 0]} scale={[0.035, 0.1, 0.035]} color="#6A4030" /><Block position={[0.1, -0.03, 0]} scale={[0.035, 0.1, 0.035]} color="#6A4030" /></>}
    </group>
  );
}

function RestHeartToken() {
  return (
    <group position={[-2.05, 0.38, 3.02]}>
      <Block position={[-0.07, 0.05, 0]} scale={[0.09, 0.09, 0.05]} color="#E97982" />
      <Block position={[0.07, 0.05, 0]} scale={[0.09, 0.09, 0.05]} color="#E97982" />
      <Block position={[0, -0.04, 0]} scale={[0.1, 0.1, 0.05]} color="#E97982" rotation={[0, 0, Math.PI / 4]} />
    </group>
  );
}

function RestHugWave() {
  const live = useSceneStore((state) => state.liveMomentAction);
  const reduceMotion = useSceneStore((state) => state.reduceMotion);
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current || live?.actionId !== 'rest_hug') return;
    const age = Math.min(1, (Date.now() - live.startedAt) / 900);
    ref.current.visible = age < 1;
    ref.current.position.x = reduceMotion ? -2.05 : -1.2 - age * 0.85;
  });
  return (
    <group ref={ref} position={[-1.2, 0.9, 3.05]} visible={live?.actionId === 'rest_hug'}>
      <Block position={[-0.09, 0.04, 0]} scale={[0.1, 0.1, 0.04]} color="#F4A1A6" />
      <Block position={[0.09, 0.04, 0]} scale={[0.1, 0.1, 0.04]} color="#F4A1A6" />
      <Block position={[0, -0.06, 0]} scale={[0.11, 0.1, 0.04]} color="#F4A1A6" rotation={[0, 0, Math.PI / 4]} />
    </group>
  );
}

const newestPropAtDestination = (events: MomentActionEventV2[], destination: string) =>
  events
    .filter((event) => event.destination === destination && event.prop_type)
    .sort((left, right) => Date.parse(right.occurred_at) - Date.parse(left.occurred_at))[0] ?? null;

const newestProp = (events: MomentActionEventV2[], propType: string) =>
  events
    .filter((event) => event.prop_type === propType)
    .sort((left, right) => Date.parse(right.occurred_at) - Date.parse(left.occurred_at))[0] ?? null;

export function MomentSceneDetails() {
  const active = useSceneStore((state) => state.momentAtmosphere);
  const activeEvents = useSceneStore((state) => state.momentActionEvents);
  const todayEvents = useSceneStore((state) => state.todayMomentActionEvents);
  const gardenGift = newestPropAtDestination(todayEvents, 'garden');
  const sofaGift = newestPropAtDestination(todayEvents, 'sofa');
  const restBlanket = newestProp(todayEvents, 'folded_blanket');
  const restDoodle = newestProp(todayEvents, 'tiny_drawing');
  const restVisitor = newestProp(todayEvents, 'silly_visitor');
  const restHug = newestProp(todayEvents, 'hug_token');
  const romanticGift = newestPropAtDestination(todayEvents, 'romantic');
  const tableCue = newestPropAtDestination(activeEvents, 'table');
  const restCue = newestPropAtDestination(activeEvents, 'rest');

  return (
    <>
      {gardenGift?.prop_type === 'rose' && <Rose />}
      {sofaGift?.prop_type === 'tea_tray' && <TeaTray />}
      {sofaGift?.prop_type === 'heart_cushion' && <HeartCushion />}
      {restBlanket && <Blanket />}
      {restDoodle && <RestDoodle event={restDoodle} />}
      {restVisitor && <SillyVisitor event={restVisitor} />}
      {restHug && <RestHeartToken />}
      <RestHugWave />
      {romanticGift?.prop_type === 'paired_lanterns' && (
        <><Lantern position={[3.65, 0.95, -7.55]} /><Lantern position={[5.35, 0.95, -7.55]} rose /></>
      )}
      {active?.destination === 'table' && <Mug />}
      {tableCue?.prop_type === 'second_mug' && <Mug second />}
      {active?.destination === 'rest' && (
        <Block position={[-2.45, 0.23, 3.05]} scale={[0.48, 0.2, 0.34]} color={restCue?.prop_type === 'soft_light' ? '#bcae89' : '#9b7656'} />
      )}
      {active?.destination === 'romantic' && !romanticGift && (
        <Lantern position={[3.65, 0.95, -7.55]} />
      )}
    </>
  );
}
