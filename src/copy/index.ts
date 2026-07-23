// Every user-facing string for emotional signals lives here, using the exact
// spec wording. Screens must import from this file — never inline this copy.

export type SignalType = 'fireplace' | 'sofa' | 'table' | 'garden' | 'rest' | 'romantic';

export interface SignalCopy {
  /** Shown to the person selecting the signal. */
  selfText: string;
  /** Shown to their partner (privacy-safe, no blame). */
  partnerText: string;
  /** Response options offered to the partner. */
  responses: string[];
  /** Short label for pickers / debug UI. */
  label: string;
}

export const SIGNALS: Record<SignalType, SignalCopy> = {
  fireplace: {
    label: 'Fireplace',
    selfText: 'I want to make up.',
    partnerText: 'Your partner is sitting by the fire. They may be ready to reconnect.',
    responses: ['Sit beside them', 'Send warmth', 'Ask to talk later', 'Not ready yet'],
  },
  sofa: {
    label: 'Sofa',
    selfText: 'I want comfort or affection.',
    partnerText: 'Your partner is resting on the sofa. They could use some comfort.',
    responses: ['Sit with them', 'Send a hug', 'Ask what they need', 'Respond later'],
  },
  table: {
    label: 'Table',
    selfText: 'I would like to talk.',
    partnerText: 'Your partner is waiting at the table. They would like to talk.',
    responses: ["I'm ready", 'Can we talk later?', 'I need more time', 'Send a short note'],
  },
  garden: {
    label: 'Garden',
    selfText: 'I need some space.',
    partnerText: 'Your partner is sitting in the garden. They need a little space.',
    responses: ['I understand', "I'm here when you're ready", 'Check in later'],
  },
  rest: {
    label: 'Resting area',
    selfText: 'I feel overwhelmed or tired. This may not be about us.',
    partnerText: 'Your partner is resting. They feel overwhelmed — it may not be about you.',
    responses: ['Let them rest', 'Send encouragement', 'Offer practical help', 'Send affection'],
  },
  romantic: {
    label: 'Bedroom',
    selfText: 'I feel close to you tonight.',
    partnerText: 'Your partner is waiting in the bedroom. They feel close to you.',
    responses: ['Come close', 'Send a kiss', 'Just hold me', 'Not tonight'],
  },
};

export const GARDEN_CHECKIN_OPTIONS = [
  'Check in later today',
  'Check in tomorrow',
  'I will return when ready',
] as const;

export const RECONCILIATION = {
  prompt: 'Are you ready to reconnect?',
  choices: ["We're okay now", 'We should talk first', 'I need more time'],
} as const;

export const NOTIFICATIONS = {
  somethingChanged: 'Something has changed at home.',
  fireplaceGlowing: 'The fireplace is glowing.',
  partnerSignal: 'Your partner has left a signal.',
  newSeed: 'A new seed was planted.',
  gardenWaiting: 'Someone is waiting in the garden.',
  feelingClose: 'Someone is thinking of you.',
} as const;
