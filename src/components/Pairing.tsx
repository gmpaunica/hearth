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
import { editorial } from '@/theme/hearth';

/**
 * The full-screen gate shown until two people share a home. It sits above the
 * scene and covers every pre-paired phase: connecting, choosing to create or
 * join, waiting on a partner with the invite code, and connection errors.
 * Once paired it renders nothing and the app proper shows through.
 */
export function Pairing() {
  const phase = useAuthStore((s) => s.phase);
  const couple = useAuthStore((s) => s.couple);
  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const createHome = useAuthStore((s) => s.createHome);
  const joinHome = useAuthStore((s) => s.joinHome);
  const unpair = useAuthStore((s) => s.unpair);
  const init = useAuthStore((s) => s.init);

  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [code, setCode] = useState('');

  if (phase === 'paired') return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {phase === 'loading' && (
          <View style={styles.centered}>
            <ActivityIndicator color={editorial.clay} />
            <Text style={styles.dim}>Lighting the hearth…</Text>
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.centered}>
            <Text style={styles.title}>Can’t reach home</Text>
            <Text style={styles.body}>{error ?? 'Please check your connection.'}</Text>
            <Pressable style={styles.primary} onPress={init} disabled={busy}>
              <Text style={styles.primaryText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {phase === 'waiting' && couple && (
          <View style={styles.centered}>
            <Text style={styles.title}>Your home is ready</Text>
            <Text style={styles.body}>
              Share this code with your partner so they can join you.
            </Text>
            <View style={styles.codeBox}>
              <Text style={styles.code}>{couple.invite_code}</Text>
            </View>
            <View style={styles.waitRow}>
              <ActivityIndicator color={editorial.clay} size="small" />
              <Text style={styles.dim}>Waiting for them to arrive…</Text>
            </View>
            {/* Always a way back out — e.g. if you created a home by mistake. */}
            <Pressable style={styles.secondary} onPress={unpair} disabled={busy}>
              <Text style={styles.secondaryText}>Start over</Text>
            </Pressable>
          </View>
        )}

        {phase === 'noHome' && mode === 'choose' && (
          <View style={styles.centered}>
            <Text style={styles.title}>Make a home together</Text>
            <Text style={styles.body}>
              One of you creates the home, the other joins with the code.
            </Text>
            <Pressable style={styles.primary} onPress={createHome} disabled={busy}>
              {busy ? (
                <ActivityIndicator color={editorial.onAccent} />
              ) : (
                <Text style={styles.primaryText}>Create a home</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() => setMode('join')}
              disabled={busy}
            >
              <Text style={styles.secondaryText}>I have a code</Text>
            </Pressable>
            {error && <Text style={styles.err}>{error}</Text>}
          </View>
        )}

        {phase === 'noHome' && mode === 'join' && (
          <View style={styles.centered}>
            <Text style={styles.title}>Join your partner</Text>
            <Text style={styles.body}>Enter the code they shared with you.</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor={editorial.inkFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              editable={!busy}
            />
            <Pressable
              style={styles.primary}
              onPress={() => joinHome(code)}
              disabled={busy || code.trim().length === 0}
            >
              {busy ? (
                <ActivityIndicator color={editorial.onAccent} />
              ) : (
                <Text style={styles.primaryText}>Join home</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() => setMode('choose')}
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
    paddingHorizontal: 26,
    paddingVertical: 28,
    shadowColor: editorial.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  centered: { alignItems: 'center', gap: 14 },
  title: {
    color: editorial.ink,
    fontFamily: 'serif',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: { color: editorial.inkSoft, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  dim: { color: editorial.inkSoft, fontSize: 13 },
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
  secondary: { paddingVertical: 10, paddingHorizontal: 16 },
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
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center',
  },
  codeBox: {
    marginVertical: 4,
    backgroundColor: editorial.paperTint,
    borderColor: editorial.lineStrong,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  code: { color: editorial.clay, fontSize: 34, letterSpacing: 10, fontWeight: '700' },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  err: { color: editorial.danger, fontSize: 13, textAlign: 'center', marginTop: 4 },
});
