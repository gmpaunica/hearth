// Presence arrivals and departures reuse the existing response event stream so
// they persist across app restarts and reach both phones without a native or
// database-schema change. These values are internal and never shown as a human
// response in the signal cards.
const PRESENCE_EVENT_PREFIX = '__hearth_signal_presence_v1__:';

export type SignalPresenceEvent = 'author-return' | 'leave';

export function encodeSignalPresenceEvent(event: SignalPresenceEvent): string {
  return `${PRESENCE_EVENT_PREFIX}${event}`;
}

export function decodeSignalPresenceEvent(choice: string): SignalPresenceEvent | null {
  if (!choice.startsWith(PRESENCE_EVENT_PREFIX)) return null;
  const event = choice.slice(PRESENCE_EVENT_PREFIX.length);
  return event === 'author-return' || event === 'leave' ? event : null;
}
