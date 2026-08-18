import type { SignalType } from '@/copy';
import type { SpotId } from './sceneStore';

export interface PresenceSignal {
  type: SignalType;
  createdAt: number;
  response?: string;
  responseAt?: number;
  /** Latest time the signal author returned after leaving their own spot. */
  authorReturnedAt?: number;
  /** Latest time the signal author deliberately left their own spot. */
  authorLeftAt?: number;
  /** Latest time the responding partner deliberately left a joined spot. */
  responderLeftAt?: number;
}

const JOIN_RESPONSES: Partial<Record<SignalType, string>> = {
  fireplace: 'Sit beside them',
  sofa: 'Sit with them',
  table: "I'm ready",
  romantic: 'Come close',
};

interface TimedSpot {
  spot: SpotId;
  at: number;
}

function authoredPresence(signal: PresenceSignal | null): TimedSpot | null {
  if (!signal) return null;
  const at = Math.max(signal.createdAt, signal.authorReturnedAt ?? 0);
  if ((signal.authorLeftAt ?? 0) >= at) return null;
  return { spot: signal.type, at };
}

export function responseJoinsSignalSpot(signal: PresenceSignal | null): boolean {
  return !!(
    signal?.response && JOIN_RESPONSES[signal.type] === signal.response
  );
}

function joinedPresence(signal: PresenceSignal | null): TimedSpot | null {
  if (
    !signal ||
    !responseJoinsSignalSpot(signal) ||
    !signal.responseAt
  ) {
    return null;
  }
  if ((signal.responderLeftAt ?? 0) >= signal.responseAt) return null;
  return { spot: signal.type, at: signal.responseAt };
}

export function authorIsAtSignalSpot(signal: PresenceSignal | null): boolean {
  return authoredPresence(signal) != null;
}

export function responderIsAtSignalSpot(signal: PresenceSignal | null): boolean {
  return joinedPresence(signal) != null;
}

function latestPresence(...candidates: (TimedSpot | null)[]): SpotId {
  return candidates.reduce<TimedSpot | null>(
    (latest, candidate) =>
      candidate && (!latest || candidate.at >= latest.at) ? candidate : latest,
    null,
  )?.spot ?? 'idle';
}

/**
 * Convert the two independent signal histories into device-relative scene
 * spots. Authored signals and join responses are both intentional actions; the
 * newest action controls only its own person and can never reset the other.
 */
export function projectSignalPresence(
  mySignal: PresenceSignal | null,
  partnerSignal: PresenceSignal | null,
): { mine: SpotId; partner: SpotId } {
  return {
    mine: latestPresence(authoredPresence(mySignal), joinedPresence(partnerSignal)),
    partner: latestPresence(authoredPresence(partnerSignal), joinedPresence(mySignal)),
  };
}
