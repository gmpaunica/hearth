import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  FIREPLACE_PATHWAYS,
  MOMENT_FEELINGS,
  RETURN_OPTIONS,
  SIGNALS,
  type FireplacePathwayId,
  type MomentFeelingCopy,
  type SignalType,
} from '@/copy';
import { useSignalStore } from '@/state/signalStore';
import { editorial } from '@/theme/hearth';

type ReturnOption = (typeof RETURN_OPTIONS)[number]['id'];

function returnDate(option: ReturnOption): Date | null {
  const now = new Date();
  if (option === 'when_ready') return null;
  if (option === 'one_hour') return new Date(now.getTime() + 60 * 60 * 1000);
  if (option === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    return tomorrow;
  }
  const tonight = new Date(now);
  tonight.setHours(20, 0, 0, 0);
  return tonight.getTime() > now.getTime() + 30 * 60 * 1000
    ? tonight
    : new Date(now.getTime() + 2 * 60 * 60 * 1000);
}

function placePreposition(type: SignalType): string {
  return type === 'garden' ? 'in' : 'at';
}

function FeelingChoice({
  choice,
  onPress,
}: {
  choice: MomentFeelingCopy;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${choice.feeling}. Goes to the ${choice.location}.`}
      accessibilityHint={choice.purpose}
      onPress={onPress}
      style={({ pressed }) => [styles.feelingChoice, pressed && styles.pressed]}
    >
      <View style={styles.feelingRule} />
      <View style={styles.feelingCopy}>
        <Text style={styles.feelingTitle}>{choice.feeling}</Text>
        <Text style={styles.feelingPurpose}>{choice.purpose}</Text>
        <Text style={styles.destination}>Opens {placePreposition(choice.type)} the {choice.location}</Text>
      </View>
      <Text style={styles.chooseLabel}>Choose</Text>
    </Pressable>
  );
}

export function SignalSheet({
  onCancel,
  onSent,
  relatedToSignalId = null,
}: {
  onCancel: () => void;
  onSent: () => void;
  relatedToSignalId?: string | null;
}) {
  const [selectedType, setSelectedType] = useState<SignalType | null>(null);
  const [timingPathway, setTimingPathway] = useState<FireplacePathwayId | null>(null);
  const [returnOption, setReturnOption] = useState<ReturnOption>('one_hour');
  const busy = useSignalStore((state) => state.busyAction === 'start');
  const serverError = useSignalStore((state) => state.error);
  const startInteraction = useSignalStore((state) => state.startInteraction);
  const selectedFeeling = MOMENT_FEELINGS.find((choice) => choice.type === selectedType) ?? null;

  const send = async (
    type: SignalType,
    pathway?: FireplacePathwayId,
    returnAt: Date | null = null,
  ) => {
    const sent = await startInteraction({
      type,
      pathway,
      returnAt,
      connectToSignalId: relatedToSignalId,
    });
    if (sent) onSent();
  };

  const goBack = () => {
    if (timingPathway) {
      setTimingPathway(null);
      return;
    }
    if (selectedType) {
      setSelectedType(null);
      return;
    }
    onCancel();
  };

  if (timingPathway && selectedFeeling) {
    return (
      <View style={styles.detailPane}>
        <Text style={styles.routeEyebrow}>Fireplace · a cared-for pause</Text>
        <Text style={styles.detailTitle}>When should this moment return?</Text>
        <Text style={styles.detailPurpose}>
          “More time” keeps the relationship present while giving you breathing room.
        </Text>
        <View accessibilityRole="radiogroup" style={styles.timeList}>
          {RETURN_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: returnOption === option.id }}
              accessibilityLabel={option.label}
              onPress={() => setReturnOption(option.id)}
              style={({ pressed }) => [
                styles.timeChoice,
                returnOption === option.id && styles.timeChoiceOn,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.radioMark, returnOption === option.id && styles.radioMarkOn]} />
              <Text style={[styles.timeText, returnOption === option.id && styles.timeTextOn]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {!!serverError && <Text accessibilityRole="alert" style={styles.error}>{serverError}</Text>}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send More time, still us"
          disabled={busy}
          onPress={() => void send('fireplace', timingPathway, returnDate(returnOption))}
          style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryPressed, busy && styles.disabled]}
        >
          {busy
            ? <ActivityIndicator color={editorial.onAccent} />
            : <Text style={styles.primaryActionText}>Leave this moment by the fire</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to fireplace needs" onPress={goBack} style={styles.textAction}>
          <Text style={styles.textActionLabel}>Back to what you need</Text>
        </Pressable>
      </View>
    );
  }

  if (selectedFeeling) {
    const isFireplace = selectedFeeling.type === 'fireplace';
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.detailPane} showsVerticalScrollIndicator={false}>
        <Text style={styles.routeEyebrow}>
          {selectedFeeling.location} · {isFireplace ? 'repair and reconnection' : 'a clear emotional signal'}
        </Text>
        <Text style={styles.detailTitle}>{selectedFeeling.feeling}</Text>
        <Text style={styles.detailPurpose}>{selectedFeeling.purpose}</Text>
        <View style={styles.meaningNote}>
          <Text style={styles.meaningLabel}>What this makes possible</Text>
          <Text style={styles.meaningText}>{selectedFeeling.invitation}</Text>
        </View>

        {isFireplace ? (
          <>
            <Text style={styles.sectionTitle}>What would help most?</Text>
            <Text style={styles.sectionHint}>Choose one. Your partner will see the need, not a diagnosis.</Text>
            <View style={styles.intentList}>
              {FIREPLACE_PATHWAYS.map((pathway) => (
                <Pressable
                  key={pathway.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${pathway.title}. ${pathway.senderText}`}
                  disabled={busy}
                  onPress={() => {
                    if (pathway.id === 'more_time') setTimingPathway(pathway.id);
                    else void send('fireplace', pathway.id);
                  }}
                  style={({ pressed }) => [styles.intentChoice, pressed && styles.pressed, busy && styles.disabled]}
                >
                  <View style={styles.intentRule} />
                  <View style={styles.intentCopy}>
                    <Text style={styles.intentTitle}>{pathway.title}</Text>
                    <Text style={styles.intentMeaning}>{pathway.senderText}</Text>
                  </View>
                  <Text style={styles.chooseLabel}>{pathway.id === 'more_time' ? 'Set time' : 'Send'}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.signalSummary}>
              <Text style={styles.meaningLabel}>What your partner understands</Text>
              <Text style={styles.signalQuote}>“{SIGNALS[selectedFeeling.type].selfText}”</Text>
              <Text style={styles.signalSupport}>{selectedFeeling.invitation}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Leave this moment ${placePreposition(selectedFeeling.type)} the ${selectedFeeling.location}`}
              disabled={busy}
              onPress={() => void send(selectedFeeling.type)}
              style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryPressed, busy && styles.disabled]}
            >
              {busy
                ? <ActivityIndicator color={editorial.onAccent} />
                : (
                  <View>
                    <Text style={styles.primaryActionText}>Leave this moment</Text>
                    <Text style={styles.primaryActionSubtext}>
                      Your avatar goes {placePreposition(selectedFeeling.type)} the {selectedFeeling.location.toLowerCase()}
                    </Text>
                  </View>
                )}
            </Pressable>
          </>
        )}

        {!!serverError && <Text accessibilityRole="alert" style={styles.error}>{serverError}</Text>}
        <Text style={styles.privacy}>
          Where a moment offers a sentence, it stays optional and never appears in notifications.
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose a different feeling" onPress={goBack} style={styles.textAction}>
          <Text style={styles.textActionLabel}>Choose a different feeling</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.introTitle}>What would help right now?</Text>
      <Text style={styles.introCopy}>
        Choose the closest feeling. Hearth will show where the moment lives and what it asks from your partner.
      </Text>
      <View style={styles.feelingList}>
        {MOMENT_FEELINGS.map((choice) => (
          <FeelingChoice key={choice.type} choice={choice} onPress={() => setSelectedType(choice.type)} />
        ))}
      </View>
      <Text style={styles.privacy}>
        These are choices, not labels or judgments. Pick the nearest one and keep the words your own.
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancel new moment" onPress={goBack} style={styles.textAction}>
        <Text style={styles.textActionLabel}>Not now</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 3, paddingBottom: 4 },
  introTitle: {
    color: editorial.ink,
    fontFamily: 'serif',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  introCopy: {
    color: editorial.inkSoft,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 11,
    paddingHorizontal: 16,
  },
  feelingList: { gap: 7 },
  feelingChoice: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: editorial.paperStrong,
    borderWidth: 1,
    borderColor: editorial.line,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  feelingRule: { alignSelf: 'stretch', width: 3, borderRadius: 2, backgroundColor: editorial.clay, marginRight: 10 },
  feelingCopy: { flex: 1 },
  feelingTitle: { color: editorial.ink, fontFamily: 'serif', fontSize: 15, lineHeight: 19, fontWeight: '700' },
  feelingPurpose: { color: editorial.inkSoft, fontSize: 9, lineHeight: 13, marginTop: 2 },
  destination: { color: editorial.sage, fontSize: 8, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 5 },
  chooseLabel: { color: editorial.clay, fontSize: 9, fontWeight: '900', marginLeft: 8 },
  detailPane: { paddingHorizontal: 5, paddingBottom: 4 },
  routeEyebrow: { color: editorial.clay, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase', textAlign: 'center', marginTop: 2 },
  detailTitle: { color: editorial.ink, fontFamily: 'serif', fontSize: 23, lineHeight: 28, fontWeight: '700', textAlign: 'center', marginTop: 5 },
  detailPurpose: { color: editorial.inkSoft, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 5, paddingHorizontal: 12 },
  meaningNote: { backgroundColor: editorial.sageSoft, borderLeftWidth: 3, borderLeftColor: editorial.sage, borderRadius: 10, padding: 11, marginTop: 12 },
  meaningLabel: { color: editorial.sage, fontSize: 8, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  meaningText: { color: editorial.inkSoft, fontSize: 10, lineHeight: 15, marginTop: 4 },
  sectionTitle: { color: editorial.ink, fontFamily: 'serif', fontSize: 16, fontWeight: '700', marginTop: 13, textAlign: 'center' },
  sectionHint: { color: editorial.inkFaint, fontSize: 9, lineHeight: 13, textAlign: 'center', marginTop: 2, marginBottom: 7 },
  intentList: { gap: 6 },
  intentChoice: { minHeight: 59, flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 9, backgroundColor: editorial.paperStrong, borderWidth: 1, borderColor: editorial.line },
  intentRule: { alignSelf: 'stretch', width: 3, borderRadius: 2, backgroundColor: editorial.gold, marginRight: 9 },
  intentCopy: { flex: 1 },
  intentTitle: { color: editorial.ink, fontSize: 11, lineHeight: 14, fontWeight: '900' },
  intentMeaning: { color: editorial.inkSoft, fontSize: 9, lineHeight: 13, marginTop: 2 },
  signalSummary: { backgroundColor: editorial.paperTint, borderRadius: 12, borderWidth: 1, borderColor: editorial.line, padding: 12, marginTop: 12 },
  signalQuote: { color: editorial.ink, fontFamily: 'serif', fontSize: 15, lineHeight: 20, marginTop: 5 },
  signalSupport: { color: editorial.inkSoft, fontSize: 10, lineHeight: 15, marginTop: 6 },
  primaryAction: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: editorial.clay, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12, borderBottomWidth: 3, borderBottomColor: editorial.clayDark, shadowColor: editorial.shadow, shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  primaryPressed: { opacity: 0.9, transform: [{ translateY: 2 }], borderBottomWidth: 1 },
  primaryActionText: { color: editorial.onAccent, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  primaryActionSubtext: { color: 'rgba(255, 250, 242, 0.78)', fontSize: 8, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  timeList: { gap: 6, marginTop: 13 },
  timeChoice: { minHeight: 44, flexDirection: 'row', alignItems: 'center', borderRadius: 11, paddingHorizontal: 12, backgroundColor: editorial.paperStrong, borderWidth: 1, borderColor: editorial.line },
  timeChoiceOn: { backgroundColor: editorial.clayWash, borderColor: editorial.lineStrong },
  radioMark: { width: 15, height: 15, borderRadius: 5, borderWidth: 1, borderColor: editorial.inkFaint, marginRight: 9 },
  radioMarkOn: { backgroundColor: editorial.clay, borderColor: editorial.clayDark },
  timeText: { color: editorial.inkSoft, fontSize: 11, fontWeight: '700' },
  timeTextOn: { color: editorial.clayDark, fontWeight: '900' },
  textAction: { alignSelf: 'center', minHeight: 40, justifyContent: 'center', paddingHorizontal: 10, marginTop: 5 },
  textActionLabel: { color: editorial.clayDark, fontSize: 10, fontWeight: '800', textDecorationLine: 'underline' },
  privacy: { color: editorial.inkFaint, fontSize: 8, lineHeight: 12, textAlign: 'center', marginTop: 10, paddingHorizontal: 18 },
  error: { color: editorial.danger, fontSize: 10, textAlign: 'center', marginTop: 8 },
  pressed: { opacity: 0.74, transform: [{ translateY: 1 }] },
  disabled: { opacity: 0.48 },
});
