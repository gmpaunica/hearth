import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { WardrobePreview } from '@/scene/WardrobePreview';
import { WardrobeThumbnail, type WardrobeThumbnailFocus } from '@/scene/WardrobeThumbnail';
import {
  APPEARANCE_OPTIONS,
  applyCharacterPreset,
  type AppearanceCategory,
  type AvatarAppearance,
} from '@/state/avatarAppearance';
import { useAvatarStore } from '@/state/avatarStore';
import { editorial } from '@/theme/hearth';

type WardrobeSection = 'details' | 'mix' | 'outfits';
type DetailCategory = 'skinTone' | 'hair' | 'eyes' | 'face' | 'accessory';
type MixCategory = 'top' | 'bottom' | 'shoes';

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

export function Wardrobe() {
  const saved = useAvatarStore((s) => s.appearances[s.myAvatar]);
  const busy = useAvatarStore((s) => s.busy);
  const error = useAvatarStore((s) => s.error);
  const save = useAvatarStore((s) => s.save);
  const [draftOverride, setDraftOverride] = useState<AvatarAppearance | null>(null);
  const draft = draftOverride ?? saved;
  const [section, setSection] = useState<WardrobeSection>(() =>
    saved.outfit === 'none' ? 'mix' : 'outfits',
  );
  const [detailCategory, setDetailCategory] = useState<DetailCategory>('skinTone');
  const [mixCategory, setMixCategory] = useState<MixCategory>('top');
  const hasChanges = draftOverride !== null;

  const category: AppearanceCategory =
    section === 'details' ? detailCategory : section === 'mix' ? mixCategory : 'outfit';
  const options = useMemo(
    () =>
      section === 'outfits'
        ? APPEARANCE_OPTIONS.outfit.filter((option) => option.id !== 'none')
        : APPEARANCE_OPTIONS[category],
    [category, section],
  );

  const choose = (id: string) =>
    setDraftOverride((current) => {
      const base = current ?? saved;
      if (section === 'mix') return { ...base, [category]: id, outfit: 'none' };
      if (section === 'outfits') return applyCharacterPreset(base, id);
      return { ...base, [category]: id };
    });

  const previewFor = (id: string): AvatarAppearance => {
    if (section === 'mix') return { ...draft, [category]: id, outfit: 'none' };
    if (section === 'outfits') return applyCharacterPreset(draft, id);
    return { ...draft, [category]: id };
  };

  const thumbnailFocus: WardrobeThumbnailFocus =
    section === 'outfits'
      ? 'full'
      : section === 'mix'
        ? mixCategory
        : detailCategory === 'eyes'
          ? 'eyes'
          : detailCategory === 'accessory'
            ? 'accessory'
            : 'head';

  const cancel = () => {
    setDraftOverride(null);
    router.back();
  };

  const commit = async () => {
    await save(draft);
    if (!useAvatarStore.getState().error) router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            onPress={cancel}
            hitSlop={10}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>Your character</Text>
            <Text style={styles.title}>A little more like you</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <WardrobePreview appearance={draft} />
        <Text style={styles.caption}>
          Drag to see the full voxel look. Your choices preview here before you save them.
        </Text>

        <View style={styles.sectionTabs}>
          {SECTIONS.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.sectionTab, section === item.id && styles.sectionTabActive]}
              onPress={() => setSection(item.id)}
            >
              <Text style={[styles.sectionTabText, section === item.id && styles.sectionTabTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.modeHint}>
          {section === 'outfits'
            ? 'Choose one complete look. It replaces individual clothing pieces.'
            : section === 'mix'
              ? 'Build one look from separate tops, bottoms, and shoes.'
              : 'Shape the details that make your character feel like you.'}
        </Text>

        {section !== 'outfits' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {(section === 'details' ? DETAIL_CATEGORIES : MIX_CATEGORIES).map((item) => (
              <Pressable
                key={item.id}
                style={[styles.tab, category === item.id && styles.tabActive]}
                onPress={() => {
                  if (section === 'details') setDetailCategory(item.id as DetailCategory);
                  else setMixCategory(item.id as MixCategory);
                }}
              >
                <Text style={[styles.tabText, category === item.id && styles.tabTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.options}>
          {options.map((option) => {
            const selected =
              section === 'outfits'
                ? draft.outfit === option.id
                : section === 'mix'
                  ? draft.outfit === 'none' && draft[category] === option.id
                  : draft[category] === option.id;
            return (
              <Pressable
                key={option.id}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => choose(option.id)}
              >
                <WardrobeThumbnail appearance={previewFor(option.id)} focus={thumbnailFocus} />
                <View style={styles.optionCopy}>
                  <Text style={styles.optionText}>{option.label}</Text>
                  {option.description && <Text style={styles.optionDescription}>{option.description}</Text>}
                </View>
                {selected && (
                  <View style={styles.check}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <View style={styles.actionStatus}>
          <View style={[styles.statusDot, hasChanges && styles.statusDotActive]} />
          <Text style={styles.actionStatusText}>
            {hasChanges ? 'Unsaved changes' : 'Choose an item to customize'}
          </Text>
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.cancelButton} onPress={cancel} disabled={busy}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.save, (!hasChanges || busy) && styles.saveDisabled]}
            onPress={() => void commit()}
            disabled={busy || !hasChanges}
          >
            {busy ? (
              <ActivityIndicator color={editorial.onAccent} />
            ) : (
              <Text style={styles.saveText}>Save changes</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: editorial.canvas },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 136, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 54 },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: editorial.paper,
    borderColor: editorial.lineStrong,
    borderWidth: 1,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  backButtonPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  back: { color: editorial.clay, fontSize: 36, lineHeight: 37 },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 42 },
  kicker: {
    color: editorial.clay,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    color: editorial.ink,
    fontFamily: 'serif',
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '700',
    marginTop: 2,
  },
  caption: {
    color: editorial.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  sectionTabs: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 20,
    backgroundColor: editorial.paper,
    borderColor: editorial.line,
    borderWidth: 1,
  },
  sectionTab: { flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 5, borderRadius: 15 },
  sectionTabActive: { backgroundColor: editorial.clay },
  sectionTabText: { color: editorial.inkSoft, fontSize: 12, fontWeight: '700' },
  sectionTabTextActive: { color: editorial.onAccent },
  modeHint: {
    color: editorial.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  tabs: { gap: 8, paddingVertical: 2 },
  tab: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: editorial.paper,
    borderColor: editorial.line,
    borderWidth: 1,
  },
  tabActive: { backgroundColor: editorial.clayWash, borderColor: editorial.lineStrong },
  tabText: { color: editorial.inkSoft, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: editorial.clayDark, fontWeight: '800' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    // React Native Web uses content-box sizing for this percentage while
    // native includes padding. 43% keeps two cards and their padding inside a
    // narrow phone viewport on both renderers.
    width: '43%',
    minHeight: 170,
    alignItems: 'center',
    padding: 10,
    borderRadius: 20,
    backgroundColor: editorial.paper,
    borderWidth: 1,
    borderColor: editorial.line,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  optionSelected: {
    borderColor: editorial.clay,
    backgroundColor: editorial.claySoft,
    shadowOpacity: 0.15,
  },
  optionCopy: { width: '100%', alignItems: 'center', gap: 3, marginTop: 8 },
  optionText: { color: editorial.ink, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  optionDescription: {
    color: editorial.inkSoft,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: editorial.clay,
    borderColor: editorial.paperStrong,
    borderWidth: 1,
  },
  checkText: { color: editorial.onAccent, fontSize: 15, fontWeight: '800' },
  error: { color: editorial.danger, fontSize: 11, lineHeight: 14, marginTop: 2 },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: editorial.paper,
    borderTopWidth: 1,
    borderTopColor: editorial.lineStrong,
    gap: 8,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  actionStatus: { minHeight: 22, justifyContent: 'center' },
  statusDot: {
    position: 'absolute',
    left: 0,
    top: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: editorial.inkFaint,
  },
  statusDotActive: { backgroundColor: editorial.clay },
  actionStatusText: { color: editorial.inkSoft, fontSize: 12, paddingLeft: 16 },
  actions: { flexDirection: 'row', gap: 10 },
  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: editorial.paperTint,
    borderColor: editorial.line,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: editorial.ink, fontSize: 15, fontWeight: '700' },
  save: {
    flex: 1.4,
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: editorial.clay,
    borderColor: editorial.clayDark,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: { opacity: 0.45 },
  saveText: { color: editorial.onAccent, fontSize: 15, fontWeight: '800' },
});
