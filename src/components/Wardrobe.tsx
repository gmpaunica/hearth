import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WardrobePreview } from '@/scene/WardrobePreview';
import { WardrobeThumbnail, type WardrobeThumbnailFocus } from '@/scene/WardrobeThumbnail';
import {
  APPEARANCE_OPTIONS,
  applyCharacterPreset,
  type AppearanceCategory,
  type AvatarAppearance,
} from '@/state/avatarAppearance';
import { useAvatarStore } from '@/state/avatarStore';
import { HearthTheme } from '@/theme/hearth';

type WardrobeSection = 'details' | 'mix' | 'outfits';
type DetailCategory = 'skinTone' | 'hair' | 'eyes' | 'face' | 'accessory';
type MixCategory = 'top' | 'bottom' | 'shoes';

interface WardrobeProps {
  reviewMode?: boolean;
  reviewDraft?: AvatarAppearance | null;
  reviewProfileReady?: boolean;
  reviewDiscardOpen?: boolean;
  reviewSaved?: boolean;
}

const SECTIONS: { id: WardrobeSection; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'mix', label: 'Mix & match' },
  { id: 'outfits', label: 'Outfits' },
];

const DETAIL_CATEGORIES: { id: DetailCategory; label: string }[] = [
  { id: 'skinTone', label: 'Skin' },
  { id: 'hair', label: 'Hair' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'face', label: 'Face' },
  { id: 'accessory', label: 'Accessory' },
];

const MIX_CATEGORIES: { id: MixCategory; label: string }[] = [
  { id: 'top', label: 'Tops' },
  { id: 'bottom', label: 'Bottoms' },
  { id: 'shoes', label: 'Shoes' },
];

export function Wardrobe({
  reviewMode = false,
  reviewDraft = null,
  reviewProfileReady,
  reviewDiscardOpen = false,
  reviewSaved = false,
}: WardrobeProps = {}) {
  const saved = useAvatarStore((state) => state.appearances[state.myAvatar]);
  const userId = useAvatarStore((state) => state.userId);
  const busy = useAvatarStore((state) => state.busy);
  const error = useAvatarStore((state) => state.error);
  const save = useAvatarStore((state) => state.save);
  const clearError = useAvatarStore((state) => state.clearError);
  const [draftOverride, setDraftOverride] = useState<AvatarAppearance | null>(reviewDraft);
  const draft = draftOverride ?? saved;
  const [section, setSection] = useState<WardrobeSection>(() => saved.outfit === 'none' ? 'mix' : 'outfits');
  const [detailCategory, setDetailCategory] = useState<DetailCategory>('skinTone');
  const [mixCategory, setMixCategory] = useState<MixCategory>('top');
  const [discardOpen, setDiscardOpen] = useState(reviewDiscardOpen);
  const [savedNotice, setSavedNotice] = useState(reviewSaved ? 'Your character is saved at home.' : null);
  const titleRef = useRef<Text>(null);
  const hasChanges = draftOverride !== null;
  const profileReady = reviewProfileReady ?? Boolean(userId);

  useEffect(() => {
    const timer = setTimeout(() => titleRef.current?.focus(), 220);
    return () => clearTimeout(timer);
  }, []);

  const category: AppearanceCategory = section === 'details' ? detailCategory : section === 'mix' ? mixCategory : 'outfit';
  const options = useMemo(
    () => section === 'outfits'
      ? APPEARANCE_OPTIONS.outfit.filter((option) => option.id !== 'none')
      : APPEARANCE_OPTIONS[category],
    [category, section],
  );

  const choose = (id: string) => {
    clearError();
    setSavedNotice(null);
    setDiscardOpen(false);
    setDraftOverride((current) => {
      const base = current ?? saved;
      if (section === 'mix') return { ...base, [category]: id, outfit: 'none' };
      if (section === 'outfits') return applyCharacterPreset(base, id);
      return { ...base, [category]: id };
    });
  };

  const previewFor = (id: string): AvatarAppearance => {
    if (section === 'mix') return { ...draft, [category]: id, outfit: 'none' };
    if (section === 'outfits') return applyCharacterPreset(draft, id);
    return { ...draft, [category]: id };
  };

  const thumbnailFocus: WardrobeThumbnailFocus = section === 'outfits'
    ? 'full'
    : section === 'mix'
      ? mixCategory
      : detailCategory === 'eyes'
        ? 'eyes'
        : detailCategory === 'accessory'
          ? 'accessory'
          : 'head';

  const leave = () => {
    if (reviewMode) return;
    router.back();
  };

  const requestLeave = () => {
    if (hasChanges) setDiscardOpen(true);
    else leave();
  };

  const discard = () => {
    setDraftOverride(null);
    setDiscardOpen(false);
    clearError();
    leave();
  };

  const commit = async () => {
    if (reviewMode) {
      setDraftOverride(null);
      setSavedNotice('Your character is saved at home.');
      return;
    }
    const confirmed = await save(draft);
    if (confirmed) {
      setDraftOverride(null);
      setSavedNotice('Your character is saved at home.');
    }
  };

  const switchSection = (next: WardrobeSection) => {
    setSection(next);
    setDiscardOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Back to home" accessibilityRole="button" onPress={requestLeave} hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>YOUR CHARACTER</Text>
            <Text ref={titleRef} accessible accessibilityRole="header" style={styles.title}>A little more like you</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <WardrobePreview appearance={draft} />
        <Text style={styles.caption}>Drag to turn your character. Every choice stays in preview until you save.</Text>

        {!profileReady && <View style={styles.lockedCard} accessibilityLiveRegion="polite">
          <Text style={styles.lockedTitle}>Finishing your wardrobe</Text>
          <Text style={styles.lockedBody}>You can try every look now. Save will open when your private profile is ready.</Text>
        </View>}
        {!!savedNotice && <View style={styles.savedCard} accessibilityLiveRegion="polite"><Text style={styles.savedText}>{savedNotice}</Text></View>}
        {!!error && <View style={styles.errorCard} accessibilityLiveRegion="polite">
          <Text style={styles.errorTitle}>Your preview is still here</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>}

        <View style={styles.sectionTabs} accessibilityRole="tablist">
          {SECTIONS.map((item) => (
            <Pressable key={item.id} style={[styles.sectionTab, section === item.id && styles.sectionTabActive]}
              onPress={() => switchSection(item.id)} accessibilityRole="tab" accessibilityLabel={item.label}
              accessibilityState={{ selected: section === item.id }}>
              <Text style={[styles.sectionTabText, section === item.id && styles.sectionTabTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.modeHint}>{section === 'outfits'
          ? 'Choose one complete look. It replaces the separate top, bottom, and shoes.'
          : section === 'mix'
            ? 'Build one look from separate tops, bottoms, and shoes.'
            : 'Choose the details that make this character feel like you.'}</Text>

        {section !== 'outfits' && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}
          accessibilityLabel={`${section === 'details' ? 'Character detail' : 'Clothing piece'} categories`}>
          {(section === 'details' ? DETAIL_CATEGORIES : MIX_CATEGORIES).map((item) => (
            <Pressable key={item.id} style={[styles.tab, category === item.id && styles.tabActive]}
              onPress={() => {
                if (section === 'details') setDetailCategory(item.id as DetailCategory);
                else setMixCategory(item.id as MixCategory);
              }} accessibilityRole="tab" accessibilityState={{ selected: category === item.id }}>
              <Text style={[styles.tabText, category === item.id && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>}

        <View style={styles.options} accessibilityLabel={`${section} choices`}>
          {options.map((option) => {
            const selected = section === 'outfits'
              ? draft.outfit === option.id
              : section === 'mix'
                ? draft.outfit === 'none' && draft[category] === option.id
                : draft[category] === option.id;
            return <Pressable key={option.id} style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
              onPress={() => choose(option.id)} accessibilityRole="button"
              accessibilityLabel={`${option.label}${option.description ? `. ${option.description}` : ''}`}
              accessibilityHint="Previews this choice on your character" accessibilityState={{ selected }}>
              <WardrobeThumbnail appearance={previewFor(option.id)} focus={thumbnailFocus} />
              <View style={styles.optionCopy}>
                <Text style={styles.optionText}>{option.label}</Text>
                {option.description && <Text style={styles.optionDescription}>{option.description}</Text>}
              </View>
              {selected && <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>}
            </Pressable>;
          })}
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        {discardOpen ? <View style={styles.discardPanel} accessibilityLiveRegion="polite">
          <View style={styles.discardCopy}><Text style={styles.discardTitle}>Discard these changes?</Text><Text style={styles.discardBody}>Your last saved character will stay at home.</Text></View>
          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={() => setDiscardOpen(false)} disabled={busy} accessibilityRole="button"><Text style={styles.cancelText}>Keep editing</Text></Pressable>
            <Pressable style={styles.discardButton} onPress={discard} disabled={busy} accessibilityRole="button"><Text style={styles.discardText}>Discard</Text></Pressable>
          </View>
        </View> : <>
          <Text style={styles.actionStatusText} accessibilityLiveRegion="polite">{busy ? 'Saving your character…' : hasChanges ? 'Previewing unsaved changes' : savedNotice ? 'Saved' : 'Your saved character is showing'}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={requestLeave} disabled={busy} accessibilityRole="button"><Text style={styles.cancelText}>{hasChanges ? 'Cancel' : 'Done'}</Text></Pressable>
            <Pressable style={[styles.save, (!hasChanges || busy || !profileReady) && styles.saveDisabled]}
              onPress={() => void commit()} disabled={busy || !hasChanges || !profileReady} accessibilityRole="button"
              accessibilityLabel={error ? 'Try saving character again' : 'Save character changes'}
              accessibilityState={{ disabled: busy || !hasChanges || !profileReady, busy }}>
              {busy ? <ActivityIndicator color={HearthTheme.color.onAccent} /> : <Text style={styles.saveText}>{error ? 'Try saving again' : 'Save changes'}</Text>}
            </Pressable>
          </View>
        </>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HearthTheme.color.parchment },
  scroll: { flex: 1 },
  content: { paddingHorizontal: HearthTheme.space.lg, paddingTop: HearthTheme.space.sm, paddingBottom: HearthTheme.space.xl, gap: HearthTheme.space.lg },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  backButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: HearthTheme.color.parchmentRaised, borderColor: HearthTheme.color.lineStrong, borderWidth: 1, elevation: 3 },
  back: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.display, fontSize: 36, lineHeight: 37 },
  headerCopy: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  headerSpacer: { width: 48 },
  kicker: { color: HearthTheme.color.clayPressed, fontFamily: HearthTheme.type.bodyStrong, fontSize: 10, letterSpacing: 1.7 },
  title: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 25, lineHeight: 30, textAlign: 'center', marginTop: 2 },
  caption: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 13, lineHeight: 19, textAlign: 'center', paddingHorizontal: 12 },
  lockedCard: { padding: 13, borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.twilightSoft, borderWidth: 1, borderColor: HearthTheme.color.lineStrong },
  lockedTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 16, lineHeight: 20 },
  lockedBody: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  savedCard: { padding: 12, borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.successSoft },
  savedText: { color: HearthTheme.color.success, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 17 },
  errorCard: { padding: 13, borderRadius: HearthTheme.radius.md, backgroundColor: HearthTheme.color.dangerSoft, borderWidth: 1, borderColor: HearthTheme.color.coral },
  errorTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 16, lineHeight: 20 },
  errorText: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 17, marginTop: 2 },
  sectionTabs: { flexDirection: 'row', gap: 5, padding: 4, borderRadius: 20, backgroundColor: HearthTheme.color.parchmentRaised, borderColor: HearthTheme.color.line, borderWidth: 1 },
  sectionTab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRadius: 15 },
  sectionTabActive: { backgroundColor: HearthTheme.color.clayPressed },
  sectionTabText: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, textAlign: 'center' },
  sectionTabTextActive: { color: HearthTheme.color.onAccent },
  modeHint: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 10 },
  tabs: { gap: 8, paddingVertical: 2 },
  tab: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 16, backgroundColor: HearthTheme.color.parchmentRaised, borderColor: HearthTheme.color.line, borderWidth: 1 },
  tabActive: { backgroundColor: HearthTheme.color.coralSoft, borderColor: HearthTheme.color.lineStrong },
  tabText: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.bodyStrong, fontSize: 13 },
  tabTextActive: { color: HearthTheme.color.clayPressed },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: { width: '43%', minHeight: 178, flexGrow: 1, alignItems: 'center', padding: 10, borderRadius: HearthTheme.radius.lg, backgroundColor: HearthTheme.color.parchmentRaised, borderWidth: 1, borderColor: HearthTheme.color.line, elevation: 2 },
  optionSelected: { borderWidth: 2, borderColor: HearthTheme.color.clayPressed, backgroundColor: HearthTheme.color.coralSoft },
  optionCopy: { width: '100%', alignItems: 'center', gap: 3, marginTop: 8 },
  optionText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 14, textAlign: 'center' },
  optionDescription: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 10, lineHeight: 14, textAlign: 'center' },
  check: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: HearthTheme.color.clayPressed, borderColor: HearthTheme.color.parchmentRaised, borderWidth: 1 },
  checkText: { color: HearthTheme.color.onAccent, fontFamily: HearthTheme.type.bodyStrong, fontSize: 16 },
  actionBar: { paddingHorizontal: HearthTheme.space.lg, paddingTop: 10, paddingBottom: 12, backgroundColor: HearthTheme.color.parchmentRaised, borderTopWidth: 1, borderTopColor: HearthTheme.color.lineStrong, gap: 8, elevation: 12 },
  actionStatusText: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 10 },
  cancelButton: { flex: 1, minHeight: 50, borderRadius: 17, backgroundColor: HearthTheme.color.parchmentWarm, borderColor: HearthTheme.color.lineStrong, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  cancelText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 14, textAlign: 'center' },
  save: { flex: 1.35, minHeight: 50, borderRadius: 17, backgroundColor: HearthTheme.color.clayPressed, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  saveDisabled: { opacity: 0.42 },
  saveText: { color: HearthTheme.color.onAccent, fontFamily: HearthTheme.type.bodyStrong, fontSize: 14, textAlign: 'center' },
  discardPanel: { gap: 9 },
  discardCopy: { gap: 1 },
  discardTitle: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.display, fontSize: 16, lineHeight: 20 },
  discardBody: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 11, lineHeight: 16 },
  discardButton: { flex: 1, minHeight: 50, borderRadius: 17, backgroundColor: HearthTheme.color.parchmentRaised, borderColor: HearthTheme.color.danger, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  discardText: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 14 },
  pressed: { opacity: 0.72 },
});
