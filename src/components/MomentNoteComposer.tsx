import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MOMENT_V2 } from '@/copy';
import { editorial, momentsTypography } from '@/theme/hearth';

interface MomentNoteComposerProps {
  value: string;
  onChange: (value: string) => void;
}

export function MomentNoteComposer({ value, onChange }: MomentNoteComposerProps) {
  const [open, setOpen] = useState(value.length > 0);
  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add an optional note"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.openRow, pressed && styles.pressed]}
      >
        <View style={styles.openCopy}>
          <Text style={styles.label}>{MOMENT_V2.noteLabel}</Text>
          <Text style={styles.optional}>{MOMENT_V2.noteOptional}</Text>
        </View>
        <Text style={styles.add}>Add</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.composer}>
      <View style={styles.composerHeader}>
        <Text style={styles.label}>Note</Text>
        {value.length >= 200 && <Text style={styles.count}>{value.length}/240</Text>}
      </View>
      <TextInput
        accessibilityLabel="Optional moment note"
        maxLength={240}
        multiline
        onChangeText={onChange}
        placeholder={MOMENT_V2.notePlaceholder}
        placeholderTextColor={editorial.inkFaint}
        returnKeyType="done"
        blurOnSubmit
        value={value}
        style={styles.input}
      />
      <View style={styles.composerFooter}>
        <Text style={styles.optional}>{MOMENT_V2.noteOptional}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove draft note"
          hitSlop={8}
          onPress={() => {
            onChange('');
            setOpen(false);
          }}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  openRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: editorial.lineStrong,
    borderRadius: 18,
    backgroundColor: '#FFF9F2',
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginTop: 10,
  },
  openCopy: { flex: 1, paddingRight: 12 },
  label: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 14 },
  optional: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  add: { color: editorial.clayDark, fontFamily: momentsTypography.bodyBold, fontSize: 14 },
  composer: {
    borderWidth: 1,
    borderColor: editorial.lineStrong,
    borderRadius: 18,
    backgroundColor: '#FFF9F2',
    padding: 12,
    marginTop: 10,
  },
  composerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  count: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 12, fontVariant: ['tabular-nums'] },
  input: {
    minHeight: 88,
    maxHeight: 132,
    borderWidth: 1,
    borderColor: editorial.lineStrong,
    borderRadius: 16,
    backgroundColor: editorial.paperStrong,
    color: editorial.ink,
    fontFamily: momentsTypography.body,
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: 12,
    paddingVertical: 11,
    textAlignVertical: 'top',
  },
  composerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  remove: { color: editorial.danger, fontFamily: momentsTypography.bodyBold, fontSize: 12, marginTop: 4 },
  pressed: { opacity: 0.65 },
});
