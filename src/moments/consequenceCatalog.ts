import type { CharacterPoseId } from '@/character/characterTypes';
import type { FireplacePathwayId, MomentDestination } from '@/lib/db';

export type MomentActionId =
  | 'come_sit'
  | 'talk_by_fire'
  | 'listen_by_fire'
  | 'hear_them_out'
  | 'not_now'
  | 'join_fireplace'
  | 'give_quiet'
  | 'leave_rose'
  | 'sit_with_them'
  | 'bring_tea'
  | 'send_hug'
  | 'talk_now'
  | 'join_table'
  | 'rest_doodle'
  | 'rest_visitor'
  | 'rest_hug'
  | 'come_close'
  | 'send_affection'
  | 'kindly_decline';

export type MomentPropType =
  | 'banked_embers'
  | 'garden_departure'
  | 'rose'
  | 'tea_tray'
  | 'heart_cushion'
  | 'waiting_mug'
  | 'second_mug'
  | 'soft_light'
  | 'folded_blanket'
  | 'tiny_drawing'
  | 'silly_visitor'
  | 'hug_token'
  | 'paired_lanterns'
  | 'gentle_light';

export type MomentMovement = 'stay' | 'join' | 'arch_then_leave';
export type MomentPersistence = 'active' | 'today' | 'terminal';

export interface MomentConsequence {
  id: MomentActionId;
  destination: MomentDestination;
  title: string;
  consequence: string;
  movement: MomentMovement;
  pose: CharacterPoseId;
  partnerPose: CharacterPoseId;
  prop: MomentPropType | null;
  anchor: MomentDestination | 'garden_arch';
  persistence: MomentPersistence;
  ending: 'open' | 'author' | 'mutual' | 'immediate';
  accessibleDescription: string;
}

const consequence = (value: MomentConsequence) => value;

export const MOMENT_CONSEQUENCES: Record<MomentActionId, MomentConsequence> = {
  come_sit: consequence({ id: 'come_sit', destination: 'fireplace', title: 'Come sit', consequence: 'Sit beside them; the fire lifts a little.', movement: 'join', pose: 'sitTogether', partnerPose: 'sitTogether', prop: null, anchor: 'fireplace', persistence: 'active', ending: 'mutual', accessibleDescription: 'You walk to the fireplace and sit beside your partner.' }),
  talk_by_fire: consequence({ id: 'talk_by_fire', destination: 'fireplace', title: 'Talk with them', consequence: 'Face them by the fire, ready to talk.', movement: 'join', pose: 'sit', partnerPose: 'sit', prop: null, anchor: 'fireplace', persistence: 'active', ending: 'mutual', accessibleDescription: 'You join your partner by the fireplace and turn toward them to talk.' }),
  listen_by_fire: consequence({ id: 'listen_by_fire', destination: 'fireplace', title: 'Listen', consequence: 'Sit angled toward them and listen first.', movement: 'join', pose: 'idle', partnerPose: 'sit', prop: null, anchor: 'fireplace', persistence: 'active', ending: 'mutual', accessibleDescription: 'You sit facing your partner at the fireplace, ready to listen.' }),
  hear_them_out: consequence({ id: 'hear_them_out', destination: 'fireplace', title: 'Hear them out', consequence: 'Meet them gently and receive the apology.', movement: 'join', pose: 'holdHands', partnerPose: 'holdHands', prop: null, anchor: 'fireplace', persistence: 'active', ending: 'mutual', accessibleDescription: 'You meet at the fireplace with open, gentle body language.' }),
  not_now: consequence({ id: 'not_now', destination: 'fireplace', title: 'Not now', consequence: 'Stay where you are; this Moment remains open so you can join later.', movement: 'stay', pose: 'idle', partnerPose: 'sit', prop: null, anchor: 'fireplace', persistence: 'active', ending: 'open', accessibleDescription: 'You remain where you are while the invitation stays open for later.' }),
  join_fireplace: consequence({ id: 'join_fireplace', destination: 'fireplace', title: 'Join them at the fire', consequence: 'Go to them now; completion choices unlock.', movement: 'join', pose: 'sitTogether', partnerPose: 'sitTogether', prop: null, anchor: 'fireplace', persistence: 'active', ending: 'mutual', accessibleDescription: 'You join your partner beside the fireplace.' }),
  give_quiet: consequence({ id: 'give_quiet', destination: 'garden', title: 'Give them quiet', consequence: 'Pause at the garden arch, then leave.', movement: 'arch_then_leave', pose: 'idle', partnerPose: 'sit', prop: 'garden_departure', anchor: 'garden_arch', persistence: 'active', ending: 'author', accessibleDescription: 'You stop at the garden arch without entering, then walk away.' }),
  leave_rose: consequence({ id: 'leave_rose', destination: 'garden', title: 'Leave a rose at the path', consequence: 'Place a rose outside the garden and leave.', movement: 'stay', pose: 'holdObject', partnerPose: 'sit', prop: 'rose', anchor: 'garden_arch', persistence: 'today', ending: 'author', accessibleDescription: 'You leave a rose at the garden path without entering the garden.' }),
  sit_with_them: consequence({ id: 'sit_with_them', destination: 'sofa', title: 'Sit with them', consequence: 'Move beside them and stay close.', movement: 'join', pose: 'sitTogether', partnerPose: 'sitTogether', prop: null, anchor: 'sofa', persistence: 'active', ending: 'author', accessibleDescription: 'You move to the sofa and sit beside your partner.' }),
  bring_tea: consequence({ id: 'bring_tea', destination: 'sofa', title: 'Bring tea', consequence: 'Leave a small tea tray without moving in.', movement: 'stay', pose: 'holdObject', partnerPose: 'sit', prop: 'tea_tray', anchor: 'sofa', persistence: 'today', ending: 'author', accessibleDescription: 'A tea tray appears beside the sofa while you remain where you are.' }),
  send_hug: consequence({ id: 'send_hug', destination: 'sofa', title: 'Send a hug', consequence: 'A warm pulse leaves a heart cushion behind.', movement: 'stay', pose: 'hug', partnerPose: 'sit', prop: 'heart_cushion', anchor: 'sofa', persistence: 'today', ending: 'author', accessibleDescription: 'A warm glow reaches your partner and a heart cushion appears on the sofa.' }),
  talk_now: consequence({ id: 'talk_now', destination: 'table', title: 'Talk now', consequence: 'Join them; a second mug appears.', movement: 'join', pose: 'sit', partnerPose: 'sit', prop: 'second_mug', anchor: 'table', persistence: 'active', ending: 'mutual', accessibleDescription: 'You join your partner at the table and a second mug appears.' }),
  join_table: consequence({ id: 'join_table', destination: 'table', title: 'Join them at the table', consequence: 'Take the waiting seat; a second mug appears.', movement: 'join', pose: 'sit', partnerPose: 'sit', prop: 'second_mug', anchor: 'table', persistence: 'active', ending: 'mutual', accessibleDescription: 'You take the second seat at the table beside a new mug.' }),
  rest_doodle: consequence({ id: 'rest_doodle', destination: 'rest', title: 'Make a tiny doodle', consequence: 'Your real 12×12 doodle will sit beside the Rest nook.', movement: 'stay', pose: 'holdObject', partnerPose: 'sit', prop: 'tiny_drawing', anchor: 'rest', persistence: 'today', ending: 'author', accessibleDescription: 'A real twelve by twelve handmade doodle appears near the resting area.' }),
  rest_visitor: consequence({ id: 'rest_visitor', destination: 'rest', title: 'Send a silly visitor', consequence: 'A duck, frog, or dancing toast will keep them quiet company.', movement: 'stay', pose: 'wave', partnerPose: 'sit', prop: 'silly_visitor', anchor: 'rest', persistence: 'today', ending: 'author', accessibleDescription: 'A silly visitor animates beside the resting area without touching the resting avatar.' }),
  rest_hug: consequence({ id: 'rest_hug', destination: 'rest', title: 'Send a little hug', consequence: 'A warm non-contact hug-wave will leave a tiny heart token.', movement: 'stay', pose: 'wave', partnerPose: 'sit', prop: 'hug_token', anchor: 'rest', persistence: 'today', ending: 'author', accessibleDescription: 'A warm hug-wave travels toward the resting avatar and leaves a small heart token.' }),
  come_close: consequence({ id: 'come_close', destination: 'romantic', title: 'Come close', consequence: 'Join them for a quiet shared glow.', movement: 'join', pose: 'holdHands', partnerPose: 'holdHands', prop: null, anchor: 'romantic', persistence: 'active', ending: 'author', accessibleDescription: 'You join your partner in the bedroom and a shared warm glow begins.' }),
  send_affection: consequence({ id: 'send_affection', destination: 'romantic', title: 'Send affection', consequence: 'Pair the lantern light from where you are.', movement: 'stay', pose: 'hug', partnerPose: 'holdHands', prop: 'paired_lanterns', anchor: 'romantic', persistence: 'today', ending: 'author', accessibleDescription: 'Paired lanterns glow in the bedroom while you remain where you are.' }),
  kindly_decline: consequence({ id: 'kindly_decline', destination: 'romantic', title: 'Kindly decline', consequence: 'Close the invitation with a gentle light change.', movement: 'stay', pose: 'wave', partnerPose: 'idle', prop: 'gentle_light', anchor: 'romantic', persistence: 'terminal', ending: 'immediate', accessibleDescription: 'The invitation closes and the bedroom light settles gently.' }),
};

export const FIREPLACE_ACTION_BY_INTENT: Record<FireplacePathwayId, MomentActionId | null> = {
  stay_close: 'come_sit',
  talk_through: 'talk_by_fire',
  hear_first: 'listen_by_fire',
  acknowledge_hurt: 'hear_them_out',
  apologize: 'hear_them_out',
  more_time: null,
};

export const DESTINATION_ACTIONS: Record<MomentDestination, MomentActionId[]> = {
  fireplace: [],
  garden: ['give_quiet', 'leave_rose'],
  sofa: ['sit_with_them', 'bring_tea', 'send_hug'],
  table: ['talk_now', 'not_now'],
  rest: ['rest_doodle', 'rest_visitor', 'rest_hug'],
  romantic: ['come_close', 'send_affection', 'kindly_decline'],
};

export function consequencesFor(destination: MomentDestination, intent: FireplacePathwayId | null) {
  if (destination === 'fireplace') {
    const joining = intent ? FIREPLACE_ACTION_BY_INTENT[intent] : null;
    return [joining, 'not_now']
      .filter((id): id is MomentActionId => id != null)
      .map((id) => MOMENT_CONSEQUENCES[id]);
  }
  return DESTINATION_ACTIONS[destination].map((id) => MOMENT_CONSEQUENCES[id]);
}

export function consequenceFor(id: string | null | undefined) {
  return id && id in MOMENT_CONSEQUENCES
    ? MOMENT_CONSEQUENCES[id as MomentActionId]
    : null;
}
