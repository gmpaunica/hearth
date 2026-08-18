import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  FIREPLACE_PATHWAY_BY_ID,
  FIREPLACE_READINESS,
  RETURN_OPTIONS,
  SIGNALS,
  fireplaceNeedLabel,
  type FireplaceResponseCopy,
} from '@/copy';
import type { FireplaceReadiness } from '@/lib/db';
import {
  currentThreadForUser,
  isCompletedToday,
  isOpenThread,
  outcomePathways,
  outcomeThreads,
  participantFor,
  relatedCompletedThread,
  responseFor,
} from '@/state/interactionModel';
import {
  selectStableFocusedThread,
  selectSortedThreads,
  useSignalStore,
  type InteractionThread,
} from '@/state/signalStore';
import { editorial } from '@/theme/hearth';

type ReturnOption = (typeof RETURN_OPTIONS)[number]['id'];

const SPOT_LABEL: Record<InteractionThread['type'], string> = {
  fireplace: 'the fireplace',
  sofa: 'the sofa',
  table: 'the table',
  garden: 'the garden',
  rest: 'the resting area',
  romantic: 'the bedroom',
};

const OUTCOME_GLYPH = {
  stay_close: '◍◍',
  talk_through: '◡◡',
  hear_first: '▱',
  acknowledge_hurt: '╱',
  apologize: '◇',
  more_time: '♢',
} as const;

function dateFor(option: ReturnOption): Date | null {
  const now = new Date();
  if (option === 'when_ready') return null;
  if (option === 'one_hour') return new Date(now.getTime() + 60 * 60 * 1000);
  if (option === 'tomorrow') {
    const value = new Date(now);
    value.setDate(value.getDate() + 1);
    value.setHours(18, 0, 0, 0);
    return value;
  }
  const value = new Date(now);
  value.setHours(20, 0, 0, 0);
  return value.getTime() > now.getTime() + 30 * 60 * 1000
    ? value
    : new Date(now.getTime() + 2 * 60 * 60 * 1000);
}

function formatReturn(value: string): string {
  const date = new Date(value);
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function titleFor(thread: InteractionThread): string {
  if (thread.session) return FIREPLACE_PATHWAY_BY_ID[thread.session.pathway].title;
  if (thread.type === 'fireplace' && thread.legacy?.need) {
    return fireplaceNeedLabel(thread.legacy.need as Parameters<typeof fireplaceNeedLabel>[0]);
  }
  return SIGNALS[thread.type].label;
}

function statusFor(thread: InteractionThread, userId: string): string {
  if (isCompletedToday(thread)) return 'Completed today';
  if (thread.fromUser !== userId && !responseFor(thread)) return 'Needs your response';
  if (thread.session?.scheduled_for && !thread.session.returned_at) return 'Time agreed';
  if (responseFor(thread)) return 'Still open';
  return thread.fromUser === userId ? 'Waiting gently' : 'Open moment';
}

function BusyButton({
  label,
  onPress,
  busy,
  quiet = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
  quiet?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        quiet ? styles.quietButton : styles.primaryButton,
        pressed && styles.buttonPressed,
        (busy || disabled) && styles.buttonDisabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={quiet ? editorial.clay : editorial.onAccent} />
      ) : (
        <Text style={quiet ? styles.quietButtonText : styles.primaryButtonText}>{label}</Text>
      )}
    </Pressable>
  );
}

function PresenceControl({ thread }: { thread: InteractionThread }) {
  const threads = useSignalStore((state) => state.threads);
  const ctx = useSignalStore((state) => state.ctx);
  const busyAction = useSignalStore((state) => state.busyAction);
  const move = useSignalStore((state) => state.moveToInteraction);
  const leave = useSignalStore((state) => state.leaveInteraction);
  const returnToFireplace = useSignalStore((state) => state.returnToFireplace);
  if (!ctx || !isOpenThread(thread)) return null;
  const current = currentThreadForUser(threads, ctx.userId);
  const isHere = current?.thread.id === thread.id;
  const returnPending =
    thread.session?.scheduled_by_user_id === ctx.userId &&
    !thread.session.returned_at;
  return (
    <View style={styles.presenceBlock}>
      <Text style={styles.presenceHint}>
        This only moves your avatar. It does not answer, close, or change the meaning of the moment.
      </Text>
      <BusyButton
        quiet
        busy={busyAction === 'move' || busyAction === 'leave' || busyAction === 'return'}
        label={returnPending
          ? `Return to ${SPOT_LABEL[thread.type]}`
          : isHere
            ? `Leave ${SPOT_LABEL[thread.type]}`
            : `Be present at ${SPOT_LABEL[thread.type]}`}
        onPress={() => void (returnPending
          ? returnToFireplace(thread.id)
          : !isHere
            ? move(thread.id)
            : leave(thread.id))}
      />
    </View>
  );
}

function Sentence({
  thread,
  participantUserId,
  label,
}: {
  thread: InteractionThread;
  participantUserId: string;
  label: string;
}) {
  const ctx = useSignalStore((state) => state.ctx);
  const setSentence = useSignalStore((state) => state.setFireplaceSentence);
  const busy = useSignalStore((state) => state.busyAction === 'sentence');
  const participant = participantFor(thread, participantUserId);
  const mine = participant?.user_id === ctx?.userId;
  const editable = !!(
    mine &&
    isOpenThread(thread) &&
    thread.session?.phase !== 'completed' &&
    (participant?.participant_role === 'author' || participant?.response_action)
  );
  const [draft, setDraft] = useState(participant?.sentence ?? '');
  if (!participant) return null;

  if (editable) {
    const clean = draft.trim();
    const unchanged = clean === (participant.sentence ?? '');
    return (
      <View style={styles.sentenceEditor}>
        <Text style={styles.sentenceLabel}>Your optional sentence</Text>
        <TextInput
          accessibilityLabel="Your optional moment sentence"
          value={draft}
          onChangeText={setDraft}
          maxLength={240}
          multiline
          placeholder="Add one sentence if it would help"
          placeholderTextColor={editorial.inkFaint}
          style={styles.responseInput}
        />
        <Text style={styles.count}>{draft.length}/240 · never included in notifications</Text>
        <View style={styles.inlineActions}>
          {!!participant.sentence && (
            <BusyButton
              quiet
              busy={busy}
              label="Remove your sentence"
              onPress={() => void setSentence(thread.id, null)}
            />
          )}
          <BusyButton
            busy={busy}
            disabled={unchanged}
            label={participant.sentence ? 'Save sentence' : 'Add sentence'}
            onPress={() => void setSentence(thread.id, clean || null)}
          />
        </View>
      </View>
    );
  }
  if (!participant?.sentence) return null;
  return (
    <View style={styles.sentence}>
      <Text style={styles.sentenceLabel}>{label}</Text>
      <Text style={styles.sentenceText}>“{participant.sentence}”</Text>
    </View>
  );
}

function ReturnPicker({
  action,
  onCancel,
  onSubmit,
}: {
  action: FireplaceResponseCopy;
  onCancel: () => void;
  onSubmit: (date: Date) => void;
}) {
  const [option, setOption] = useState<ReturnOption>('one_hour');
  const selectedDate = dateFor(option);
  return (
    <View style={styles.inlineComposer}>
      <Text style={styles.inlineTitle}>{action.label}</Text>
      <Text style={styles.inlineHint}>Choose a time. Hearth will remind only you.</Text>
      <View style={styles.wrapChoices}>
        {RETURN_OPTIONS.filter((item) => item.id !== 'when_ready').map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: item.id === option }}
            style={[styles.smallChoice, item.id === option && styles.smallChoiceOn]}
            onPress={() => setOption(item.id)}
          >
            <Text style={[styles.smallChoiceText, item.id === option && styles.smallChoiceTextOn]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.inlineActions}>
        <BusyButton quiet busy={false} label="Cancel" onPress={onCancel} />
        <BusyButton
          busy={false}
          disabled={!selectedDate}
          label="Set this time"
          onPress={() => selectedDate && onSubmit(selectedDate)}
        />
      </View>
    </View>
  );
}

function RescheduleControl({ thread }: { thread: InteractionThread }) {
  const [open, setOpen] = useState(false);
  const ctx = useSignalStore((state) => state.ctx);
  const reschedule = useSignalStore((state) => state.rescheduleReturn);
  const busy = useSignalStore((state) => state.busyAction === 'reschedule');
  const session = thread.session;
  if (
    !ctx ||
    !session?.scheduled_for ||
    session.scheduled_by_user_id !== ctx.userId ||
    session.returned_at
  ) return null;
  if (!open) {
    return (
      <BusyButton
        quiet
        busy={busy}
        label="Change return time"
        onPress={() => setOpen(true)}
      />
    );
  }
  return (
    <ReturnPicker
      action={{ id: 'reschedule', label: 'Choose a new return time', hint: '', asksForReturnTime: true }}
      onCancel={() => setOpen(false)}
      onSubmit={(date) => void reschedule(thread.id, date).then((saved) => saved && setOpen(false))}
    />
  );
}

function PathwayResponseChoices({
  thread,
  onResponded,
}: {
  thread: InteractionThread;
  onResponded: () => void;
}) {
  const [pending, setPending] = useState<FireplaceResponseCopy | null>(null);
  const respond = useSignalStore((state) => state.respondToInteraction);
  const busy = useSignalStore((state) => state.busyAction === 'respond');
  const pathway = FIREPLACE_PATHWAY_BY_ID[thread.session!.pathway];

  const send = (response: FireplaceResponseCopy, returnAt?: Date) => {
    void respond(thread.id, {
      action: response.id,
      returnAt: returnAt ?? null,
    }).then((sent) => {
      if (!sent) return;
      setPending(null);
      onResponded();
    });
  };

  if (pending?.asksForReturnTime) {
    return (
      <ReturnPicker
        action={pending}
        onCancel={() => setPending(null)}
        onSubmit={(date) => send(pending, date)}
      />
    );
  }

  return (
    <View style={styles.responseChoices}>
      <Text style={styles.sectionTitle}>What can you offer right now?</Text>
      {pathway.responses.map((response) => (
        <Pressable
          key={response.id}
          accessibilityRole="button"
          disabled={busy}
          style={({ pressed }) => [styles.responseChoice, pressed && styles.buttonPressed]}
          onPress={() => {
            if (['one_hour', 'tonight', 'tomorrow'].includes(response.id)) {
              const returnAt = dateFor(response.id as ReturnOption);
              if (returnAt) send(response, returnAt);
            } else if (response.asksForReturnTime) {
              setPending(response);
            } else {
              send(response);
            }
          }}
        >
          <View style={styles.responseChoiceCopy}>
            <Text style={styles.responseChoiceLabel}>{response.label}</Text>
            <Text style={styles.responseChoiceHint}>{response.hint}</Text>
          </View>
          <Text style={styles.responseAction}>Choose</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ReadinessStep({
  thread,
  onResponded,
}: {
  thread: InteractionThread;
  onResponded: () => void;
}) {
  const ctx = useSignalStore((state) => state.ctx);
  const busyAction = useSignalStore((state) => state.busyAction);
  const continueFireplace = useSignalStore((state) => state.continueFireplace);
  const setReadiness = useSignalStore((state) => state.setReadiness);
  if (!ctx || !thread.session || thread.session.phase === 'completed') return null;
  const mine = participantFor(thread, ctx.userId);
  if (
    thread.session.scheduled_by_user_id === ctx.userId &&
    !thread.session.returned_at
  ) {
    return (
      <View style={styles.continueBlock}>
        <Text style={styles.landingCopy}>
          Take the time you chose. Return to this moment when you are ready.
        </Text>
      </View>
    );
  }
  if (!mine?.action_completed_at) {
    return (
      <View style={styles.continueBlock}>
        <Text style={styles.landingCopy}>Let this action land. Nothing closes automatically.</Text>
        <BusyButton
          label="Continue when ready"
          busy={busyAction === 'continue'}
          onPress={() => void continueFireplace(thread.id)}
        />
      </View>
    );
  }

  return (
    <View style={styles.readinessBlock}>
      <Text style={styles.sectionTitle}>Privately, where are you now?</Text>
      {FIREPLACE_READINESS.map((choice) => {
        const selected = mine.readiness === (choice.id === 'ready' ? 'reconnected' : 'more_time');
        return (
          <Pressable
            key={choice.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            disabled={busyAction === 'readiness'}
            style={[styles.readinessChoice, selected && styles.readinessChoiceOn]}
            onPress={() => void setReadiness(
              thread.id,
              choice.id as FireplaceReadiness,
            ).then((saved) => saved && onResponded())}
          >
            <Text style={[styles.readinessText, selected && styles.readinessTextOn]}>{choice.label}</Text>
          </Pressable>
        );
      })}
      <Text style={styles.stillOpen}>This moment is still open.</Text>
    </View>
  );
}

function RelatedSettlement({ thread }: { thread: InteractionThread }) {
  const threads = useSignalStore((state) => state.threads);
  const ctx = useSignalStore((state) => state.ctx);
  const answer = useSignalStore((state) => state.answerRelatedSettlement);
  const busy = useSignalStore((state) => state.busyAction === 'related');
  const completed = ctx ? relatedCompletedThread(threads, thread, ctx.userId) : null;
  if (!completed) return null;
  return (
    <View style={styles.relatedPrompt}>
      <Text style={styles.relatedTitle}>Did this also settle this moment?</Text>
      <Text style={styles.relatedHint}>Only you can decide for the moment you started.</Text>
      <View style={styles.inlineActions}>
        <BusyButton
          quiet
          busy={busy}
          label="Keep it open"
          onPress={() => void answer(thread.id, completed.id, false)}
        />
        <BusyButton
          busy={busy}
          label="Yes, close mine"
          onPress={() => void answer(thread.id, completed.id, true)}
        />
      </View>
    </View>
  );
}

function CompletedPathway({ thread }: { thread: InteractionThread }) {
  const pathway = FIREPLACE_PATHWAY_BY_ID[thread.session!.pathway];
  return (
    <View style={styles.completedBlock}>
      <Text style={styles.completedGlyph}>{OUTCOME_GLYPH[pathway.id]}</Text>
      <Text style={styles.completedTitle}>{pathway.outcome}</Text>
      <Text style={styles.completedObject}>{pathway.outcomeObject} will remain until midnight.</Text>
    </View>
  );
}

function StructuredPathwayCard({
  thread,
  onResponded,
}: {
  thread: InteractionThread;
  onResponded: () => void;
}) {
  const ctx = useSignalStore((state) => state.ctx)!;
  const close = useSignalStore((state) => state.closeAuthoredInteraction);
  const busyAction = useSignalStore((state) => state.busyAction);
  const error = useSignalStore((state) => state.error);
  const pathway = FIREPLACE_PATHWAY_BY_ID[thread.session!.pathway];
  const author = thread.participants.find((participant) => participant.participant_role === 'author');
  const partner = thread.participants.find((participant) => participant.participant_role === 'partner');
  const response = partner?.response_action
    ? pathway.responses.find((item) => item.id === partner.response_action)
    : null;
  const mine = thread.fromUser === ctx.userId;
  const complete = thread.session!.phase === 'completed';

  return (
    <>
      <RelatedSettlement thread={thread} />
      <View style={styles.cardHeading}>
        <View style={styles.fireIcon}><Text style={styles.fireIconText}>♨</Text></View>
        <View style={styles.headingCopy}>
          <Text style={styles.cardEyebrow}>{mine ? 'Your fireplace moment' : 'A fireplace moment for you'}</Text>
          <Text style={styles.cardTitle}>{pathway.title}</Text>
        </View>
      </View>
      {thread.groupSize > 1 && (
        <View style={styles.connectedPill}><Text style={styles.connectedText}>Part of the same conversation</Text></View>
      )}
      <Text style={styles.partnerText}>{mine ? pathway.senderText : pathway.partnerText}</Text>
      {author && (
        <Sentence
          key={`${thread.id}:${author.user_id}:${author.sentence ?? ''}`}
          thread={thread}
          participantUserId={author.user_id}
          label={mine ? 'You added' : 'They added'}
        />
      )}
      {partner && (
        <Sentence
          key={`${thread.id}:${partner.user_id}:${partner.sentence ?? ''}`}
          thread={thread}
          participantUserId={partner.user_id}
          label={partner.user_id === ctx.userId ? 'You replied' : 'They replied'}
        />
      )}

      {complete ? (
        <CompletedPathway thread={thread} />
      ) : !response && !mine ? (
        <PathwayResponseChoices thread={thread} onResponded={onResponded} />
      ) : !response ? (
        <View style={styles.waitingBlock}>
          <View style={styles.waitingDot} />
          <Text style={styles.waitingText}>This moment is still open.</Text>
        </View>
      ) : (
        <>
          <View style={styles.actionSummary}>
            <Text style={styles.actionLabel}>{response.label}</Text>
            <Text style={styles.actionHint}>{response.hint}</Text>
            {!!thread.session?.scheduled_for && !thread.session.returned_at && (
              <Text style={styles.schedule}>Return planned for {formatReturn(thread.session.scheduled_for)}</Text>
            )}
          </View>
          <RescheduleControl thread={thread} />
          <ReadinessStep thread={thread} onResponded={onResponded} />
        </>
      )}

      {!complete && <PresenceControl thread={thread} />}
      {!complete && mine && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close your moment"
          disabled={busyAction === 'close'}
          onPress={() => void close(thread.id)}
          hitSlop={7}
        >
          <Text style={styles.closeMoment}>Close only this moment</Text>
        </Pressable>
      )}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </>
  );
}

function LegacyCard({
  thread,
  onResponded,
}: {
  thread: InteractionThread;
  onResponded: () => void;
}) {
  const ctx = useSignalStore((state) => state.ctx)!;
  const respond = useSignalStore((state) => state.respondToInteraction);
  const close = useSignalStore((state) => state.closeAuthoredInteraction);
  const busy = useSignalStore((state) => state.busyAction);
  const mine = thread.fromUser === ctx.userId;
  const response = responseFor(thread);
  return (
    <>
      <View style={styles.cardHeading}>
        <View style={styles.fireIcon}><Text style={styles.fireIconText}>♡</Text></View>
        <View style={styles.headingCopy}>
          <Text style={styles.cardEyebrow}>{mine ? 'Your open signal' : 'A signal for you'}</Text>
          <Text style={styles.cardTitle}>{titleFor(thread)}</Text>
        </View>
      </View>
      {thread.groupSize > 1 && (
        <View style={styles.connectedPill}><Text style={styles.connectedText}>Part of the same conversation</Text></View>
      )}
      <Text style={styles.partnerText}>{mine ? SIGNALS[thread.type].selfText : SIGNALS[thread.type].partnerText}</Text>
      {!response && !mine && (
        <View style={styles.responseChoices}>
          <Text style={styles.sectionTitle}>What can you offer right now?</Text>
          {SIGNALS[thread.type].responses.map((choice) => (
            <Pressable
              key={choice.action}
              accessibilityRole="button"
              accessibilityLabel={`${choice.label}. ${choice.meaning}`}
              style={({ pressed }) => [styles.responseChoice, pressed && styles.buttonPressed]}
              disabled={busy === 'respond'}
              onPress={() => void respond(thread.id, { action: choice.action })
                .then((sent) => sent && onResponded())}
            >
              <View style={styles.responseChoiceCopy}>
                <Text style={styles.responseChoiceLabel}>{choice.label}</Text>
                <Text style={styles.responseChoiceHint}>{choice.meaning}</Text>
              </View>
              <Text style={styles.responseAction}>Choose</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!!response && (() => {
        const choice = SIGNALS[thread.type].responses.find((item) => item.action === response);
        return (
          <View style={styles.actionSummary}>
            <Text style={styles.actionLabel}>{mine ? 'They chose' : 'You chose'}: {choice?.label ?? response}</Text>
            {!!choice?.meaning && <Text style={styles.actionHint}>{choice.meaning}</Text>}
          </View>
        );
      })()}
      <PresenceControl thread={thread} />
      {mine && isOpenThread(thread) && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close your moment"
          disabled={busy === 'close'}
          onPress={() => void close(thread.id)}
          hitSlop={7}
        >
          <Text style={styles.closeMoment}>Close only this moment</Text>
        </Pressable>
      )}
    </>
  );
}

function MomentChip({
  thread,
  active,
  onPress,
  userId,
}: {
  thread: InteractionThread;
  active: boolean;
  onPress: () => void;
  userId: string;
}) {
  const needsResponse = thread.fromUser !== userId && !responseFor(thread) && isOpenThread(thread);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${titleFor(thread)}. ${statusFor(thread, userId)}`}
      onPress={onPress}
      style={[styles.momentChip, active && styles.momentChipOn]}
    >
      {needsResponse && <View style={styles.badge} />}
      <Text numberOfLines={1} style={[styles.momentChipTitle, active && styles.momentChipTitleOn]}>
        {titleFor(thread)}
      </Text>
      <Text style={styles.momentChipStatus}>{statusFor(thread, userId)}</Text>
    </Pressable>
  );
}

export function SignalCards({
  onMinimize,
  onNewMoment,
}: {
  onMinimize: () => void;
  onNewMoment: () => void;
}) {
  const allSorted = useSignalStore(useShallow(selectSortedThreads));
  const focused = useSignalStore(selectStableFocusedThread);
  const ctx = useSignalStore((state) => state.ctx);
  const outcomeFilter = useSignalStore((state) => state.outcomeFilter);
  const focus = useSignalStore((state) => state.focus);
  const focusOutcome = useSignalStore((state) => state.focusOutcome);
  const clearOutcomeFilter = useSignalStore((state) => state.clearOutcomeFilter);
  const pathways = useMemo(() => outcomePathways(allSorted), [allSorted]);
  const visible = useMemo(
    () => outcomeFilter ? outcomeThreads(allSorted, outcomeFilter) : allSorted,
    [allSorted, outcomeFilter],
  );
  const active = focused && visible.some((thread) => thread.id === focused.id)
    ? focused
    : visible[0] ?? null;
  if (!ctx) return null;

  if (!active) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No open moments</Text>
        <Text style={styles.emptyHint}>The home is quiet. Leave a signal whenever it would help.</Text>
        <BusyButton busy={false} label="New moment" onPress={onNewMoment} />
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={styles.surface}>
      <View style={styles.trayHeader}>
        <View>
          <Text style={styles.trayEyebrow}>{outcomeFilter ? 'Today’s matching moments' : 'Moments'}</Text>
          <Text style={styles.trayCount}>{visible.length} {visible.length === 1 ? 'moment' : 'moments'}</Text>
        </View>
        <View style={styles.trayActions}>
          {outcomeFilter && (
            <Pressable accessibilityRole="button" accessibilityLabel="Show all Moments" onPress={clearOutcomeFilter} hitSlop={7}>
              <Text style={styles.showAll}>Show all</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="New moment" onPress={onNewMoment} hitSlop={7}>
            <Text style={styles.newMoment}>New moment</Text>
          </Pressable>
        </View>
      </View>

      {(visible.length > 1 || active.id !== visible[0]?.id) && (
        <ScrollView
          horizontal
          accessibilityRole="tablist"
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
          contentContainerStyle={styles.chipRow}
        >
          {visible.map((thread) => (
            <MomentChip
              key={thread.id}
              thread={thread}
              active={thread.id === active.id}
              userId={ctx.userId}
              onPress={() => focus(thread.id)}
            />
          ))}
        </ScrollView>
      )}

      {pathways.length > 0 && !outcomeFilter && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.outcomeRow}>
          <Text style={styles.outcomeRowLabel}>Today</Text>
          {pathways.map((pathway) => {
            const count = outcomeThreads(allSorted, pathway).length;
            return (
              <Pressable
                key={pathway}
                accessibilityRole="button"
                accessibilityLabel={`${FIREPLACE_PATHWAY_BY_ID[pathway].outcomeObject}. Open ${count} matching ${count === 1 ? 'moment' : 'moments'}.`}
                style={styles.outcomeChip}
                onPress={() => focusOutcome(pathway)}
              >
                <Text style={styles.outcomeChipGlyph}>{OUTCOME_GLYPH[pathway]}</Text>
                <Text style={styles.outcomeChipCount}>{count}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.card}>
        <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
          {active.session
            ? <StructuredPathwayCard key={active.id} thread={active} onResponded={onMinimize} />
            : <LegacyCard key={active.id} thread={active} onResponded={onMinimize} />}
        </ScrollView>
      </View>
    </View>
  );
}

/** Kept as a no-op export so older route code can update atomically with the
 * new card surface; readiness now lives inside each focused moment. */
export function ReconciliationPrompt() {
  return null;
}

const styles = StyleSheet.create({
  surface: {
    flexShrink: 1,
    maxHeight: '100%',
  },
  trayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 9, marginBottom: 5,
  },
  trayEyebrow: { color: editorial.clay, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  trayCount: { color: editorial.inkSoft, fontSize: 10, marginTop: 1 },
  trayActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  showAll: { color: editorial.clay, fontSize: 11, fontWeight: '800' },
  newMoment: { color: editorial.clayDark, fontSize: 11, fontWeight: '900' },
  chipScroller: { flexGrow: 0, marginBottom: 6 },
  chipRow: { gap: 6, paddingHorizontal: 2 },
  momentChip: {
    width: 132, minHeight: 45, paddingVertical: 7, paddingHorizontal: 10,
    borderRadius: 11, backgroundColor: editorial.paperSoft,
    borderWidth: 1, borderColor: editorial.line,
  },
  momentChipOn: { backgroundColor: editorial.clayWash, borderColor: editorial.lineStrong },
  momentChipTitle: { color: editorial.ink, fontSize: 10, fontWeight: '800' },
  momentChipTitleOn: { color: editorial.clayDark },
  momentChipStatus: { color: editorial.inkFaint, fontSize: 8, marginTop: 2 },
  badge: { position: 'absolute', right: 6, top: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: editorial.clay },
  outcomeRow: { alignItems: 'center', gap: 5, paddingHorizontal: 7, marginBottom: 6 },
  outcomeRowLabel: { color: editorial.inkFaint, fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
  outcomeChip: {
    minWidth: 43, height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 9, paddingHorizontal: 8, backgroundColor: editorial.sageSoft,
    borderWidth: 1, borderColor: editorial.line,
  },
  outcomeChipGlyph: { color: editorial.gold, fontSize: 12, fontWeight: '900' },
  outcomeChipCount: { color: editorial.inkSoft, fontSize: 8, fontWeight: '900', marginLeft: 4 },
  card: {
    backgroundColor: editorial.paper, borderColor: editorial.lineStrong, borderWidth: 1,
    borderRadius: 19, shadowColor: editorial.shadow, shadowOpacity: 0.18,
    shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 10,
    overflow: 'hidden', flexShrink: 1,
  },
  cardScroll: { flexShrink: 1 },
  cardContent: { padding: 14, alignItems: 'stretch' },
  cardHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  fireIcon: {
    width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: editorial.clayWash, borderWidth: 1, borderColor: editorial.lineStrong,
    marginRight: 10,
  },
  fireIconText: { color: editorial.clay, fontSize: 18, fontWeight: '900' },
  headingCopy: { flex: 1 },
  cardEyebrow: { color: editorial.clay, fontSize: 8, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  cardTitle: { color: editorial.ink, fontFamily: 'serif', fontSize: 19, lineHeight: 23, fontWeight: '700', marginTop: 1 },
  connectedPill: { alignSelf: 'flex-start', backgroundColor: editorial.sageSoft, borderLeftWidth: 2, borderLeftColor: editorial.sage, borderRadius: 7, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 7 },
  connectedText: { color: editorial.inkSoft, fontSize: 9, fontWeight: '700' },
  partnerText: { color: editorial.inkSoft, fontSize: 12, lineHeight: 17, textAlign: 'center', marginBottom: 7 },
  sentence: { backgroundColor: editorial.paperTint, borderRadius: 11, padding: 9, marginVertical: 4, borderWidth: 1, borderColor: editorial.line },
  sentenceEditor: { backgroundColor: editorial.paperTint, borderRadius: 11, padding: 9, marginVertical: 4, borderWidth: 1, borderColor: editorial.lineStrong },
  sentenceLabel: { color: editorial.clay, fontSize: 8, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  sentenceText: { color: editorial.ink, fontFamily: 'serif', fontSize: 13, lineHeight: 18, marginTop: 3 },
  responseChoices: { gap: 6, marginTop: 3 },
  sectionTitle: { color: editorial.ink, fontSize: 11, fontWeight: '800', textAlign: 'center', marginVertical: 4 },
  responseChoice: { minHeight: 58, flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 11, backgroundColor: editorial.paperStrong, borderWidth: 1, borderColor: editorial.line, borderLeftWidth: 3, borderLeftColor: editorial.clay },
  responseChoiceCopy: { flex: 1 },
  responseChoiceLabel: { color: editorial.ink, fontSize: 12, fontWeight: '800' },
  responseChoiceHint: { color: editorial.inkSoft, fontSize: 9, lineHeight: 13, marginTop: 2 },
  responseAction: { color: editorial.clay, fontSize: 9, fontWeight: '900', marginLeft: 8 },
  inlineComposer: { backgroundColor: editorial.paperTint, borderRadius: 12, padding: 10, marginVertical: 5 },
  inlineTitle: { color: editorial.ink, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  inlineHint: { color: editorial.inkSoft, fontSize: 10, lineHeight: 14, textAlign: 'center', marginVertical: 4 },
  responseInput: { minHeight: 62, maxHeight: 105, textAlignVertical: 'top', borderRadius: 10, borderWidth: 1, borderColor: editorial.lineStrong, backgroundColor: editorial.paperStrong, padding: 9, color: editorial.ink, fontSize: 12 },
  count: { color: editorial.inkFaint, fontSize: 8, textAlign: 'right', marginTop: 2 },
  inlineActions: { flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 7 },
  wrapChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginVertical: 6 },
  smallChoice: { minHeight: 36, justifyContent: 'center', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 9, backgroundColor: editorial.paperStrong, borderWidth: 1, borderColor: editorial.line },
  smallChoiceOn: { backgroundColor: editorial.clay, borderColor: editorial.clay },
  smallChoiceText: { color: editorial.inkSoft, fontSize: 10, fontWeight: '700' },
  smallChoiceTextOn: { color: editorial.onAccent },
  waitingBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  waitingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: editorial.gold, marginRight: 7 },
  waitingText: { color: editorial.clayDark, fontSize: 11, fontWeight: '800' },
  actionSummary: { backgroundColor: editorial.sageSoft, borderLeftWidth: 3, borderLeftColor: editorial.sage, borderRadius: 10, padding: 10, marginTop: 5 },
  actionLabel: { color: editorial.clayDark, fontFamily: 'serif', fontSize: 13, fontWeight: '700', textAlign: 'center', marginVertical: 4 },
  actionHint: { color: editorial.inkSoft, fontSize: 10, lineHeight: 14, textAlign: 'center' },
  schedule: { color: editorial.sage, fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 5 },
  continueBlock: { marginTop: 8, alignItems: 'center' },
  landingCopy: { color: editorial.inkSoft, fontSize: 10, lineHeight: 15, textAlign: 'center', marginBottom: 6 },
  readinessBlock: { marginTop: 7, gap: 5 },
  readinessChoice: { minHeight: 42, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 11, borderRadius: 10, backgroundColor: editorial.paperStrong, borderWidth: 1, borderColor: editorial.line },
  readinessChoiceOn: { backgroundColor: editorial.clay, borderColor: editorial.clayDark },
  readinessText: { color: editorial.ink, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  readinessTextOn: { color: editorial.onAccent },
  stillOpen: { color: editorial.inkFaint, fontSize: 9, textAlign: 'center', marginTop: 2 },
  primaryButton: { minHeight: 42, minWidth: 132, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: editorial.clay, borderBottomWidth: 3, borderBottomColor: editorial.clayDark, paddingHorizontal: 14, paddingVertical: 8, marginTop: 7, alignSelf: 'center', shadowColor: editorial.shadow, shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  primaryButtonText: { color: editorial.onAccent, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  quietButton: { minHeight: 38, minWidth: 104, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: editorial.paperStrong, borderColor: editorial.lineStrong, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, marginTop: 7, alignSelf: 'center' },
  quietButtonText: { color: editorial.clay, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  buttonPressed: { opacity: 0.76, transform: [{ translateY: 1 }] },
  buttonDisabled: { opacity: 0.48 },
  closeMoment: { color: editorial.inkFaint, fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  relatedPrompt: { backgroundColor: editorial.sageSoft, borderRadius: 11, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: editorial.line },
  relatedTitle: { color: editorial.ink, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  relatedHint: { color: editorial.inkSoft, fontSize: 9, textAlign: 'center', marginTop: 2 },
  completedBlock: { alignItems: 'center', backgroundColor: editorial.sageSoft, borderRadius: 12, padding: 13, marginTop: 5 },
  completedGlyph: { color: editorial.gold, fontSize: 24, fontWeight: '900' },
  completedTitle: { color: editorial.ink, fontFamily: 'serif', fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  completedObject: { color: editorial.inkSoft, fontSize: 9, lineHeight: 13, textAlign: 'center', marginTop: 4 },
  error: { color: editorial.danger, fontSize: 10, textAlign: 'center', marginTop: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 18 },
  emptyTitle: { color: editorial.ink, fontFamily: 'serif', fontSize: 19, fontWeight: '700' },
  emptyHint: { color: editorial.inkSoft, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 5 },
  presenceBlock: { alignItems: 'center', marginTop: 8, paddingTop: 7, borderTopWidth: 1, borderTopColor: editorial.line },
  presenceHint: { color: editorial.inkFaint, fontSize: 8, lineHeight: 12, textAlign: 'center', paddingHorizontal: 14 },
});
