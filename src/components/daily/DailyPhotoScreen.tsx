import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { chooseDailyPhoto, takeDailyPhoto, type ProcessedDailyPhoto } from '@/daily/photo';
import { mineFor, partnerFor } from '@/daily/model';
import { useDailyMediaStore } from '@/daily/store';
import { useAuthStore } from '@/state/authStore';
import { HearthTheme } from '@/theme/hearth';
import { DailyMediaScaffold } from './DailyMediaScaffold';
import { PrivatePhoto } from './PrivatePhoto';

interface DailyPhotoScreenProps {
  reviewMode?: boolean;
  reviewPreview?: ProcessedDailyPhoto | null;
  reviewMediaUri?: string | null;
  reviewDeleteOpen?: boolean;
}

export function DailyPhotoScreen({
  reviewMode = false,
  reviewPreview = null,
  reviewMediaUri = null,
  reviewDeleteOpen = false,
}: DailyPhotoScreenProps = {}) {
  const snapshot = useDailyMediaStore((state) => state.snapshot);
  const loading = useDailyMediaStore((state) => state.loading);
  const busy = useDailyMediaStore((state) => state.busy);
  const error = useDailyMediaStore((state) => state.error);
  const refresh = useDailyMediaStore((state) => state.refresh);
  const submitPhoto = useDailyMediaStore((state) => state.submitPhoto);
  const deleteArtifact = useDailyMediaStore((state) => state.deleteArtifact);
  const clearError = useDailyMediaStore((state) => state.clearError);
  const plantToday = useDailyMediaStore((state) => state.plantToday);
  const unplantToday = useDailyMediaStore((state) => state.unplantToday);
  const userId = useAuthStore((state) => state.userId);
  const [preview, setPreview] = useState<ProcessedDailyPhoto | null>(reviewPreview);
  const [localError, setLocalError] = useState<string | null>(null);
  const [acquiring, setAcquiring] = useState<'camera' | 'library' | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(reviewDeleteOpen);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  const mine = mineFor(snapshot, userId, 'photo');
  const partner = partnerFor(snapshot, userId, 'photo');

  useEffect(() => {
    if (!reviewMode) void refresh(false);
  }, [refresh, reviewMode]);

  const pick = async (source: 'camera' | 'library') => {
    if (reviewMode) return;
    setLocalError(null);
    setAcquiring(source);
    try {
      const processed = source === 'camera' ? await takeDailyPhoto() : await chooseDailyPhoto();
      if (processed) setPreview(processed);
    } catch (pickError) {
      const message = pickError instanceof Error ? pickError.message : '';
      setLocalError(/^(That photo|Camera permission|Camera access)/.test(message)
        ? message
        : 'Couldn’t prepare that photo. Nothing was sent.');
    } finally {
      setAcquiring(null);
    }
  };

  const send = async () => {
    if (reviewMode) return;
    if (preview && await submitPhoto(preview)) setPreview(null);
  };

  const confirmDelete = async (id: string) => {
    if (reviewMode) return;
    if (await deleteArtifact('photo', id)) {
      setDeleteOpen(false);
      setDeleteNotice('Your photo was removed. Today’s photo page stays closed.');
    }
  };

  const confirmUnplant = () => Alert.alert(
    'Remove this greenhouse memory?',
    'Removal is final for this photo-day.',
    [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void unplantToday() },
    ],
  );

  return (
    <DailyMediaScaffold
      eyebrow="DAILY PHOTO"
      title="A little view of today"
      prompt={snapshot?.photo_prompt ?? null}
      sharedCopy={snapshot?.shared_prompt_copy}
    >
      {!!deleteNotice && <View style={styles.successCard} accessibilityLiveRegion="polite"><Text style={styles.successText}>{deleteNotice}</Text></View>}
      {(error || localError) && <View style={styles.errorCard} accessibilityLiveRegion="polite">
        <Text style={styles.errorTitle}>{preview ? 'Your preview is still here' : 'That didn’t work yet'}</Text>
        <Text style={styles.errorText}>{localError ?? error}</Text>
      </View>}

      {!mine && (
        <View style={styles.steps} accessibilityLabel={preview ? 'Photo step 2 of 3, preview' : 'Photo step 1 of 3, take or choose'}>
          <View style={[styles.step, !preview && styles.stepActive]}><Text style={[styles.stepText, !preview && styles.stepTextActive]}>1  Take</Text></View>
          <View style={styles.stepLine} />
          <View style={[styles.step, !!preview && styles.stepActive]}><Text style={[styles.stepText, !!preview && styles.stepTextActive]}>2  Preview</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.step}><Text style={styles.stepText}>3  Send</Text></View>
        </View>
      )}

      {!mine && !preview && (
        <View style={styles.takeCard}>
          <View style={styles.cameraArt}><View style={styles.lens} /></View>
          <Text style={styles.takeTitle}>One photo, just for today</Text>
          <Text style={styles.takeBody}>Take it, then come straight back to Hearth for a clean 4:5 preview. Nothing sends until you choose Send.</Text>
          <View style={styles.privacyNote}>
            <Text style={styles.privacyNoteText}>Camera access is requested only after Take photo. Choose photo opens your phone’s private picker; Hearth receives only the image you select.</Text>
          </View>
          <View style={styles.row}>
            <Pressable
              style={({ pressed }) => [styles.primary, styles.flex, pressed && styles.pressed]}
              onPress={() => void pick('camera')}
              disabled={loading || busy != null || acquiring != null}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              accessibilityState={{ busy: acquiring === 'camera', disabled: loading || busy != null || acquiring != null }}
            ><Text style={styles.primaryText}>{acquiring === 'camera' ? 'Opening camera…' : 'Take photo'}</Text></Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondary, styles.flex, pressed && styles.pressed]}
              onPress={() => void pick('library')}
              disabled={loading || busy != null || acquiring != null}
              accessibilityRole="button"
              accessibilityLabel="Choose photo"
              accessibilityState={{ busy: acquiring === 'library', disabled: loading || busy != null || acquiring != null }}
            ><Text style={styles.secondaryText}>{acquiring === 'library' ? 'Opening photos…' : 'Choose photo'}</Text></Pressable>
          </View>
        </View>
      )}

      {!mine && preview && (
        <View style={styles.photoCard}>
          <Text style={styles.answerLabel}>PREVIEW</Text>
          <PrivatePhoto localUri={preview.uri} accessibilityLabel="Your daily photo preview" />
          <View style={styles.row}>
            <Pressable
              style={({ pressed }) => [styles.secondary, styles.flex, pressed && styles.pressed]}
              onPress={() => { clearError(); setLocalError(null); setPreview(null); }}
              disabled={busy != null}
              accessibilityRole="button"
              accessibilityLabel="Replace photo"
            ><Text style={styles.secondaryText}>Replace</Text></Pressable>
            <Pressable
              style={({ pressed }) => [styles.primary, styles.flex, pressed && styles.pressed]}
              onPress={() => void send()}
              disabled={busy != null}
              accessibilityRole="button"
              accessibilityLabel="Send photo for today"
              accessibilityState={{ busy: busy === 'photo-upload' }}
            ><Text style={styles.primaryText}>{busy === 'photo-upload' ? 'Sending…' : error ? 'Try sending again' : 'Send photo'}</Text></Pressable>
          </View>
        </View>
      )}

      {mine && (
        <View style={styles.photoCard}>
          <Text style={styles.answerLabel}>YOUR ANSWER</Text>
          <PrivatePhoto item={mine} localUri={reviewMediaUri} accessibilityLabel="Your daily photo" />
          {deleteOpen ? (
            <View style={styles.deleteConfirm} accessibilityLiveRegion="polite">
              <Text style={styles.deleteTitle}>Remove your photo?</Text>
              <Text style={styles.deleteBody}>It disappears for both of you and today’s photo page will stay closed.</Text>
              <View style={styles.row}>
                <Pressable style={[styles.secondary, styles.flex]} onPress={() => setDeleteOpen(false)} disabled={busy != null}><Text style={styles.secondaryText}>Keep photo</Text></Pressable>
                <Pressable style={[styles.deleteAction, styles.flex]} onPress={() => void confirmDelete(mine.id)} disabled={busy != null}><Text style={styles.deleteActionText}>{busy === 'delete-photo' ? 'Removing…' : 'Remove forever'}</Text></Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
              onPress={() => setDeleteOpen(true)}
              disabled={busy != null}
              accessibilityRole="button"
              accessibilityLabel="Permanently delete your daily photo"
            ><Text style={styles.deleteText}>Remove my photo</Text></Pressable>
          )}
        </View>
      )}

      {partner && (
        <View style={[styles.photoCard, styles.partnerCard]}>
          <Text style={styles.answerLabel}>A PHOTO FOR YOU</Text>
          <PrivatePhoto item={partner} localUri={reviewMediaUri} markViewed={!reviewMode} accessibilityLabel="Your partner’s daily photo" />
        </View>
      )}

      {(mine || partner) && snapshot && !snapshot.greenhouse_planting_final && (
        <View style={styles.plantCard}>
          <View style={styles.sprout}><View style={styles.stem} /><View style={[styles.leaf, styles.leftLeaf]} /><View style={[styles.leaf, styles.rightLeaf]} /></View>
          <View style={styles.plantCopy}>
            <Text style={styles.plantTitle}>{snapshot.greenhouse_planted ? 'This day is in the greenhouse' : 'Keep this day in the greenhouse'}</Text>
            <Text style={styles.plantBody}>No caption. If both photos arrive before the home day ends, they live together.</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.plantButton, pressed && styles.pressed]}
            onPress={() => {
              if (reviewMode) return;
              if (snapshot.greenhouse_planted) confirmUnplant();
              else void plantToday();
            }}
            disabled={busy != null}
            accessibilityRole="button"
            accessibilityLabel={snapshot.greenhouse_planted ? 'Remove this day from the greenhouse' : 'Keep this day in the greenhouse'}
          ><Text style={styles.plantButtonText}>{snapshot.greenhouse_planted ? 'Remove' : 'Keep'}</Text></Pressable>
        </View>
      )}
      {(mine || partner) && snapshot?.greenhouse_planted && (
        <Pressable
          style={({ pressed }) => [styles.openMemory, pressed && styles.pressed]}
          onPress={() => { if (!reviewMode) router.push({ pathname: '/greenhouse', params: { date: snapshot.home_date } } as never); }}
          accessibilityRole="button"
          accessibilityLabel={`Open greenhouse memory from ${snapshot.home_date}`}
          accessibilityHint="Opens the greenhouse at this planted day"
        >
          <Text style={styles.openMemoryText}>Visit this day in the greenhouse</Text>
        </Pressable>
      )}
    </DailyMediaScaffold>
  );
}

const styles = StyleSheet.create({
  errorCard: { borderRadius: HearthTheme.radius.md, padding: HearthTheme.space.md, backgroundColor: HearthTheme.color.dangerSoft, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  errorTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 17, lineHeight: 21, marginBottom: 2 },
  errorText: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 17 },
  successCard: { borderRadius: HearthTheme.radius.md, padding: HearthTheme.space.md, backgroundColor: HearthTheme.color.successSoft, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  successText: { color: HearthTheme.color.success, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 17 },
  steps: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5 },
  step: { minHeight: 28, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 12 },
  stepActive: { backgroundColor: HearthTheme.color.coralSoft },
  stepText: { color: HearthTheme.color.inkFaint, fontFamily: HearthTheme.type.bodyStrong, fontSize: 10 },
  stepTextActive: { color: HearthTheme.color.clayPressed },
  stepLine: { flex: 1, height: 1, backgroundColor: HearthTheme.color.lineStrong },
  takeCard: { borderRadius: HearthTheme.radius.page, padding: 18, alignItems: 'center', backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  cameraArt: { width: 96, height: 72, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: HearthTheme.color.parchmentWarm, borderWidth: 8, borderColor: HearthTheme.color.coral },
  lens: { width: 39, height: 39, borderRadius: 20, backgroundColor: HearthTheme.color.ink, borderWidth: 8, borderColor: HearthTheme.color.sageSoft },
  takeTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 22, marginTop: 13 },
  takeBody: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 310, marginTop: 4 },
  privacyNote: { marginTop: 14, padding: 12, borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.sageSoft },
  privacyNoteText: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  photoCard: { borderRadius: HearthTheme.radius.lg, padding: 13, backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.lineStrong, gap: 8 },
  partnerCard: { backgroundColor: HearthTheme.color.parchmentWarm },
  answerLabel: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.bodyStrong, fontSize: 10, letterSpacing: 1.3, paddingHorizontal: 3 },
  row: { width: '100%', flexDirection: 'row', gap: 9, marginTop: 13 },
  flex: { flex: 1, minWidth: 0 },
  primary: { minHeight: HearthTheme.touch.minimum, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, backgroundColor: HearthTheme.color.clayPressed },
  primaryText: { color: HearthTheme.color.onAccent, fontFamily: HearthTheme.type.bodyStrong, fontSize: 13 },
  secondary: { minHeight: HearthTheme.touch.minimum, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, backgroundColor: HearthTheme.color.parchmentWarm, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  secondaryText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 13 },
  deleteButton: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', paddingHorizontal: 3 },
  deleteText: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 11 },
  deleteConfirm: { marginTop: 4, padding: 14, borderRadius: 18, backgroundColor: HearthTheme.color.dangerSoft, borderWidth: 1, borderColor: HearthTheme.color.coral },
  deleteTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 18, lineHeight: 22 },
  deleteBody: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  deleteAction: { minHeight: HearthTheme.touch.minimum, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: HearthTheme.color.danger, backgroundColor: HearthTheme.color.parchmentRaised },
  deleteActionText: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12 },
  plantCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 22, backgroundColor: HearthTheme.color.sageSoft, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  sprout: { width: 38, height: 44 },
  stem: { position: 'absolute', left: 18, top: 12, width: 3, height: 30, borderRadius: 2, backgroundColor: HearthTheme.color.sage },
  leaf: { position: 'absolute', width: 17, height: 9, borderRadius: 10, backgroundColor: HearthTheme.color.sage },
  leftLeaf: { left: 3, top: 17, transform: [{ rotate: '26deg' }] },
  rightLeaf: { right: 1, top: 9, transform: [{ rotate: '-27deg' }] },
  plantCopy: { flex: 1 },
  plantTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 13, lineHeight: 17 },
  plantBody: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 10, lineHeight: 14, marginTop: 2 },
  plantButton: { minHeight: HearthTheme.touch.minimum, borderRadius: 16, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: HearthTheme.color.sage },
  plantButtonText: { color: HearthTheme.color.onAccent, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12 },
  openMemory: { minHeight: HearthTheme.touch.minimum, borderRadius: HearthTheme.radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: HearthTheme.space.lg, backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.sage },
  openMemoryText: { color: HearthTheme.color.success, fontFamily: HearthTheme.type.bodyStrong, fontSize: 13 },
  pressed: { opacity: 0.7 },
});
