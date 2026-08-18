import { useMemo } from 'react';

import type { FireplacePathwayId } from '@/lib/db';
import { useMomentV2Store } from '@/state/momentV2Store';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';

const GOLD = '#e4ad58';
const GOLD_SOFT = '#f4ce80';
const PAPER = '#f4dfbf';
const CLAY = '#bd6348';
const WOOD = '#6e4526';
const DIM = '#665143';
const SAGE = '#78825a';

function Block({
  position,
  scale,
  color,
  rotation,
}: {
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

function StayClose({ complete }: { complete: boolean }) {
  const glow = complete ? GOLD : DIM;
  return (
    <group>
      <Block position={[-0.16, 0.08, 0]} scale={[0.28, 0.12, 0.24]} color={complete ? '#d98b73' : DIM} rotation={[0, -0.12, 0]} />
      <Block position={[0.16, 0.08, 0]} scale={[0.28, 0.12, 0.24]} color={complete ? '#879164' : DIM} rotation={[0, 0.12, 0]} />
      <Block position={[-0.09, 0.2, -0.02]} scale={[0.07, 0.07, 0.07]} color={glow} />
      <Block position={[0.09, 0.2, -0.02]} scale={[0.07, 0.07, 0.07]} color={glow} />
    </group>
  );
}

function TalkThrough({ complete, clock }: { complete: boolean; clock: boolean }) {
  const color = complete ? PAPER : DIM;
  return (
    <group>
      <Block position={[-0.13, 0.11, 0]} scale={[0.16, 0.2, 0.15]} color={color} />
      <Block position={[0.13, 0.11, 0]} scale={[0.16, 0.2, 0.15]} color={color} />
      <Block position={[-0.24, 0.12, 0]} scale={[0.06, 0.1, 0.06]} color={color} />
      <Block position={[0.24, 0.12, 0]} scale={[0.06, 0.1, 0.06]} color={color} />
      {clock && (
        <>
          <Block position={[0, 0.35, 0]} scale={[0.22, 0.22, 0.08]} color={complete ? GOLD_SOFT : DIM} />
          <Block position={[0, 0.35, 0.05]} scale={[0.025, 0.13, 0.025]} color={WOOD} rotation={[0, 0, -0.45]} />
        </>
      )}
    </group>
  );
}

function HearFirst({ complete }: { complete: boolean }) {
  return (
    <group>
      <Block position={[-0.15, 0.05, 0]} scale={[0.3, 0.08, 0.24]} color={complete ? PAPER : DIM} rotation={[0, 0.08, -0.08]} />
      <Block position={[0.15, 0.05, 0]} scale={[0.3, 0.08, 0.24]} color={complete ? PAPER : DIM} rotation={[0, -0.08, 0.08]} />
      <Block position={[-0.08, 0.12, 0.02]} scale={[0.035, 0.13, 0.035]} color={complete ? GOLD : DIM} />
      <Block position={[0.08, 0.12, 0.02]} scale={[0.035, 0.13, 0.035]} color={complete ? GOLD : DIM} />
    </group>
  );
}

function AcknowledgeHurt({ complete }: { complete: boolean }) {
  return (
    <group>
      <Block position={[0, 0.08, 0]} scale={[0.56, 0.16, 0.14]} color={complete ? CLAY : DIM} />
      <Block position={[0, 0.18, 0.08]} scale={[0.5, 0.035, 0.025]} color={complete ? GOLD : '#493b32'} rotation={[0, 0, 0.12]} />
    </group>
  );
}

function Apologize({ complete }: { complete: boolean }) {
  return (
    <group>
      <Block position={[-0.06, 0.13, 0]} scale={[0.42, 0.05, 0.28]} color={complete ? PAPER : DIM} rotation={[0, 0, 0.1]} />
      <Block position={[0.08, 0.17, 0.03]} scale={[0.26, 0.025, 0.03]} color={complete ? CLAY : '#493b32'} rotation={[0, 0, -0.45]} />
      <Block position={[0.24, 0.09, 0]} scale={[0.12, 0.12, 0.12]} color={complete ? GOLD_SOFT : DIM} />
    </group>
  );
}

function MoreTime({ complete, returned }: { complete: boolean; returned: boolean }) {
  if (complete || returned) {
    return (
      <group>
        <Block position={[0, 0.12, 0]} scale={[0.24, 0.08, 0.2]} color={WOOD} />
        <Block position={[0, 0.34, 0]} scale={[0.18, 0.32, 0.16]} color={complete ? GOLD_SOFT : DIM} />
        <Block position={[-0.16, 0.34, 0]} scale={[0.035, 0.4, 0.035]} color={WOOD} />
        <Block position={[0.16, 0.34, 0]} scale={[0.035, 0.4, 0.035]} color={WOOD} />
      </group>
    );
  }
  return (
    <group>
      <Block position={[0, 0.05, 0]} scale={[0.34, 0.06, 0.18]} color={WOOD} />
      <Block position={[0, 0.42, 0]} scale={[0.34, 0.06, 0.18]} color={WOOD} />
      <Block position={[-0.12, 0.24, 0]} scale={[0.05, 0.32, 0.05]} color={WOOD} rotation={[0, 0, -0.25]} />
      <Block position={[0.12, 0.24, 0]} scale={[0.05, 0.32, 0.05]} color={WOOD} rotation={[0, 0, 0.25]} />
      <Block position={[0, 0.24, 0]} scale={[0.1, 0.14, 0.1]} color={DIM} />
    </group>
  );
}

const SOCKETS: Record<FireplacePathwayId, [number, number, number]> = {
  stay_close: [-3.45, 0.16, -2.52],
  talk_through: [-2.95, 2.92, -3.0],
  hear_first: [-2.35, 2.92, -3.0],
  acknowledge_hurt: [-2.55, 1.65, -2.86],
  apologize: [-1.72, 2.92, -3.0],
  more_time: [-1.28, 0.12, -2.7],
};

export function FireplaceOutcomes() {
  const snapshot = useMomentV2Store((state) => state.snapshot);
  const complete = useMemo(() => new Set(
    (snapshot?.today_outcomes ?? [])
      .filter((outcome) => outcome.destination === 'fireplace' && outcome.intent)
      .map((outcome) => outcome.intent!),
  ), [snapshot]);
  const activePathway = snapshot?.active?.destination === 'fireplace'
    ? snapshot.active.intent
    : null;

  return (
    <>
      {(Object.keys(SOCKETS) as FireplacePathwayId[]).map((pathway) => {
        const isComplete = complete.has(pathway);
        const isOpen = activePathway === pathway;
        if (!isComplete && !isOpen) return null;
        const returned = isOpen && (snapshot?.participants ?? []).some((participant) => !!participant.returned_at);
        return (
          <group
            key={pathway}
            position={SOCKETS[pathway]}
            onClick={(event) => {
              event.stopPropagation();
              useMomentsSurfaceStore.getState().openMoments();
            }}
          >
            {pathway === 'stay_close' && <StayClose complete={isComplete} />}
            {pathway === 'talk_through' && <TalkThrough complete={isComplete} clock={false} />}
            {pathway === 'hear_first' && <HearFirst complete={isComplete} />}
            {pathway === 'acknowledge_hurt' && <AcknowledgeHurt complete={isComplete} />}
            {pathway === 'apologize' && <Apologize complete={isComplete} />}
            {pathway === 'more_time' && <MoreTime complete={isComplete} returned={returned} />}
            <Block position={[0, -0.035, 0]} scale={[0.64, 0.025, 0.46]} color={isComplete ? GOLD : SAGE} />
          </group>
        );
      })}
    </>
  );
}
