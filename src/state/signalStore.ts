import { create } from 'zustand';

import { SIGNALS, type SignalType } from '@/copy';
import { useSceneStore } from './sceneStore';

export interface ActiveSignal {
  type: SignalType;
  createdAt: number;
  /** The response the other person chose, once given. */
  response?: string;
}

/** Responses that physically bring the responder to the signal's spot. */
const JOIN_RESPONSES: Partial<Record<SignalType, string>> = {
  fireplace: SIGNALS.fireplace.responses[0], // 'Sit beside them'
  sofa: SIGNALS.sofa.responses[0], // 'Sit with them'
  table: SIGNALS.table.responses[0], // "I'm ready"
};

interface SignalFlowState {
  /** Signal I left for my partner (avatar a). */
  mySignal: ActiveSignal | null;
  /** Signal my partner left for me (avatar b). Simulated until Phase 5 sync. */
  partnerSignal: ActiveSignal | null;
  /** True while the fireplace reconciliation prompt is open. */
  reconciling: boolean;
  sendSignal: (type: SignalType) => void;
  cancelMySignal: () => void;
  /** I answer my partner's signal. */
  respondToPartner: (choice: string) => void;
  chooseReconciliation: (choice: string) => void;
  /** Dev-only partner simulation — replaced by realtime sync in Phase 5. */
  simulatePartnerSignal: (type: SignalType) => void;
  simulatePartnerResponse: (choice: string) => void;
}

const scene = () => useSceneStore.getState();

export const useSignalStore = create<SignalFlowState>((set, get) => ({
  mySignal: null,
  partnerSignal: null,
  reconciling: false,

  sendSignal: (type) => {
    set({ mySignal: { type, createdAt: Date.now() } });
    scene().setSpot('a', type);
  },

  cancelMySignal: () => {
    set({ mySignal: null });
    scene().setSpot('a', 'idle');
  },

  respondToPartner: (choice) => {
    const { partnerSignal } = get();
    if (!partnerSignal) return;
    set({ partnerSignal: { ...partnerSignal, response: choice } });
    if (JOIN_RESPONSES[partnerSignal.type] === choice) {
      scene().setSpot('a', partnerSignal.type);
      if (partnerSignal.type === 'fireplace') set({ reconciling: true });
    }
  },

  chooseReconciliation: (choice) => {
    // Choices come verbatim from RECONCILIATION.choices (index order).
    if (choice === "We're okay now") {
      scene().triggerGlow();
      set({ reconciling: false, mySignal: null, partnerSignal: null });
      // Both stay seated together in the warmth.
    } else if (choice === 'We should talk first') {
      scene().setSpot('a', 'table');
      scene().setSpot('b', 'table');
      set({ reconciling: false, mySignal: null, partnerSignal: null });
    } else {
      // 'I need more time' — step back; the signal stays open.
      scene().setSpot('a', 'idle');
      set({ reconciling: false });
    }
  },

  simulatePartnerSignal: (type) => {
    set({ partnerSignal: { type, createdAt: Date.now() } });
    scene().setSpot('b', type);
  },

  simulatePartnerResponse: (choice) => {
    const { mySignal } = get();
    if (!mySignal) return;
    set({ mySignal: { ...mySignal, response: choice } });
    if (JOIN_RESPONSES[mySignal.type] === choice) {
      scene().setSpot('b', mySignal.type);
      if (mySignal.type === 'fireplace') set({ reconciling: true });
    }
  },
}));
