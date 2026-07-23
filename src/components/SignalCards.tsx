import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RECONCILIATION, SIGNALS } from '@/copy';
import { useSignalStore } from '@/state/signalStore';
import { ui } from '@/theme/hearth';
import { PopIn } from './PopIn';

/** My active signal: quoted self-copy at the top, with a gentle take-back. */
export function MySignalCard() {
  const mySignal = useSignalStore((s) => s.mySignal);
  const cancel = useSignalStore((s) => s.cancelMySignal);
  if (!mySignal) return null;

  return (
    <PopIn style={styles.topCard}>
      <Text style={styles.quote}>“{SIGNALS[mySignal.type].selfText}”</Text>
      {mySignal.response ? (
        <>
          <Text style={styles.responseLine}>They answered: “{mySignal.response}”</Text>
          {/* Always a way forward, whatever they answered — close the signal. */}
          <Pressable onPress={cancel} hitSlop={6}>
            <Text style={styles.takeBack}>Okay</Text>
          </Pressable>
        </>
      ) : (
        <Pressable onPress={cancel} hitSlop={6}>
          <Text style={styles.takeBack}>Take it back</Text>
        </Pressable>
      )}
    </PopIn>
  );
}

/** Partner's signal: privacy-safe partner copy plus the soft response options. */
export function PartnerSignalCard() {
  const partnerSignal = useSignalStore((s) => s.partnerSignal);
  const respond = useSignalStore((s) => s.respondToPartner);
  if (!partnerSignal) return null;
  const copy = SIGNALS[partnerSignal.type];

  return (
    <PopIn style={styles.bottomCard}>
      <Text style={styles.partnerText}>{copy.partnerText}</Text>
      {partnerSignal.response ? (
        <Text style={styles.responseLine}>You answered: “{partnerSignal.response}”</Text>
      ) : (
        <View style={styles.choices}>
          {copy.responses.map((r) => (
            <Pressable key={r} style={styles.choice} onPress={() => respond(r)}>
              <Text style={styles.choiceText}>{r}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </PopIn>
  );
}

/** The fireplace moment: both seated, the prompt, three ways forward. */
export function ReconciliationPrompt() {
  const reconciling = useSignalStore((s) => s.reconciling);
  const choose = useSignalStore((s) => s.chooseReconciliation);
  if (!reconciling) return null;

  return (
    <PopIn style={styles.centerCard}>
      <Text style={styles.prompt}>{RECONCILIATION.prompt}</Text>
      {RECONCILIATION.choices.map((c) => (
        <Pressable key={c} style={styles.choiceWide} onPress={() => choose(c)}>
          <Text style={styles.choiceText}>{c}</Text>
        </Pressable>
      ))}
    </PopIn>
  );
}

const card = {
  backgroundColor: ui.overlayBg,
  borderColor: ui.overlayBorder,
  borderWidth: 1,
  borderRadius: 22,
} as const;

const styles = StyleSheet.create({
  topCard: {
    ...card,
    position: 'absolute',
    top: 64,
    alignSelf: 'center',
    maxWidth: 320,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  quote: { color: ui.text, fontSize: 15, fontStyle: 'italic', textAlign: 'center' },
  takeBack: { color: ui.textDim, fontSize: 12, marginTop: 6 },
  responseLine: { color: ui.accent, fontSize: 13, fontStyle: 'italic', marginTop: 6 },
  bottomCard: {
    ...card,
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 86,
    padding: 14,
  },
  partnerText: { color: ui.text, fontSize: 14, marginBottom: 10, textAlign: 'center' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  choice: {
    backgroundColor: ui.chipBg,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  choiceWide: {
    backgroundColor: ui.chipBg,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  choiceText: { color: ui.text, fontSize: 14 },
  centerCard: {
    ...card,
    position: 'absolute',
    alignSelf: 'center',
    top: '34%',
    width: 280,
    padding: 18,
    alignItems: 'center',
  },
  prompt: { color: ui.text, fontSize: 16, textAlign: 'center', marginBottom: 6 },
});
