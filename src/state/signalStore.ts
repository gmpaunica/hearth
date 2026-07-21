import { create } from 'zustand';

import { SIGNALS, type SignalType } from '@/copy';
import type { ResponseRow, SignalRow } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useSceneStore } from './sceneStore';

export interface ActiveSignal {
  /** DB row id, when this signal is backed by Supabase (absent for dev sims). */
  id?: string;
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

/** Identity + couple context, set by the realtime sync once paired. */
interface SyncContext {
  coupleId: string;
  userId: string;
  partnerId: string | null;
}

interface SignalFlowState {
  /** Signal I left for my partner (avatar a). */
  mySignal: ActiveSignal | null;
  /** Signal my partner left for me (avatar b). */
  partnerSignal: ActiveSignal | null;
  /** True while the fireplace reconciliation prompt is open. */
  reconciling: boolean;
  /** Live sync context, or null when offline / not yet paired. */
  ctx: SyncContext | null;

  sendSignal: (type: SignalType) => void;
  cancelMySignal: () => void;
  /** I answer my partner's signal. */
  respondToPartner: (choice: string) => void;
  chooseReconciliation: (choice: string) => void;

  // ── Realtime plumbing (driven by useHearthSync) ──────────────────────────
  setContext: (ctx: SyncContext | null) => void;
  /** Replace local state from a fresh fetch of the couple's open signals. */
  hydrate: (signals: SignalRow[], responses: ResponseRow[]) => void;
  ingestSignal: (row: SignalRow) => void;
  ingestResponse: (row: ResponseRow) => void;
  reset: () => void;

  // ── Dev-only partner simulation (offline visual QA) ──────────────────────
  simulatePartnerSignal: (type: SignalType) => void;
  simulatePartnerResponse: (choice: string) => void;
}

const scene = () => useSceneStore.getState();

/** Apply the scene reaction when a join-type response lands on `spot`. */
function reactToJoin(actor: 'a' | 'b', type: SignalType, choice: string): boolean {
  if (JOIN_RESPONSES[type] !== choice) return false;
  scene().setSpot(actor, type);
  return true;
}

export const useSignalStore = create<SignalFlowState>((set, get) => ({
  mySignal: null,
  partnerSignal: null,
  reconciling: false,
  ctx: null,

  sendSignal: (type) => {
    // Optimistic: the avatar walks immediately; the DB insert confirms via
    // realtime (matched back by id). Works offline as a pure-local signal.
    set({ mySignal: { type, createdAt: Date.now() } });
    scene().setSpot('a', type);

    const { ctx } = get();
    if (!ctx) return;
    void supabase
      .from('signals')
      .insert({ couple_id: ctx.coupleId, from_user: ctx.userId, type })
      .select()
      .single()
      .then(({ data }) => {
        if (!data) return;
        const cur = get().mySignal;
        // Attach the real id so responses can reference it.
        if (cur && !cur.id && cur.type === type) set({ mySignal: { ...cur, id: data.id } });
      });
  },

  cancelMySignal: () => {
    const { mySignal, ctx } = get();
    set({ mySignal: null });
    scene().setSpot('a', 'idle');
    if (ctx && mySignal?.id) {
      void supabase
        .from('signals')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', mySignal.id);
    }
  },

  respondToPartner: (choice) => {
    const { partnerSignal, ctx } = get();
    if (!partnerSignal) return;
    set({ partnerSignal: { ...partnerSignal, response: choice } });
    if (reactToJoin('a', partnerSignal.type, choice) && partnerSignal.type === 'fireplace') {
      set({ reconciling: true });
    }
    if (ctx && partnerSignal.id) {
      void supabase.from('responses').insert({
        signal_id: partnerSignal.id,
        from_user: ctx.userId,
        choice,
      });
    }
  },

  chooseReconciliation: (choice) => {
    // Choices come verbatim from RECONCILIATION.choices (index order).
    const resolveBoth = () => {
      const { mySignal, partnerSignal, ctx } = get();
      if (!ctx) return;
      const ids = [mySignal?.id, partnerSignal?.id].filter(Boolean) as string[];
      if (ids.length) {
        void supabase
          .from('signals')
          .update({ resolved_at: new Date().toISOString() })
          .in('id', ids);
      }
    };
    if (choice === "We're okay now") {
      scene().triggerGlow();
      resolveBoth();
      set({ reconciling: false, mySignal: null, partnerSignal: null });
      // Both stay seated together in the warmth.
    } else if (choice === 'We should talk first') {
      scene().setSpot('a', 'table');
      scene().setSpot('b', 'table');
      resolveBoth();
      set({ reconciling: false, mySignal: null, partnerSignal: null });
    } else {
      // 'I need more time' — step back; the signal stays open.
      scene().setSpot('a', 'idle');
      set({ reconciling: false });
    }
  },

  setContext: (ctx) => set({ ctx }),

  hydrate: (signals, responses) => {
    const { ctx } = get();
    if (!ctx) return;
    const byId = new Map(signals.map((s) => [s.id, s] as const));
    const mine = signals.filter((s) => s.from_user === ctx.userId).at(-1) ?? null;
    const theirs = signals.filter((s) => s.from_user !== ctx.userId).at(-1) ?? null;

    const asActive = (row: SignalRow | null): ActiveSignal | null =>
      row ? { id: row.id, type: row.type, createdAt: Date.parse(row.created_at) } : null;

    const mySignal = asActive(mine);
    const partnerSignal = asActive(theirs);

    // Fold in any responses to those two open signals.
    for (const r of responses) {
      const sig = byId.get(r.signal_id);
      if (!sig) continue;
      if (mySignal && sig.id === mySignal.id && r.from_user !== ctx.userId) {
        mySignal.response = r.choice;
      }
      if (partnerSignal && sig.id === partnerSignal.id) {
        partnerSignal.response = r.choice;
      }
    }

    set({ mySignal, partnerSignal });
    if (mySignal) scene().setSpot('a', mySignal.type);
    if (partnerSignal) scene().setSpot('b', partnerSignal.type);
  },

  ingestSignal: (row) => {
    const { ctx } = get();
    if (!ctx) return;
    if (row.resolved_at) {
      // A signal closed — clear whichever side it belonged to.
      const { mySignal, partnerSignal } = get();
      if (mySignal?.id === row.id) {
        set({ mySignal: null });
        scene().setSpot('a', 'idle');
      }
      if (partnerSignal?.id === row.id) {
        set({ partnerSignal: null });
        scene().setSpot('b', 'idle');
      }
      return;
    }
    if (row.from_user === ctx.userId) {
      // Echo of my own insert; reconcile the optimistic row with its id.
      const cur = get().mySignal;
      if (!cur || cur.id !== row.id) {
        set({ mySignal: { id: row.id, type: row.type, createdAt: Date.parse(row.created_at) } });
        scene().setSpot('a', row.type);
      }
    } else {
      set({
        partnerSignal: { id: row.id, type: row.type, createdAt: Date.parse(row.created_at) },
      });
      scene().setSpot('b', row.type);
    }
  },

  ingestResponse: (row) => {
    const { ctx, mySignal, partnerSignal } = get();
    if (!ctx) return;
    // Partner answered the signal I left.
    if (mySignal?.id === row.signal_id && row.from_user !== ctx.userId) {
      set({ mySignal: { ...mySignal, response: row.choice } });
      if (reactToJoin('b', mySignal.type, row.choice) && mySignal.type === 'fireplace') {
        set({ reconciling: true });
      }
    }
    // Echo of my own answer to the partner's signal.
    if (partnerSignal?.id === row.signal_id && row.from_user === ctx.userId) {
      set({ partnerSignal: { ...partnerSignal, response: row.choice } });
    }
  },

  reset: () =>
    set({ mySignal: null, partnerSignal: null, reconciling: false, ctx: null }),

  simulatePartnerSignal: (type) => {
    set({ partnerSignal: { type, createdAt: Date.now() } });
    scene().setSpot('b', type);
  },

  simulatePartnerResponse: (choice) => {
    const { mySignal } = get();
    if (!mySignal) return;
    set({ mySignal: { ...mySignal, response: choice } });
    if (reactToJoin('b', mySignal.type, choice) && mySignal.type === 'fireplace') {
      set({ reconciling: true });
    }
  },
}));
