import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuthStore } from '@/state/authStore';
import { APP_NAME, ui } from '@/theme/hearth';

/**
 * First-run onboarding: a warm one-screen intro to what Hearth is, then a
 * single question — your name. Shown only once, before pairing, and only while
 * the user is signed in but hasn't set a display name yet. Saving the name
 * (stored on their profile) dismisses it for good.
 */
export function Onboarding() {
  const phase = useAuthStore((s) => s.phase);
  const displayName = useAuthStore((s) => s.displayName);
  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const setDisplayName = useAuthStore((s) => s.setDisplayName);

  const [step, setStep] = useState<'intro' | 'name'>('intro');
  const [name, setName] = useState('');

  // Only for a signed-in, un-named user at the create/join gate.
  if (phase !== 'noHome' || displayName) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {step === 'intro' ? (
          <View style={styles.centered}>
            <Text style={styles.kicker}>{APP_NAME}</Text>
            <Text style={styles.title}>A quiet home for two</Text>
            <Text style={styles.body}>
              When words are hard, move to a place in the room — the fireplace,
              the sofa, the table — and your partner feels it, gently. No blame,
              no pressure. Just a soft way to say how you feel.
            </Text>
            <Pressable style={styles.primary} onPress={() => setStep('name')}>
              <Text style={styles.primaryText}>Begin</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.centered}>
            <Text style={styles.title}>What should we call you?</Text>
            <Text style={styles.body}>
              A first name or nickname — only your partner ever sees it.
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={ui.textDim}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={24}
              editable={!busy}
              returnKeyType="done"
              onSubmitEditing={() => setDisplayName(name)}
            />
            <Pressable
              style={styles.primary}
              onPress={() => setDisplayName(name)}
              disabled={busy || name.trim().length === 0}
            >
              {busy ? (
                <ActivityIndicator color={ui.text} />
              ) : (
                <Text style={styles.primaryText}>Continue</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() => setStep('intro')}
              disabled={busy}
            >
              <Text style={styles.secondaryText}>Back</Text>
            </Pressable>
            {error && <Text style={styles.err}>{error}</Text>}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(12, 8, 20, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: ui.overlayBg,
    borderColor: ui.overlayBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 26,
  },
  centered: { alignItems: 'center', gap: 14 },
  kicker: {
    color: ui.textDim,
    fontSize: 12,
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  title: { color: ui.text, fontSize: 22, textAlign: 'center' },
  body: { color: ui.textDim, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  primary: {
    marginTop: 6,
    backgroundColor: ui.chipActiveBg,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 22,
    alignSelf: 'stretch',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryText: { color: ui.text, fontSize: 16, letterSpacing: 0.3 },
  secondary: { paddingVertical: 8, paddingHorizontal: 16 },
  secondaryText: { color: ui.accent, fontSize: 14 },
  input: {
    alignSelf: 'stretch',
    backgroundColor: ui.chipBg,
    borderColor: ui.overlayBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: ui.text,
    fontSize: 18,
    textAlign: 'center',
  },
  err: { color: ui.danger, fontSize: 13, textAlign: 'center', marginTop: 4 },
});
