// Every user-facing string for emotional signals lives here, using the exact
// spec wording. Screens must import from this file — never inline this copy.

export type SignalType = 'fireplace' | 'sofa' | 'table' | 'garden' | 'rest' | 'romantic';

export const FIREPLACE_NEEDS = [
  { id: 'beside', label: 'I just want you beside me.' },
  { id: 'reassurance', label: 'I need reassurance.' },
  { id: 'talk', label: 'I want to talk.' },
  { id: 'heard-first', label: 'I want to be heard first.' },
  { id: 'apology', label: 'I would like an apology.' },
  { id: 'sorry', label: "I'm sorry, but I don't know how to say it." },
  { id: 'more-time', label: 'I want us to be okay, but I need more time.' },
] as const;

export type FireplaceNeedId = (typeof FIREPLACE_NEEDS)[number]['id'];

export function fireplaceNeedLabel(id: FireplaceNeedId): string {
  return FIREPLACE_NEEDS.find((need) => need.id === id)?.label ?? '';
}

export type FireplacePathwayId =
  | 'stay_close'
  | 'talk_through'
  | 'hear_first'
  | 'acknowledge_hurt'
  | 'apologize'
  | 'more_time';

export interface FireplaceResponseCopy {
  id: string;
  label: string;
  hint: string;
  movesToFireplace?: boolean;
  asksForSentence?: boolean;
  asksForReturnTime?: boolean;
}

export interface FireplacePathwayCopy {
  id: FireplacePathwayId;
  title: string;
  senderText: string;
  partnerText: string;
  sentencePrompt?: string;
  sentenceStarter?: string;
  responses: FireplaceResponseCopy[];
  outcome: string;
  outcomeObject: string;
}

/** The six complete fireplace pathways. Legacy FIREPLACE_NEEDS stay above so
 * already-open encoded signals can still hydrate after this release. */
export const FIREPLACE_PATHWAYS: FireplacePathwayCopy[] = [
  {
    id: 'stay_close',
    title: 'I want us to feel close again',
    senderText: 'I want closeness and reassurance.',
    partnerText: 'Your partner would like closeness or reassurance.',
    sentencePrompt: 'Add one sentence if it would help.',
    responses: [
      { id: 'sit_beside', label: 'Be beside them', hint: 'Join them by the fire. This says “I’m here” without asking them to explain.', movesToFireplace: true, asksForSentence: true },
      { id: 'send_reassurance', label: 'Offer reassurance', hint: 'Stay where you are and leave one caring sentence if words would help.', asksForSentence: true },
      { id: 'request_time', label: 'Care, but ask for time', hint: 'Keep the moment open and say when you can return to it.', asksForSentence: true, asksForReturnTime: true },
    ],
    outcome: 'You chose closeness today.',
    outcomeObject: 'Paired cushions and twin embers',
  },
  {
    id: 'talk_through',
    title: 'I want to talk this through',
    senderText: 'I want us to make space to talk.',
    partnerText: 'Your partner would like to talk this through.',
    responses: [
      { id: 'talk_now', label: 'I can talk now', hint: 'Meet by the fire and move this toward a real conversation.', movesToFireplace: true },
      { id: 'one_hour', label: 'I can talk in one hour', hint: 'Agree to come back soon without dismissing the request.', asksForReturnTime: true },
      { id: 'tonight', label: 'Let’s make time tonight', hint: 'Keep the moment open and make room later today.', asksForReturnTime: true },
      { id: 'tomorrow', label: 'Let’s talk tomorrow', hint: 'Acknowledge the conversation and return tomorrow.', asksForReturnTime: true },
      { id: 'request_more_time', label: 'I care, and need longer', hint: 'Choose a return time without closing or rejecting the moment.', asksForReturnTime: true },
    ],
    outcome: 'You made space to talk.',
    outcomeObject: 'Two warm mugs',
  },
  {
    id: 'hear_first',
    title: 'I need you to hear me',
    senderText: 'I need to feel heard before we move forward.',
    partnerText: 'Your partner would like you to listen first.',
    sentencePrompt: 'Leave one sentence if you want.',
    responses: [
      { id: 'ready_to_listen', label: 'I’m ready to listen first', hint: 'Join them without defending or solving. You may reflect one sentence back.', movesToFireplace: true, asksForSentence: true },
    ],
    outcome: 'You made room to listen.',
    outcomeObject: 'An open mantel book',
  },
  {
    id: 'acknowledge_hurt',
    title: 'I need the hurt acknowledged',
    senderText: 'I need the hurt to be acknowledged.',
    partnerText: 'Your partner would like the hurt acknowledged. An apology is not required.',
    responses: [
      { id: 'acknowledge', label: 'I acknowledge that this hurt', hint: 'Recognize their experience without being forced to agree or apologize.', movesToFireplace: true },
      { id: 'understand_first', label: 'I want to understand first', hint: 'Keep the moment open and ask for a real conversation before answering.' },
      { id: 'request_time', label: 'I care, and need time', hint: 'Say when you can return without treating the hurt as settled.', asksForReturnTime: true },
    ],
    outcome: 'The hurt was acknowledged together.',
    outcomeObject: 'A restrained golden seam',
  },
  {
    id: 'apologize',
    title: 'I want to apologize',
    senderText: 'I want to offer an apology.',
    partnerText: 'Your partner has offered an apology. Forgiveness is never required.',
    sentencePrompt: 'Complete this only if you want.',
    sentenceStarter: 'I’m sorry for…',
    responses: [
      { id: 'read', label: 'I received your apology', hint: 'Let them know it reached you. This does not require forgiveness.' },
      { id: 'appreciate_need_time', label: 'I appreciate it and need time', hint: 'Receive the apology while keeping space for your own feelings.' },
      { id: 'suggest_talking', label: 'Let’s talk about it', hint: 'Meet by the fire and continue the repair in your own words.', movesToFireplace: true },
    ],
    outcome: 'An apology was offered and received.',
    outcomeObject: 'A folded note and bright gold coal',
  },
  {
    id: 'more_time',
    title: 'More time, still us',
    senderText: 'I need more time, and I’m still here with us.',
    partnerText: 'Your partner needs time and has kept the moment open.',
    responses: [
      { id: 'acknowledge', label: 'I understand. Take the time.', hint: 'Respect the pause and reassure them that the relationship is still here.' },
    ],
    outcome: 'You gave each other time.',
    outcomeObject: 'A lantern beside banked coals',
  },
];

export const FIREPLACE_PATHWAY_BY_ID = Object.fromEntries(
  FIREPLACE_PATHWAYS.map((pathway) => [pathway.id, pathway]),
) as Record<FireplacePathwayId, FireplacePathwayCopy>;

export const FIREPLACE_READINESS = [
  { id: 'ready', label: 'Ready to reconnect' },
  { id: 'not_ready', label: 'Not ready yet' },
] as const;

export const RETURN_OPTIONS = [
  { id: 'one_hour', label: 'In one hour' },
  { id: 'tonight', label: 'Tonight' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'when_ready', label: 'I’ll signal when ready' },
] as const;

export interface SignalResponseCopy {
  /** Stable server value retained for legacy/simple moments. */
  action: string;
  /** Human choice shown on the card. */
  label: string;
  /** Emotional meaning or consequence of choosing it. */
  meaning: string;
}

export interface SignalCopy {
  /** Shown to the person selecting the signal. */
  selfText: string;
  /** Shown to their partner (privacy-safe, no blame). */
  partnerText: string;
  /** Response options offered to the partner. */
  responses: SignalResponseCopy[];
  /** Short label for pickers / debug UI. */
  label: string;
}

export const SIGNALS: Record<SignalType, SignalCopy> = {
  fireplace: {
    label: 'Fireplace',
    selfText: 'I want to make up.',
    partnerText: 'Your partner is sitting by the fire. They may be ready to reconnect.',
    responses: [
      { action: 'Sit beside them', label: 'Be beside them', meaning: 'Join them by the fire and offer quiet presence.' },
      { action: 'Send warmth', label: 'Send some warmth', meaning: 'Acknowledge the moment with care, without moving or asking for words.' },
      { action: 'Ask to talk later', label: 'Ask to talk later', meaning: 'Keep the repair open and move it toward a real conversation.' },
      { action: 'Not ready yet', label: 'I care, but I’m not ready', meaning: 'Be honest without treating the moment as rejection or failure.' },
    ],
  },
  sofa: {
    label: 'Sofa',
    selfText: 'I want comfort or affection.',
    partnerText: 'Your partner is resting on the sofa. They could use some comfort.',
    responses: [
      { action: 'Sit with them', label: 'Be close for a while', meaning: 'Join them on the sofa and offer presence without asking them to explain.' },
      { action: 'Send a hug', label: 'Send a hug', meaning: 'Offer affection from where you are; no answer is required.' },
      { action: 'Ask what they need', label: 'Ask what would help', meaning: 'Open a gentle conversation instead of guessing.' },
      { action: 'Respond later', label: 'I care, and need a little time', meaning: 'Acknowledge their need without promising closeness before you are ready.' },
    ],
  },
  table: {
    label: 'Table',
    selfText: 'I would like to talk.',
    partnerText: 'Your partner is waiting at the table. They would like to talk.',
    responses: [
      { action: "I'm ready", label: 'I’m ready to talk', meaning: 'Join them at the table and begin a real conversation.' },
      { action: 'Can we talk later?', label: 'Can we choose a time?', meaning: 'Take the request seriously and move the conversation to a calmer time.' },
      { action: 'I need more time', label: 'I need a little more time', meaning: 'Keep the moment open without pretending you are ready.' },
      { action: 'Send a short note', label: 'Start with a short note', meaning: 'Use one sentence to make the first words easier.' },
    ],
  },
  garden: {
    label: 'Garden',
    selfText: 'I need some space.',
    partnerText: 'Your partner is sitting in the garden. They need a little space.',
    responses: [
      { action: 'I understand', label: 'Give them the space', meaning: 'Acknowledge the boundary once and do not pull them into a conversation.' },
      { action: "I'm here when you're ready", label: 'Reassure them you’re here', meaning: 'Respect the distance while making it clear they have not been abandoned.' },
      { action: 'Check in later', label: 'Leave the door open', meaning: 'Keep the moment available for a later check-in without pressing now.' },
    ],
  },
  rest: {
    label: 'Resting area',
    selfText: 'I feel overwhelmed or tired. This may not be about us.',
    partnerText: 'Your partner is resting. They feel overwhelmed — it may not be about you.',
    responses: [
      { action: 'Let them rest', label: 'Let them rest', meaning: 'Remove pressure to explain, answer, or take care of the relationship right now.' },
      { action: 'Send encouragement', label: 'Send encouragement', meaning: 'Offer a few steady words without expecting a conversation.' },
      { action: 'Offer practical help', label: 'Offer practical help', meaning: 'Ask whether one small real-world task would make things lighter.' },
      { action: 'Send affection', label: 'Send gentle affection', meaning: 'Remind them they are cared for while leaving them room to rest.' },
    ],
  },
  romantic: {
    label: 'Bedroom',
    selfText: 'I feel close to you tonight.',
    partnerText: 'Your partner is waiting in the bedroom. They feel close to you.',
    responses: [
      { action: 'Come close', label: 'Come close', meaning: 'Join them in the room and return the invitation for affection.' },
      { action: 'Send a kiss', label: 'Send a kiss', meaning: 'Return the affection without changing where your avatar is.' },
      { action: 'Just hold me', label: 'Offer quiet closeness', meaning: 'Choose tenderness without making the moment sexual or demanding.' },
      { action: 'Not tonight', label: 'Not tonight, but we’re okay', meaning: 'Decline closeness clearly and kindly without creating pressure.' },
    ],
  },
};

export interface MomentFeelingCopy {
  type: SignalType;
  feeling: string;
  location: string;
  purpose: string;
  invitation: string;
}

/** Deterministic emotional routing: Hearth explains the destination; it does
 * not infer, diagnose, or score the person's feelings. */
export const MOMENT_FEELINGS: MomentFeelingCopy[] = [
  {
    type: 'fireplace',
    feeling: 'I want us to feel close again',
    location: 'Fireplace',
    purpose: 'For repair, reassurance, listening, apology, or making time to reconnect.',
    invitation: 'Your partner can meet you with a specific kind of care, then both of you decide privately when the moment feels complete.',
  },
  {
    type: 'garden',
    feeling: 'I need some space',
    location: 'Garden',
    purpose: 'For being on your own for a while without making the distance feel like abandonment.',
    invitation: 'Your partner can respect the pause, reassure you, or leave the door open for later.',
  },
  {
    type: 'sofa',
    feeling: 'I need comfort or affection',
    location: 'Sofa',
    purpose: 'For asking for warmth, company, or practical care without needing a full conversation.',
    invitation: 'Your partner can sit with you, send affection, or ask what would actually help.',
  },
  {
    type: 'table',
    feeling: 'I need us to talk',
    location: 'Table',
    purpose: 'For making a clear request to talk now or finding a calmer time for it.',
    invitation: 'Your partner can say they are ready, ask for time, or help begin with a short note.',
  },
  {
    type: 'rest',
    feeling: 'I’m overwhelmed or worn out',
    location: 'Resting area',
    purpose: 'For saying that your capacity is low and that it may not be about the relationship.',
    invitation: 'Your partner can remove pressure, encourage you, offer help, or send gentle affection.',
  },
  {
    type: 'romantic',
    feeling: 'I want gentle closeness',
    location: 'Bedroom',
    purpose: 'For inviting private affection while leaving plenty of room for a kind no.',
    invitation: 'Your partner can come close, return the affection, choose quiet tenderness, or decline without blame.',
  },
];

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

export interface MomentActionCopy {
  id: string;
  title: string;
  consequence: string;
  joins?: boolean;
  needsSchedule?: boolean;
}

export interface MomentDestinationCopy {
  label: string;
  headline: string;
  purpose: string;
  partnerCan: string;
  actions: MomentActionCopy[];
}

export const MOMENT_V2 = {
  neutralHeadline: 'Fire: steady',
  neutralSubtitle: 'The shared atmosphere is calm.',
  noteLabel: 'Add a note',
  notePlaceholder: 'Write one sentence…',
  noteOptional: 'The choice is complete without a note.',
  noteRemoved: 'Note removed.',
  destinations: {
    fireplace: {
      label: 'Fireplace',
      headline: 'A moment is waiting by the fire.',
      purpose: 'Make a specific request for repair, reassurance, listening, or time.',
      partnerCan: 'Your partner can meet the request directly, answer from where they are, or ask for time.',
      actions: [],
    },
    garden: {
      label: 'Garden',
      headline: 'One of you needs space.',
      purpose: 'Take space without making the distance feel like abandonment.',
      partnerCan: 'Your partner can respect the space, reassure you, or leave the door open without entering.',
      actions: [
        { id: 'respect_space', title: 'Respect the space', consequence: 'They stay in the garden alone, with no pressure to answer.' },
        { id: 'reassure_from_home', title: 'Reassure them', consequence: 'A porch light shows that you are here without entering.' },
        { id: 'leave_door_open', title: 'Leave the door open', consequence: 'Keep a gentle invitation available for when they are ready.' },
      ],
    },
    sofa: {
      label: 'Sofa',
      headline: 'One of you needs comfort.',
      purpose: 'Ask for warmth, company, affection, or one practical act of care.',
      partnerCan: 'Your partner can sit with you, send a hug, offer practical help, or care while asking for time.',
      actions: [
        { id: 'sit_together', title: 'Sit together', consequence: 'Join them on the sofa; this care response completes the moment.', joins: true },
        { id: 'send_hug', title: 'Send a hug', consequence: 'Offer affection from where you are; this completes the moment.' },
        { id: 'offer_practical_help', title: 'Offer practical help', consequence: 'Offer one real-world act of care; this completes the moment.' },
        { id: 'care_need_time', title: 'I care, and need time', consequence: 'Acknowledge the need while keeping the moment open.' },
      ],
    },
    table: {
      label: 'Table',
      headline: 'A conversation is waiting.',
      purpose: 'Make a clear request to talk.',
      partnerCan: 'Your partner can talk now or say not now without closing the request.',
      actions: [
        { id: 'talk_now', title: 'Talk now', consequence: 'Join them at the table and make room for a real conversation.', joins: true },
        { id: 'not_now', title: 'Not now', consequence: 'Keep the conversation open and come back whenever you are ready.' },
      ],
    },
    rest: {
      label: 'Rest',
      headline: 'One of you needs less pressure.',
      purpose: 'Say that your capacity is low without turning it into a diagnosis or conflict.',
      partnerCan: 'Your partner can make a tiny doodle, send a silly visitor, or send a little non-contact hug.',
      actions: [
        { id: 'rest_doodle', title: 'Make a tiny doodle', consequence: 'Draw a real 12×12 picture that remains beside the Rest nook today.' },
        { id: 'rest_visitor', title: 'Send a silly visitor', consequence: 'Choose a duck, frog, or dancing toast to keep them company.' },
        { id: 'rest_hug', title: 'Send a little hug', consequence: 'Send a warm non-contact wave and leave a tiny heart token.' },
      ],
    },
    romantic: {
      label: 'Romantic',
      headline: 'A private invitation is waiting.',
      purpose: 'Invite gentle closeness while leaving room for a clear and kind no.',
      partnerCan: 'Your partner can come close, return affection from where they are, or kindly decline.',
      actions: [
        { id: 'come_close', title: 'Come close', consequence: 'Join them for a quiet shared moment.', joins: true },
        { id: 'return_affection', title: 'Return affection', consequence: 'Send affection from where you are.' },
        { id: 'kindly_decline', title: 'Kindly decline', consequence: 'Close the invitation clearly, with no pressure or blame.' },
      ],
    },
  } satisfies Record<SignalType, MomentDestinationCopy>,
} as const;

export const FIREPLACE_MOMENT_ACTIONS: Record<FireplacePathwayId, MomentActionCopy[]> = {
  stay_close: [
    { id: 'join_by_fire', title: 'Join by the fire', consequence: 'Sit beside them and offer quiet reassurance.', joins: true },
    { id: 'offer_reassurance', title: 'Offer reassurance', consequence: 'Answer with care from where you are.' },
    { id: 'care_need_time', title: 'I care, and need time', consequence: 'Keep the moment open and choose when you can return.', needsSchedule: true },
  ],
  talk_through: [
    { id: 'talk_now_by_fire', title: 'Talk now by the fire', consequence: 'Join them and make room for a real conversation.', joins: true },
    { id: 'talk_later', title: 'Choose a return time', consequence: 'Keep the request open and commit to coming back.', needsSchedule: true },
  ],
  hear_first: [
    { id: 'listen_by_fire', title: 'Listen first', consequence: 'Join them prepared to hear them before responding.', joins: true },
  ],
  acknowledge_hurt: [
    { id: 'acknowledge_by_fire', title: 'Acknowledge it together', consequence: 'Join them by the fire and name that their hurt matters.', joins: true },
    { id: 'understand_first', title: 'Understand first', consequence: 'Acknowledge their hurt from where you are before solving anything.' },
    { id: 'care_need_time', title: 'I care, and need time', consequence: 'Keep the moment open and choose when you can return.', needsSchedule: true },
  ],
  apologize: [
    { id: 'receive_apology', title: 'Receive the apology', consequence: 'Let them know their apology reached you.' },
    { id: 'talk_by_fire', title: 'Talk by the fire', consequence: 'Join them and continue the apology in person.', joins: true },
    { id: 'appreciate_need_time', title: 'I appreciate it, and need time', consequence: 'Receive the effort while choosing a return time.', needsSchedule: true },
  ],
  more_time: [
    { id: 'respect_more_time', title: 'Respect the time', consequence: 'Reassure them that the relationship is still here without entering.' },
  ],
};
