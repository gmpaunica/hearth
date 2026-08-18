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
import { APP_NAME, editorial } from '@/theme/hearth';

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
              placeholderTextColor={editorial.inkFaint}
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
                <ActivityIndicator color={editorial.onAccent} />
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
    backgroundColor: editorial.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: editorial.paper,
    borderColor: editorial.lineStrong,
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: 28,
    paddingVertical: 30,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  centered: { alignItems: 'center', gap: 16 },
  kicker: {
    color: editorial.clay,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 4.5,
    textTransform: 'uppercase',
  },
  title: {
    color: editorial.ink,
    fontFamily: 'serif',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: editorial.inkSoft,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  primary: {
    marginTop: 6,
    backgroundColor: editorial.clay,
    borderColor: editorial.clayDark,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 22,
    alignSelf: 'stretch',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    shadowColor: editorial.clayDark,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryText: {
    color: editorial.onAccent,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  secondary: { paddingVertical: 8, paddingHorizontal: 16 },
  secondaryText: { color: editorial.clay, fontSize: 14, fontWeight: '700' },
  input: {
    alignSelf: 'stretch',
    backgroundColor: editorial.paperTint,
    borderColor: editorial.lineStrong,
    borderWidth: 1,
    borderRadius: 17,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: editorial.ink,
    fontSize: 18,
    textAlign: 'center',
  },
  err: { color: editorial.danger, fontSize: 13, textAlign: 'center', marginTop: 4 },
});
