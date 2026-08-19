import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { chooseDailyPhoto, takeDailyPhoto, type ProcessedDailyPhoto } from '@/daily/photo';
import { mineFor, partnerFor } from '@/daily/model';
import { useDailyMediaStore } from '@/daily/store';
import { useAuthStore } from '@/state/authStore';
import { editorial, momentsTypography } from '@/theme/hearth';
import { DailyMediaScaffold } from './DailyMediaScaffold';
import { PrivatePhoto } from './PrivatePhoto';

export function DailyPhotoScreen() {
  const snapshot = useDailyMediaStore((state) => state.snapshot);
  const loading = useDailyMediaStore((state) => state.loading);
  const busy = useDailyMediaStore((state) => state.busy);
  const error = useDailyMediaStore((state) => state.error);
  const refresh = useDailyMediaStore((state) => state.refresh);
  const submitPhoto = useDailyMediaStore((state) => state.submitPhoto);
  const deleteArtifact = useDailyMediaStore((state) => state.deleteArtifact);
  const plantToday = useDailyMediaStore((state) => state.plantToday);
  const unplantToday = useDailyMediaStore((state) => state.unplantToday);
  const userId = useAuthStore((state) => state.userId);
  const [preview, setPreview] = useState<ProcessedDailyPhoto | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const mine = mineFor(snapshot, userId, 'photo');
  const partner = partnerFor(snapshot, userId, 'photo');

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  const pick = async (source: 'camera' | 'library') => {
    setLocalError(null);
    try {
      const processed = source === 'camera' ? await takeDailyPhoto() : await chooseDailyPhoto();
      if (processed) setPreview(processed);
    } catch (pickError) {
      setLocalError(pickError instanceof Error ? pickError.message : 'Couldn’t prepare that photo.');
    }
  };

  const send = async () => {
    if (preview && await submitPhoto(preview)) setPreview(null);
  };

  const confirmDelete = (id: string) => Alert.alert(
    'Delete your photo?',
    'This is permanent and will not reopen today’s photo slot.',
    [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteArtifact('photo', id) },
    ],
  );

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
      icon="▣"
      prompt={snapshot?.photo_prompt ?? null}
      sharedCopy={snapshot?.shared_prompt_copy}
    >
      {(error || localError) && <View style={styles.errorCard} accessibilityLiveRegion="polite"><Text style={styles.errorText}>{localError ?? error}</Text></View>}

      {!mine && !preview && (
        <View style={styles.takeCard}>
          <View style={styles.cameraArt}><View style={styles.lens} /></View>
          <Text style={styles.takeTitle}>One photo, just for today</Text>
          <Text style={styles.takeBody}>Take or choose a photo, adjust it, then preview the final 4:5 frame before Send.</Text>
          <View style={styles.row}>
            <Pressable
              style={({ pressed }) => [styles.primary, styles.flex, pressed && styles.pressed]}
              onPress={() => void pick('camera')}
              disabled={loading || busy != null}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
            ><Text style={styles.primaryText}>Take photo</Text></Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondary, styles.flex, pressed && styles.pressed]}
              onPress={() => void pick('library')}
              disabled={loading || busy != null}
              accessibilityRole="button"
              accessibilityLabel="Choose photo"
            ><Text style={styles.secondaryText}>Choose photo</Text></Pressable>
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
              onPress={() => setPreview(null)}
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
            ><Text style={styles.primaryText}>{busy === 'photo-upload' ? 'Sending…' : 'Send'}</Text></Pressable>
          </View>
        </View>
      )}

      {mine && (
        <View style={styles.photoCard}>
          <Text style={styles.answerLabel}>YOUR ANSWER</Text>
          <PrivatePhoto item={mine} accessibilityLabel="Your daily photo" />
          <Pressable
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            onPress={() => confirmDelete(mine.id)}
            disabled={busy != null}
            accessibilityRole="button"
            accessibilityLabel="Permanently delete your daily photo"
          ><Text style={styles.deleteText}>Delete my photo</Text></Pressable>
        </View>
      )}

      {partner && (
        <View style={[styles.photoCard, styles.partnerCard]}>
          <Text style={styles.answerLabel}>A PHOTO FOR YOU</Text>
          <PrivatePhoto item={partner} markViewed accessibilityLabel="Your partner’s daily photo" />
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
            onPress={() => snapshot.greenhouse_planted ? confirmUnplant() : void plantToday()}
            disabled={busy != null}
            accessibilityRole="button"
            accessibilityLabel={snapshot.greenhouse_planted ? 'Remove this day from the greenhouse' : 'Keep this day in the greenhouse'}
          ><Text style={styles.plantButtonText}>{snapshot.greenhouse_planted ? 'Remove' : 'Keep'}</Text></Pressable>
        </View>
      )}
    </DailyMediaScaffold>
  );
}

const styles = StyleSheet.create({
  errorCard: { borderRadius: 16, padding: 12, backgroundColor: '#f7ddd6', borderWidth: 1, borderColor: editorial.lineStrong },
  errorText: { color: editorial.danger, fontFamily: momentsTypography.bodyBold, fontSize: 12, lineHeight: 17 },
  takeCard: { borderRadius: 27, padding: 18, alignItems: 'center', backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.lineStrong },
  cameraArt: { width: 96, height: 72, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e4cfaa', borderWidth: 8, borderColor: editorial.rose },
  lens: { width: 39, height: 39, borderRadius: 20, backgroundColor: editorial.ink, borderWidth: 8, borderColor: '#9cb5aa' },
  takeTitle: { color: editorial.ink, fontFamily: momentsTypography.heading, fontSize: 22, marginTop: 13 },
  takeBody: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 310, marginTop: 4 },
  photoCard: { borderRadius: 24, padding: 13, backgroundColor: editorial.paper, borderWidth: 1, borderColor: editorial.lineStrong, gap: 8 },
  partnerCard: { backgroundColor: '#f6eadf' },
  answerLabel: { color: editorial.clay, fontFamily: momentsTypography.bodyBold, fontSize: 10, letterSpacing: 1.3, paddingHorizontal: 3 },
  row: { width: '100%', flexDirection: 'row', gap: 9, marginTop: 13 },
  flex: { flex: 1, minWidth: 0 },
  primary: { minHeight: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, backgroundColor: editorial.clay },
  primaryText: { color: editorial.onAccent, fontFamily: momentsTypography.bodyBold, fontSize: 13 },
  secondary: { minHeight: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, backgroundColor: editorial.paperTint, borderWidth: 1, borderColor: editorial.lineStrong },
  secondaryText: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 13 },
  deleteButton: { alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center', paddingHorizontal: 3 },
  deleteText: { color: editorial.danger, fontFamily: momentsTypography.bodyBold, fontSize: 11 },
  plantCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 22, backgroundColor: '#e7eadc', borderWidth: 1, borderColor: editorial.lineStrong },
  sprout: { width: 38, height: 44 },
  stem: { position: 'absolute', left: 18, top: 12, width: 3, height: 30, borderRadius: 2, backgroundColor: editorial.sage },
  leaf: { position: 'absolute', width: 17, height: 9, borderRadius: 10, backgroundColor: editorial.sage },
  leftLeaf: { left: 3, top: 17, transform: [{ rotate: '26deg' }] },
  rightLeaf: { right: 1, top: 9, transform: [{ rotate: '-27deg' }] },
  plantCopy: { flex: 1 },
  plantTitle: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 13, lineHeight: 17 },
  plantBody: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 10, lineHeight: 14, marginTop: 2 },
  plantButton: { minHeight: 42, borderRadius: 16, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.sage },
  plantButtonText: { color: editorial.onAccent, fontFamily: momentsTypography.bodyBold, fontSize: 12 },
  pressed: { opacity: 0.7 },
});
