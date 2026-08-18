import { create } from 'zustand';

import type { FireplacePathwayId, MomentActionEventV2, MomentDestination } from '@/lib/db';

export type AtmosphereMode = 'warm' | 'cool' | 'rain';
export type SpotId = 'idle' | 'fireplace' | 'sofa' | 'table' | 'garden' | 'garden_arch' | 'rest' | 'romantic';
export type AvatarKey = 'a' | 'b';

export interface MomentAtmosphereState {
  destination: MomentDestination;
  intent: FireplacePathwayId | null;
  responseAction: string | null;
  partnerResponded: boolean;
  bothPresent: boolean;
}

export interface LiveMomentActionState {
  eventId: string;
  actor: AvatarKey;
  actionId: string;
  destination: MomentDestination;
  startedAt: number;
}

export interface MomentPayoffState {
  eventId: string;
  destination: MomentDestination;
  kind: 'heart' | 'mutual_heart' | 'destination';
  startedAt: number;
}

interface SceneState {
  atmosphere: AtmosphereMode;
  /** Timestamp (ms) of the last reconciliation glow trigger, or null. */
  glowStartedAt: number | null;
  /** Which spot the current glow (and its heart pop) is centred on. Lets the
   *  same warm payoff land over the fire *or* over the bed. */
  glowSpot: SpotId;
  /** Mirrored OS accessibility setting for non-renderer timing decisions. */
  reduceMotion: boolean;
  /** An unresolved fireplace signal keeps the flame deliberately small. */
  fireplaceWaiting: boolean;
  /** The newest intentional avatar location controls temporary shared mood. */
  interactionSpot: SpotId | null;
  /** The unresolved v2 moment owns the home's dominant visual atmosphere. */
  momentAtmosphere: MomentAtmosphereState | null;
  momentActionEvents: MomentActionEventV2[];
  todayMomentActionEvents: MomentActionEventV2[];
  liveMomentAction: LiveMomentActionState | null;
  /** Live-only, durable-event-backed ending. Snapshot hydration never sets it. */
  momentPayoff: MomentPayoffState | null;
  readinessHeartComplete: boolean;
  spots: Record<AvatarKey, SpotId>;
  /** Bumped when avatars should jump to their spot instantly (no walk) — used
   *  when hydrating current state on launch so the app opens where things are. */
  snapAt: number;
  setAtmosphere: (mode: AtmosphereMode) => void;
  setSpot: (avatar: AvatarKey, spot: SpotId) => void;
  /** Fire the warm glow + heart pop, centred on `spot` (default: the fire). */
  triggerGlow: (spot?: SpotId) => void;
  setReduceMotion: (reduceMotion: boolean) => void;
  setFireplaceWaiting: (waiting: boolean) => void;
  setInteractionSpot: (spot: SpotId | null) => void;
  setMomentAtmosphere: (moment: MomentAtmosphereState | null) => void;
  setMomentActionEvents: (current: MomentActionEventV2[], today: MomentActionEventV2[]) => void;
  triggerMomentAction: (action: Omit<LiveMomentActionState, 'startedAt'>) => void;
  clearMomentAction: () => void;
  triggerMomentPayoff: (payoff: Omit<MomentPayoffState, 'startedAt'>) => void;
  clearMomentPayoff: () => void;
  triggerReadinessHeartComplete: () => void;
  /** Request the next spot application to be instantaneous. */
  requestSnap: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  atmosphere: 'warm',
  glowStartedAt: null,
  glowSpot: 'fireplace',
  reduceMotion: false,
  fireplaceWaiting: false,
  interactionSpot: null,
  momentAtmosphere: null,
  momentActionEvents: [],
  todayMomentActionEvents: [],
  liveMomentAction: null,
  momentPayoff: null,
  readinessHeartComplete: false,
  spots: { a: 'idle', b: 'idle' },
  snapAt: 0,
  setAtmosphere: (atmosphere) => set({ atmosphere }),
  setSpot: (avatar, spot) =>
    set((s) => ({ spots: { ...s.spots, [avatar]: spot } })),
  triggerGlow: (spot = 'fireplace') =>
    set({ glowStartedAt: Date.now(), glowSpot: spot, atmosphere: 'warm' }),
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
  setFireplaceWaiting: (fireplaceWaiting) => set({ fireplaceWaiting }),
  setInteractionSpot: (interactionSpot) => set({ interactionSpot }),
  setMomentAtmosphere: (momentAtmosphere) => set({ momentAtmosphere }),
  setMomentActionEvents: (momentActionEvents, todayMomentActionEvents) => set({
    momentActionEvents,
    todayMomentActionEvents,
  }),
  triggerMomentAction: (action) => set({ liveMomentAction: { ...action, startedAt: Date.now() } }),
  clearMomentAction: () => set({ liveMomentAction: null }),
  triggerMomentPayoff: (payoff) => set({
    momentPayoff: { ...payoff, startedAt: Date.now() },
    glowStartedAt: payoff.kind === 'heart' || payoff.kind === 'mutual_heart' ? Date.now() : null,
    glowSpot: payoff.destination,
  }),
  clearMomentPayoff: () => set({ momentPayoff: null, glowStartedAt: null }),
  triggerReadinessHeartComplete: () => {
    set({ readinessHeartComplete: true });
    setTimeout(() => set({ readinessHeartComplete: false }), 460);
  },
  requestSnap: () => set({ snapAt: Date.now() }),
}));
