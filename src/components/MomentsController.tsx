/* eslint-disable react-hooks/immutability -- Reanimated shared values are
 * intentionally mutated from UI-thread gesture worklets. */
import { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  FIREPLACE_PATHWAYS,
  MOMENT_FEELINGS,
  MOMENT_V2,
  type FireplacePathwayId,
  type SignalType,
} from '@/copy';
import type { MomentParticipantV2, MomentSnapshotV2 } from '@/lib/db';
import type { MomentConsequence } from '@/moments/consequenceCatalog';
import {
  momentStatusCopy,
  participantFor,
  partnerParticipant,
  responseActionsFor,
} from '@/state/momentV2Model';
import { useMomentV2Store } from '@/state/momentV2Store';
import {
  clampMomentSheetY,
  momentSheetProgress,
  resolveMomentSheetExpanded,
} from '@/state/momentSheetPhysics';
import { requestMomentCameraFocus } from '@/scene/cameraState';
import { useMomentsSurfaceStore } from '@/state/momentsSurfaceStore';
import { useSceneStore } from '@/state/sceneStore';
import { editorial, hearthUi, momentsTypography } from '@/theme/hearth';
import { MomentNoteComposer } from './MomentNoteComposer';
import { MomentConsequencePreview } from './MomentConsequencePreview';
import { MomentFeelingBanner } from './MomentVignette';
import { RestResponseComposer } from './RestResponseComposer';

const CREATOR_INTENTS = FIREPLACE_PATHWAYS.filter((pathway) =>
  ['stay_close', 'talk_through', 'hear_first', 'apologize'].includes(pathway.id));

function PrimaryButton({ label, onPress, disabled = false }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <View pointerEvents="none" style={styles.primaryHighlight} />
      <Text style={styles.primaryHeart}>♥</Text>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function StepPill({ current, total }: { current: number; total: number }) {
  return (
    <View accessibilityLabel={`Step ${current} of ${total}`} style={styles.stepPill}>
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={[styles.stepDot, index < current && styles.stepDotOn]} />
      ))}
      <Text style={styles.stepText}>{current} of {total}</Text>
    </View>
  );
}

function SecondaryButton({ label, onPress, disabled = false }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function CreationFlow({ onSent }: { onSent: () => void }) {
  const [destination, setDestination] = useState<SignalType | null>(null);
  const [intent, setIntent] = useState<FireplacePathwayId | null>(null);
  const [note, setNote] = useState('');
  const startMoment = useMomentV2Store((state) => state.startMoment);
  const busy = useMomentV2Store((state) => state.busyAction != null);
  const error = useMomentV2Store((state) => state.error);

  if (!destination) {
    const aboutUs = MOMENT_FEELINGS.filter((feeling) => ['fireplace', 'table', 'romantic'].includes(feeling.type));
    const whatINeed = MOMENT_FEELINGS.filter((feeling) => ['garden', 'sofa', 'rest'].includes(feeling.type));
    return (
      <View>
        <StepPill current={1} total={2} />
        <Text style={styles.pageTitle}>How do you feel right now?</Text>
        <View style={styles.bannerList}>
          <Text style={styles.feelingSection}>About us</Text>
          {aboutUs.map((feeling) => (
            <MomentFeelingBanner
              key={feeling.type}
              destination={feeling.type}
              title={feeling.feeling}
              location={feeling.location}
              onPress={() => setDestination(feeling.type)}
            />
          ))}
          <Text style={styles.feelingSection}>What I need</Text>
          {whatINeed.map((feeling) => (
            <MomentFeelingBanner
              key={feeling.type}
              destination={feeling.type}
              title={feeling.feeling}
              location={feeling.location}
              onPress={() => setDestination(feeling.type)}
            />
          ))}
        </View>
      </View>
    );
  }

  const config = MOMENT_V2.destinations[destination];
  const canSend = destination !== 'fireplace' || intent != null;
  return (
    <View>
      <StepPill current={2} total={2} />
      <Text style={styles.eyebrow}>{config.label}</Text>
      <Text style={styles.pageTitle}>Choose what you need</Text>
      {destination === 'fireplace' && (
        <View style={styles.optionList}>
          {CREATOR_INTENTS.map((pathway) => (
            <Pressable
              key={pathway.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: intent === pathway.id }}
              onPress={() => setIntent(pathway.id)}
              style={({ pressed }) => [
                styles.actionRow,
                intent === pathway.id && styles.actionRowSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.actionTitle}>{pathway.title}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <MomentNoteComposer value={note} onChange={setNote} />
      <PrimaryButton
        label="Send moment"
        disabled={busy || !canSend}
        onPress={() => {
          void startMoment({ type: destination, intent, note }).then((ok) => {
            if (ok) onSent();
          });
        }}
      />
      <SecondaryButton label="Choose another place" onPress={() => { setDestination(null); setIntent(null); }} />
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

function SentNote({ participant, ownerLabel, mine, busy, onRemove }: {
  participant: MomentParticipantV2;
  ownerLabel: string;
  mine: boolean;
  busy: boolean;
  onRemove: () => void;
}) {
  if (!participant.note && !participant.note_removed) return null;
  return (
    <View style={styles.sentNote}>
      <Text style={styles.reviewLabel}>{ownerLabel}</Text>
      <Text style={participant.note_removed ? styles.removedNote : styles.noteText}>
        {participant.note_removed ? MOMENT_V2.noteRemoved : participant.note}
      </Text>
      {mine && participant.note && (
        <Pressable accessibilityRole="button" disabled={busy} onPress={onRemove} style={styles.inlineButton}>
          <Text style={styles.inlineDanger}>Remove note</Text>
        </Pressable>
      )}
    </View>
  );
}

function ResponseComposer({ action, onBack, onConfirm, busy }: {
  action: MomentConsequence;
  onBack: () => void;
  onConfirm: (note: string) => void;
  busy: boolean;
}) {
  const [note, setNote] = useState('');
  return (
    <View style={styles.responseComposer}>
      <Text style={styles.sectionLabel}>{action.title}</Text>
      <MomentConsequencePreview actionId={action.id} />
      <MomentNoteComposer value={note} onChange={setNote} />
      <PrimaryButton label={action.title} disabled={busy} onPress={() => onConfirm(note)} />
      <SecondaryButton label="Choose another response" onPress={onBack} />
    </View>
  );
}

const RESOLUTION_LABEL: Record<string, string> = {
  resolve_table: 'We talked — resolve',
  resolve_garden: 'I’m ready to come back',
  resolve_sofa: 'I feel cared for',
  resolve_rest: 'I’m feeling ready',
  resolve_romantic: 'Close this moment warmly',
};

function PinnedActionCard({ snapshot, onCollapse }: {
  snapshot: MomentSnapshotV2;
  onCollapse: () => void;
}) {
  const active = snapshot.active!;
  const kind = snapshot.personal_action.kind;
  const busy = useMomentV2Store((state) => state.busyAction != null);
  const join = useMomentV2Store((state) => state.joinMoment);
  const resolveMoment = useMomentV2Store((state) => state.resolveMoment);
  const run = (work: Promise<boolean>) => void work.then((ok) => { if (ok) onCollapse(); });
  const showReconnectHeart = () => {
    onCollapse();
    requestMomentCameraFocus('fireplace', useSceneStore.getState().reduceMotion);
  };

  let title = 'Waiting gently';
  if (kind.startsWith('respond_')) title = 'Choose your response below';
  else if (kind === 'join_fireplace') title = 'Ready now? Join them at the fire';
  else if (kind === 'join_table') title = 'Ready now? Join them at the table';
  else if (kind === 'confirm_fireplace') title = 'The heart above the fireplace is waiting';
  else if (kind in RESOLUTION_LABEL) title = RESOLUTION_LABEL[kind];
  else if (active.author_id === snapshot.identity.user_id) title = `Waiting for ${snapshot.identity.partner_name}`;

  return (
    <View accessibilityRole="summary" style={styles.pinnedAction}>
      <View pointerEvents="none" style={styles.pinnedTape} />
      <Text style={styles.nextEyebrow}>Next for you</Text>
      <Text style={styles.nextTitle}>{title}</Text>
      {(kind === 'join_fireplace' || kind === 'join_table') && (
        <PrimaryButton label={kind === 'join_fireplace' ? 'Join them at the fire' : 'Join them at the table'} disabled={busy} onPress={() => run(join(active.signal_id))} />
      )}
      {kind === 'confirm_fireplace' && (
        <SecondaryButton label="Show reconnect heart" onPress={showReconnectHeart} />
      )}
      {kind in RESOLUTION_LABEL && (
        <PrimaryButton label={RESOLUTION_LABEL[kind]} disabled={busy} onPress={() => run(resolveMoment(active.signal_id))} />
      )}
    </View>
  );
}

function ActiveMomentView({ snapshot, onCollapse }: { snapshot: MomentSnapshotV2; onCollapse: () => void }) {
  const active = snapshot.active!;
  const config = MOMENT_V2.destinations[active.destination];
  const [selectedAction, setSelectedAction] = useState<MomentConsequence | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const respond = useMomentV2Store((state) => state.respondToMoment);
  const respondToRest = useMomentV2Store((state) => state.respondToRestMoment);
  const removeNote = useMomentV2Store((state) => state.removeNote);
  const cancelMoment = useMomentV2Store((state) => state.cancelMoment);
  const leaveMoment = useMomentV2Store((state) => state.leaveMoment);
  const returnToMoment = useMomentV2Store((state) => state.returnToMoment);
  const busy = useMomentV2Store((state) => state.busyAction != null);
  const error = useMomentV2Store((state) => state.error);
  const mine = participantFor(snapshot, snapshot.identity.user_id);
  const partner = partnerParticipant(snapshot);
  const invited = active.author_id !== snapshot.identity.user_id;
  const myPresence = snapshot.presence.find((row) => row.user_id === snapshot.identity.user_id && row.is_present);
  const canReturn = !!mine?.joined_at && !myPresence;
  const responseActions = responseActionsFor(active);

  if (selectedAction) {
    if (selectedAction.destination === 'rest') {
      return (
        <RestResponseComposer
          action={selectedAction}
          busy={busy}
          onBack={() => setSelectedAction(null)}
          onConfirm={(input) => {
            void respondToRest(active.signal_id, input).then((ok) => {
              if (ok) { setSelectedAction(null); onCollapse(); }
            });
          }}
        />
      );
    }
    return (
      <ResponseComposer
        action={selectedAction}
        busy={busy}
        onBack={() => setSelectedAction(null)}
        onConfirm={(note) => {
          void respond(active.signal_id, { action: selectedAction.id, note }).then((ok) => {
            if (ok) { setSelectedAction(null); onCollapse(); }
          });
        }}
      />
    );
  }

  return (
    <View>
      <Text style={styles.eyebrow}>{config.label}</Text>
      <Text style={styles.pageTitle}>{config.headline}</Text>
      {active.destination === 'fireplace' && active.intent && (
        <Text style={styles.body}>{FIREPLACE_PATHWAYS.find((pathway) => pathway.id === active.intent)?.title}</Text>
      )}

      {mine && <SentNote participant={mine} ownerLabel="Your note" mine busy={busy} onRemove={() => void removeNote(active.signal_id)} />}
      {partner && <SentNote participant={partner} ownerLabel={`${snapshot.identity.partner_name}’s note`} mine={false} busy={busy} onRemove={() => {}} />}

      {invited && snapshot.personal_action.kind.startsWith('respond_') && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Choose one response</Text>
          {responseActions.map((action) => (
            <Pressable key={action.id} accessibilityRole="button" onPress={() => setSelectedAction(action)} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionConsequence}>{action.consequence}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {partner?.response_action && (
        <View style={styles.responseSummary}>
          <Text style={styles.sectionLabel}>{snapshot.identity.partner_name} responded</Text>
          <Text style={styles.responseTitle}>
            {responseActions.find((action) => action.id === partner.response_action)?.title ?? partner.response_action}
          </Text>
        </View>
      )}

      <View style={styles.locationSection}>
        <Text style={styles.sectionLabel}>Your location</Text>
        {myPresence ? (
          <SecondaryButton label={`Leave the ${config.label.toLowerCase()}`} disabled={busy} onPress={() => void leaveMoment(active.signal_id)} />
        ) : canReturn ? (
          <SecondaryButton label={`Return to ${config.label.toLowerCase()}`} disabled={busy} onPress={() => void returnToMoment(active.signal_id)} />
        ) : <Text style={styles.body}>You are staying where you are.</Text>}
      </View>

      {!invited && (
        <View style={styles.cancelSection}>
          {!confirmCancel ? (
            <Pressable accessibilityRole="button" onPress={() => setConfirmCancel(true)} style={styles.inlineButton}>
              <Text style={styles.inlineDanger}>Cancel this moment</Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.body}>Cancel without marking this resolved?</Text>
              <PrimaryButton label="Confirm cancellation" disabled={busy} onPress={() => {
                void cancelMoment(active.signal_id).then((ok) => { if (ok) onCollapse(); });
              }} />
              <SecondaryButton label="Keep moment open" onPress={() => setConfirmCancel(false)} />
            </>
          )}
        </View>
      )}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const OUTCOME_COPY: Record<string, string> = {
  fireplace_reconnected: 'You both felt ready to reconnect.',
  garden_ready: 'The garden moment ended warmly.',
  sofa_care: 'Care was felt.',
  table_talked: 'The conversation was talked through.',
  rest_ready: 'The resting moment ended gently.',
  romantic_remote_affection: 'Affection was shared.',
  romantic_declined: 'The invitation closed kindly.',
};

function EmptyMoments({ snapshot, onNew }: { snapshot: MomentSnapshotV2 | null; onNew: () => void }) {
  return (
    <View>
      <View style={styles.emptyKeepsake}>
        <View style={styles.emptyFlower}>
          <View style={[styles.emptyPetal, styles.emptyPetalTop]} />
          <View style={[styles.emptyPetal, styles.emptyPetalLeft]} />
          <View style={[styles.emptyPetal, styles.emptyPetalRight]} />
          <View style={styles.emptyFlowerCenter} />
        </View>
        <View style={styles.emptyKeepsakeCopy}>
          <Text style={styles.emptyKeepsakeTitle}>A small place to meet</Text>
          <Text style={styles.emptyKeepsakeBody}>Choose a feeling and Hearth will give it a real place in your home.</Text>
        </View>
      </View>
      <Text style={styles.pageTitle}>Shared moments</Text>
      <PrimaryButton label="New moment" onPress={onNew} />
      {!!snapshot?.today_outcomes.length && (
        <View style={styles.earlierSection}>
          <Text style={styles.sectionLabel}>Today</Text>
          {snapshot.today_outcomes.map((outcome) => (
            <View key={outcome.signal_id} style={styles.outcomeRow}>
              <Text style={styles.actionTitle}>{MOMENT_V2.destinations[outcome.destination].label}</Text>
              <Text style={styles.actionConsequence}>{OUTCOME_COPY[outcome.terminal_reason] ?? 'This moment ended gently.'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function MomentsController() {
  const expanded = useMomentsSurfaceStore((state) => state.expanded);
  const view = useMomentsSurfaceStore((state) => state.view);
  const openMoments = useMomentsSurfaceStore((state) => state.openMoments);
  const openComposer = useMomentsSurfaceStore((state) => state.openComposer);
  const minimize = useMomentsSurfaceStore((state) => state.minimize);
  const snapshot = useMomentV2Store((state) => state.snapshot);
  const loading = useMomentV2Store((state) => state.loading);
  const resumePlayback = useMomentV2Store((state) => state.resumePlayback);
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const expandedY = Math.max(insets.top + 116, 132);
  const dockHeight = 48;
  const dockedY = height - insets.bottom - dockHeight;
  const expandedWidth = width - 20;
  const dockedWidth = Math.min(214, Math.max(144, width - 176));
  const sheetY = useSharedValue(dockedY);
  const dragStartY = useSharedValue(dockedY);
  const draggingSheet = useSharedValue(0);
  const transferStartY = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const status = momentStatusCopy(snapshot);

  const setSheetExpanded = useCallback((next: boolean) => {
    if (next) {
      if (snapshot?.active) openMoments();
      else openComposer();
    } else {
      minimize();
    }
  }, [minimize, openComposer, openMoments, snapshot?.active]);

  useEffect(() => {
    const target = expanded ? expandedY : dockedY;
    sheetY.value = withTiming(
      target,
      {
        duration: expanded ? 260 : 220,
        easing: expanded ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      },
      (finished) => {
        if (finished && !expanded) runOnJS(resumePlayback)();
      },
    );
  }, [dockedY, expanded, expandedY, resumePlayback, sheetY]);

  useEffect(() => {
    if (!expanded) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { minimize(); return true; });
    return () => subscription.remove();
  }, [expanded, minimize]);

  const sheetStyle = useAnimatedStyle(() => {
    const progress = momentSheetProgress(sheetY.value, expandedY, dockedY);
    const animatedWidth = interpolate(progress, [0, 1], [dockedWidth, expandedWidth]);
    return {
      left: (width - animatedWidth) / 2,
      width: animatedWidth,
      borderRadius: interpolate(progress, [0, 1], [24, 18]),
      transform: [{ translateY: sheetY.value }],
    };
  });
  const scrimStyle = useAnimatedStyle(() => {
    const progress = momentSheetProgress(sheetY.value, expandedY, dockedY);
    return { opacity: progress * 0.46 };
  });
  const nativeScroll = Gesture.Native();
  const contentPan = Gesture.Pan()
    .simultaneousWithExternalGesture(nativeScroll)
    .activeOffsetY([-6, 6])
    .failOffsetX([-28, 28])
    .onBegin(() => {
      dragStartY.value = sheetY.value;
      draggingSheet.value = 0;
      transferStartY.value = scrollY.value <= 0 ? 0 : 1_000_000;
    })
    .onUpdate((event) => {
      const dockSurface = dragStartY.value > expandedY + 2;
      const transferFromList = scrollY.value <= 0 && event.translationY > 0;
      if (!dockSurface && !transferFromList) return;
      draggingSheet.value = 1;
      if (!dockSurface && transferStartY.value > 999_999) {
        transferStartY.value = event.translationY;
        dragStartY.value = sheetY.value;
      }
      const delta = dockSurface ? event.translationY : event.translationY - transferStartY.value;
      sheetY.value = clampMomentSheetY(dragStartY.value + delta, expandedY, dockedY);
    })
    .onFinalize((event) => {
      if (!draggingSheet.value) return;
      const nextExpanded = resolveMomentSheetExpanded(
        sheetY.value,
        event.velocityY,
        expandedY,
        dockedY,
      );
      const target = nextExpanded ? expandedY : dockedY;
      sheetY.value = withTiming(target, { duration: 220, easing: Easing.out(Easing.cubic) });
      runOnJS(setSheetExpanded)(nextExpanded);
    });
  const headerPan = Gesture.Pan()
    .activeOffsetY([-4, 4])
    .failOffsetX([-28, 28])
    .onBegin(() => {
      dragStartY.value = sheetY.value;
      draggingSheet.value = 1;
    })
    .onUpdate((event) => {
      sheetY.value = clampMomentSheetY(dragStartY.value + event.translationY, expandedY, dockedY);
    })
    .onFinalize((event) => {
      const nextExpanded = resolveMomentSheetExpanded(
        sheetY.value,
        event.velocityY,
        expandedY,
        dockedY,
      );
      sheetY.value = withTiming(nextExpanded ? expandedY : dockedY, { duration: 220, easing: Easing.out(Easing.cubic) });
      runOnJS(setSheetExpanded)(nextExpanded);
    });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetRoot} pointerEvents="box-none">
      <Animated.View pointerEvents="none" style={[styles.scrim, scrimStyle]} />
      {expanded && <Pressable accessibilityRole="button" accessibilityLabel="Collapse Moments" style={StyleSheet.absoluteFill} onPress={minimize} />}
      <Animated.View
          accessible
          accessibilityLabel={`${status.minimized}. ${expanded ? 'Expanded' : 'Docked'} Moments sheet.`}
          accessibilityActions={expanded
            ? [{ name: 'collapse', label: 'Collapse Moments' }]
            : [{ name: 'expand', label: 'Expand Moments' }]}
          onAccessibilityAction={(event) => setSheetExpanded(event.nativeEvent.actionName === 'expand')}
          style={[styles.sheet, { height: height - expandedY }, sheetStyle]}
        >
          <View pointerEvents="none" style={styles.sheetTopAccent} />
          <GestureDetector gesture={headerPan}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Drag Moments down to collapse' : 'Expand Moments'}
              onPress={() => { if (!expanded) setSheetExpanded(true); }}
            >
              <View style={styles.handle} />
              <View style={[styles.header, expanded && styles.headerExpanded]}>
                <View style={styles.headerMark}><Text style={styles.headerMarkText}>♥</Text></View>
                <View style={styles.headerCopy}>
                  {expanded && <Text style={styles.headerEyebrow}>{snapshot?.active ? MOMENT_V2.destinations[snapshot.active.destination].label : 'Moments'}</Text>}
                  <Text numberOfLines={1} style={styles.headerTitle}>{snapshot?.active ? status.minimized : view === 'new' ? 'New moment' : 'Shared moments'}</Text>
                </View>
                {expanded && <View style={styles.headerSticker}><Text style={styles.headerStickerText}>✦</Text></View>}
              </View>
            </Pressable>
          </GestureDetector>
          <GestureDetector gesture={contentPan}>
            <View style={styles.sheetContent}>
              {snapshot?.active && <PinnedActionCard snapshot={snapshot} onCollapse={minimize} />}
              <GestureDetector gesture={nativeScroll}>
                <ScrollView
                  style={styles.scroll}
                  contentContainerStyle={styles.scrollContent}
                  scrollEnabled={expanded}
                  keyboardDismissMode="interactive"
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={(event) => { scrollY.value = event.nativeEvent.contentOffset.y; }}
                >
                  {loading && !snapshot ? <Text style={styles.body}>Loading your home…</Text>
                    : snapshot?.active ? <ActiveMomentView key={snapshot.active.signal_id} snapshot={snapshot} onCollapse={minimize} />
                      : view === 'new' ? <CreationFlow onSent={minimize} />
                        : <EmptyMoments snapshot={snapshot} onNew={openComposer} />}
                </ScrollView>
              </GestureDetector>
            </View>
          </GestureDetector>
        </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sheetRoot: { position: 'absolute', inset: 0, zIndex: 40 },
  scrim: { position: 'absolute', inset: 0, backgroundColor: '#2A1712' },
  sheet: { position: 'absolute', top: 0, overflow: 'hidden', backgroundColor: hearthUi.shell, borderWidth: 1.5, borderColor: hearthUi.outline, shadowColor: hearthUi.shadow, shadowOpacity: 0.28, shadowRadius: 22, shadowOffset: { width: 0, height: 9 }, elevation: 15 },
  sheetTopAccent: { position: 'absolute', top: 0, left: 20, right: 20, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: hearthUi.coralHighlight, opacity: 0.74 },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: hearthUi.outline, alignSelf: 'center', marginTop: 7 },
  header: { minHeight: 38, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: hearthUi.hairline, paddingHorizontal: 12 },
  headerExpanded: { minHeight: 54 },
  headerMark: { width: 32, height: 32, marginRight: 9, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: hearthUi.outline, backgroundColor: hearthUi.blush, transform: [{ rotate: '-2deg' }] },
  headerMarkText: { color: hearthUi.coralDark, fontFamily: momentsTypography.heading, fontSize: 16, lineHeight: 20 },
  headerCopy: { flex: 1 },
  headerEyebrow: { color: editorial.clayDark, fontFamily: momentsTypography.bodyBold, fontSize: 10 },
  headerTitle: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 18, marginTop: 1 },
  headerSticker: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: hearthUi.butter, transform: [{ rotate: '7deg' }] },
  headerStickerText: { color: hearthUi.cocoa, fontFamily: momentsTypography.heading, fontSize: 16, lineHeight: 20 },
  pinnedAction: { marginHorizontal: 12, marginTop: 12, padding: 14, paddingTop: 17, borderRadius: 22, borderWidth: 1.5, borderColor: '#DFA27D', backgroundColor: '#FFF0CF', shadowColor: hearthUi.shadow, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  pinnedTape: { position: 'absolute', top: -5, alignSelf: 'center', width: 58, height: 15, backgroundColor: 'rgba(255, 244, 205, 0.9)', transform: [{ rotate: '2deg' }] },
  nextEyebrow: { color: editorial.clayDark, fontFamily: momentsTypography.bodyBold, fontSize: 11 },
  nextTitle: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 18, lineHeight: 23, marginTop: 3 },
  sheetContent: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 42 },
  stepPill: { alignSelf: 'flex-start', minHeight: 28, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: hearthUi.outline, backgroundColor: hearthUi.blush, marginBottom: 9 },
  stepDot: { width: 7, height: 7, marginRight: 4, borderRadius: 4, borderWidth: 1, borderColor: hearthUi.coralDark, backgroundColor: hearthUi.shell },
  stepDotOn: { backgroundColor: hearthUi.coral },
  stepText: { color: hearthUi.cocoa, fontFamily: momentsTypography.bodyBold, fontSize: 10, marginLeft: 3 },
  eyebrow: { color: editorial.clayDark, fontFamily: momentsTypography.bodyBold, fontSize: 11, marginBottom: 5 },
  pageTitle: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 26, lineHeight: 31 },
  body: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 14, lineHeight: 20, marginTop: 6 },
  bannerList: { marginTop: 14 },
  feelingSection: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 16, marginTop: 11, marginBottom: 7 },
  optionList: { marginTop: 12, marginBottom: 12 },
  section: { marginTop: 16 },
  sectionLabel: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 12, lineHeight: 17, marginBottom: 5 },
  actionRow: { minHeight: 60, justifyContent: 'center', borderWidth: 1, borderBottomWidth: 3, borderColor: hearthUi.outline, borderRadius: 19, backgroundColor: hearthUi.shellRaised, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 9 },
  actionRowSelected: { backgroundColor: hearthUi.blush, borderLeftWidth: 3, borderLeftColor: hearthUi.coralDark },
  actionTitle: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 14, lineHeight: 19 },
  actionConsequence: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  primaryButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderBottomWidth: 4, borderColor: hearthUi.coralDark, backgroundColor: hearthUi.coral, marginTop: 11, paddingHorizontal: 14, overflow: 'hidden' },
  primaryHighlight: { position: 'absolute', left: 12, right: 12, top: 4, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.52)' },
  primaryHeart: { color: '#FFFFFF', fontFamily: momentsTypography.heading, fontSize: 13, marginRight: 7, marginTop: 1 },
  primaryButtonText: { color: '#FFFFFF', fontFamily: momentsTypography.bodyBold, fontSize: 14, textAlign: 'center' },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1.5, borderColor: hearthUi.outline, backgroundColor: hearthUi.shellRaised, marginTop: 8, paddingHorizontal: 14 },
  secondaryButtonText: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 14 },
  responseComposer: { paddingBottom: 8 },
  sentNote: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: editorial.lineStrong, paddingVertical: 12, marginTop: 12 },
  reviewLabel: { color: editorial.inkSoft, fontFamily: momentsTypography.bodyBold, fontSize: 11 },
  noteText: { color: editorial.ink, fontFamily: momentsTypography.body, fontSize: 14, lineHeight: 20, marginTop: 3 },
  removedNote: { color: editorial.inkFaint, fontSize: 13, fontStyle: 'italic', marginTop: 3 },
  inlineButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  inlineDanger: { color: editorial.danger, fontSize: 13, fontWeight: '800' },
  responseSummary: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: editorial.lineStrong, paddingVertical: 12, marginTop: 16 },
  responseTitle: { color: editorial.ink, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  locationSection: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: editorial.lineStrong, marginTop: 18, paddingTop: 13 },
  cancelSection: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: editorial.lineStrong, marginTop: 13, paddingTop: 8 },
  earlierSection: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: editorial.lineStrong, marginTop: 24, paddingTop: 14 },
  outcomeRow: { minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: editorial.lineStrong, paddingVertical: 10 },
  emptyKeepsake: { minHeight: 92, flexDirection: 'row', alignItems: 'center', padding: 13, paddingRight: 15, marginBottom: 15, borderRadius: 24, borderWidth: 1.5, borderColor: hearthUi.outline, backgroundColor: hearthUi.sage, transform: [{ rotate: '-0.5deg' }] },
  emptyFlower: { width: 54, height: 54, marginRight: 12, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.56)' },
  emptyPetal: { position: 'absolute', width: 17, height: 24, borderRadius: 11, backgroundColor: hearthUi.coral },
  emptyPetalTop: { left: 18, top: 5 },
  emptyPetalLeft: { left: 10, top: 20, transform: [{ rotate: '-52deg' }] },
  emptyPetalRight: { right: 10, top: 20, transform: [{ rotate: '52deg' }] },
  emptyFlowerCenter: { position: 'absolute', left: 20, top: 23, width: 14, height: 14, borderRadius: 7, backgroundColor: hearthUi.butter },
  emptyKeepsakeCopy: { flex: 1 },
  emptyKeepsakeTitle: { color: hearthUi.cocoa, fontFamily: momentsTypography.heading, fontSize: 15, lineHeight: 19 },
  emptyKeepsakeBody: { color: hearthUi.cocoaSoft, fontFamily: momentsTypography.body, fontSize: 11, lineHeight: 16, marginTop: 3 },
  error: { color: editorial.danger, fontSize: 13, lineHeight: 18, marginTop: 12 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.48 },
});
