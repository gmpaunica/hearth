import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Share,
  StyleSheet,
  Text,
  type TextInput,
  View,
} from 'react-native';

import {
  HearthButton,
  HearthNotice,
  HearthScreen,
  HearthTextField,
  StoryActions,
  StoryBody,
  StoryHeading,
  StoryHearthMark,
  StoryProgress,
} from '@/components/ui/HearthPrimitives';
import { readFrontDoorPreview } from '@/components/frontDoorPreview';
import type { Couple } from '@/lib/db';
import { DomainError } from '@/lib/domainError';
import { useAuthStore } from '@/state/authStore';
import { HearthTheme } from '@/theme/hearth';
import { PrivateSurfaceShield } from './PrivateSurfaceShield';

type PairingMode = 'choose' | 'join' | 'recover';

export function Pairing() {
  const preview = readFrontDoorPreview();
  const phase = useAuthStore((state) => state.phase);
  const couple = useAuthStore((state) => state.couple);
  const busy = useAuthStore((state) => state.busy);
  const error = useAuthStore((state) => state.error);
  const createHome = useAuthStore((state) => state.createHome);
  const joinHome = useAuthStore((state) => state.joinHome);
  const unpair = useAuthStore((state) => state.unpair);
  const init = useAuthStore((state) => state.init);
  const clearError = useAuthStore((state) => state.clearError);
  const requestAccountRecovery = useAuthStore((state) => state.requestAccountRecovery);
  const completeAccountRecovery = useAuthStore((state) => state.completeAccountRecovery);

  const [mode, setMode] = useState<PairingMode>(preview === 'join' ? 'join' : 'choose');
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const codeRef = useRef<TextInput>(null);

  const previewCouple: Couple | null = preview === 'waiting' || preview === 'waiting-error'
    ? {
      id: 'visual-qa-home',
      invite_code: 'HEARTH',
      member_a: 'visual-qa-owner',
      member_b: null,
      created_at: '2026-01-01T00:00:00.000Z',
    }
    : null;
  const effectivePhase = preview === 'waiting-error'
    ? 'waiting'
    : preview === 'loading' || preview === 'waiting' || preview === 'error'
      ? preview
    : preview === 'choose' || preview === 'join'
      ? 'noHome'
      : phase;
  const effectiveCouple = previewCouple ?? couple;
  const effectiveError = preview === 'error' || preview === 'waiting-error'
    ? new DomainError('offline', preview === 'waiting-error' ? 'leave_home' : 'start', null)
    : error;
  const previewAction = (action: () => void) => preview ? undefined : action();

  useEffect(() => {
    if (effectivePhase === 'noHome' && mode === 'join') {
      const task = setTimeout(() => codeRef.current?.focus(), HearthTheme.motion.calm);
      return () => clearTimeout(task);
    }
  }, [effectivePhase, mode]);

  if (preview === 'welcome' || preview === 'name') return null;
  if (effectivePhase === 'paired') return null;

  if (effectivePhase === 'loading') {
    return (
      <HearthScreen>
        <View style={styles.loadingBody}>
          <StoryHearthMark />
          <StoryHeading focusKey="loading">Finding your way home…</StoryHeading>
          <ActivityIndicator color={HearthTheme.color.clay} size="large" />
          <StoryBody>Checking this phone and reconnecting securely.</StoryBody>
        </View>
      </HearthScreen>
    );
  }

  if (effectivePhase === 'error') {
    return (
      <HearthScreen>
        <StoryHearthMark />
        <StoryHeading focusKey="error">The path home is quiet.</StoryHeading>
        <StoryBody>{effectiveError?.message ?? 'Hearth couldn’t connect just now.'}</StoryBody>
        <HearthNotice
          tone="error"
          message="Your shared home has not been changed. Check your connection and try again."
        />
        <StoryActions>
          <HearthButton label="Try again" onPress={() => previewAction(() => void init())} busy={busy} />
        </StoryActions>
      </HearthScreen>
    );
  }

  if (effectivePhase === 'waiting' && effectiveCouple) {
    const inviteCode = effectiveCouple.invite_code;
    const copyCode = async () => {
      try {
        await Clipboard.setStringAsync(inviteCode);
        setFeedback('Code copied.');
      } catch {
        setFeedback('Couldn’t copy automatically. Press and hold the code to select it.');
      }
    };
    const shareCode = async () => {
      try {
        await Share.share({
          title: 'Join our Hearth home',
          message: `Join our private Hearth home with this code: ${inviteCode}`,
        });
      } catch {
        setFeedback('Sharing didn’t open. You can copy the code instead.');
      }
    };

    return (
      <HearthScreen>
        <StoryProgress current={3} total={3} />
        <StoryHeading focusKey="waiting">Leave the door open for them.</StoryHeading>
        <StoryBody>
          Send this one-time home code to your partner. Hearth will open when
          they arrive.
        </StoryBody>
        <View style={styles.codePanel} accessible accessibilityLabel={`Home code ${inviteCode.split('').join(' ')}`}>
          <Text selectable style={styles.code}>{inviteCode}</Text>
          <Text style={styles.codeCaption}>Private home code</Text>
        </View>
        <View style={styles.inlineActions}>
          <HearthButton label="Copy code" variant="secondary" onPress={() => void copyCode()} style={styles.flexButton} />
          <HearthButton label="Share code" variant="secondary" onPress={() => void shareCode()} style={styles.flexButton} />
        </View>
        {!!feedback && <HearthNotice tone={feedback === 'Code copied.' ? 'success' : 'error'} message={feedback} />}
        {!!effectiveError && <HearthNotice tone="error" message={effectiveError.message} />}
        <View style={styles.waitingRow} accessibilityLiveRegion="polite">
          <ActivityIndicator color={HearthTheme.color.sage} size="small" />
          <Text style={styles.waitingText}>Waiting for your partner…</Text>
        </View>
        <StoryActions>
          <HearthButton
            label="Start over"
            variant="quiet"
            onPress={() => previewAction(() => void unpair())}
            disabled={busy}
            accessibilityHint="Leaves this empty home and returns to pairing choices"
          />
        </StoryActions>
      </HearthScreen>
    );
  }

  if (mode === 'join') {
    const ready = code.length === 6;
    return (
      <HearthScreen>
        <StoryProgress current={3} total={3} />
        <StoryHeading focusKey="join">Enter their home code.</StoryHeading>
        <StoryBody>Use the six letters and numbers your partner shared.</StoryBody>
        <HearthTextField
          ref={codeRef}
          label="Home code"
          value={code}
          onChangeText={(value) => {
            setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
            if (error) clearError();
          }}
          placeholder="ABC123"
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          maxLength={6}
          editable={!busy}
          returnKeyType="join"
          onSubmitEditing={() => ready && !preview && void joinHome(code)}
          accessibilityHint="Six-character code from your partner"
          style={styles.codeInput}
          hint="Codes use letters and numbers only."
          error={effectiveError?.message}
        />
        <StoryActions>
          <HearthButton
            label="Join our home"
            onPress={() => previewAction(() => void joinHome(code))}
            disabled={!ready}
            busy={busy}
          />
          <HearthButton
            label="Back"
            variant="quiet"
            disabled={busy}
            onPress={() => {
              clearError();
              setCode('');
              setMode('choose');
            }}
          />
        </StoryActions>
      </HearthScreen>
    );
  }

  if (mode === 'recover') {
    const emailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail.trim());
    const tokenReady = recoveryToken.length === 6;
    return (
      <HearthScreen>
        <PrivateSurfaceShield surface="account-recovery" />
        <StoryProgress current={3} total={3} />
        <StoryHeading focusKey={recoverySent ? 'recover-code' : 'recover-email'}>
          {recoverySent ? 'Check your private inbox.' : 'Find your existing home.'}
        </StoryHeading>
        <StoryBody>
          {recoverySent
            ? `Enter the newest six-digit code sent to ${recoveryEmail.trim().toLowerCase()}.`
            : 'Use the verified email you previously added to Hearth. No partner content is sent by email.'}
        </StoryBody>
        <HearthTextField
          label="Recovery email"
          value={recoveryEmail}
          onChangeText={(value) => {
            setRecoveryEmail(value);
            setRecoverySent(false);
            setRecoveryToken('');
            if (error) clearError();
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          editable={!busy}
        />
        {recoverySent && (
          <HearthTextField
            label="Six-digit code"
            value={recoveryToken}
            onChangeText={(value) => {
              setRecoveryToken(value.replace(/\D/g, '').slice(0, 6));
              if (error) clearError();
            }}
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            editable={!busy}
            style={styles.codeInput}
            error={effectiveError?.message}
          />
        )}
        {!recoverySent && !!effectiveError && <HearthNotice tone="error" message={effectiveError.message} />}
        <StoryActions>
          <HearthButton
            label={recoverySent ? 'Open my home' : 'Email me a code'}
            disabled={recoverySent ? !tokenReady : !emailReady}
            busy={busy}
            onPress={() => {
              if (preview) return;
              if (recoverySent) void completeAccountRecovery(recoveryEmail, recoveryToken);
              else void requestAccountRecovery(recoveryEmail).then(setRecoverySent);
            }}
          />
          <HearthButton
            label="Back"
            variant="quiet"
            disabled={busy}
            onPress={() => {
              clearError();
              setRecoverySent(false);
              setRecoveryToken('');
              setMode('choose');
            }}
          />
        </StoryActions>
      </HearthScreen>
    );
  }

  return (
    <HearthScreen>
      <StoryProgress current={3} total={3} />
      <StoryHeading focusKey="choose">How will you meet at home?</StoryHeading>
      <StoryBody>
        One person creates the home. The other joins with the private code they
        receive.
      </StoryBody>
      {!!effectiveError && <HearthNotice tone="error" message={effectiveError.message} />}
      <StoryActions>
        <HearthButton
          label="Create our home"
          onPress={() => previewAction(() => void createHome())}
          busy={busy}
          accessibilityHint="Creates a private home and shows a code for your partner"
        />
        <HearthButton
          label="Join with a code"
          variant="secondary"
          onPress={() => {
            clearError();
            setMode('join');
          }}
          disabled={busy}
        />
        <HearthButton
          label="Recover an existing home"
          variant="quiet"
          onPress={() => {
            clearError();
            setMode('recover');
          }}
          disabled={busy}
        />
      </StoryActions>
    </HearthScreen>
  );
}

const styles = StyleSheet.create({
  loadingBody: { flex: 1, justifyContent: 'center', gap: HearthTheme.space.lg },
  codePanel: {
    marginTop: HearthTheme.space.xxl,
    paddingVertical: HearthTheme.space.xl,
    paddingHorizontal: HearthTheme.space.md,
    borderRadius: HearthTheme.radius.lg,
    borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong,
    backgroundColor: HearthTheme.color.parchmentWarm,
    alignItems: 'center',
    gap: HearthTheme.space.sm,
  },
  code: {
    fontFamily: HearthTheme.type.bodyStrong,
    color: HearthTheme.color.clayPressed,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: 7,
    textAlign: 'center',
  },
  codeCaption: {
    fontFamily: HearthTheme.type.body,
    color: HearthTheme.color.inkMuted,
    fontSize: HearthTheme.type.caption,
  },
  codeInput: {
    fontFamily: HearthTheme.type.bodyStrong,
    fontSize: 24,
    letterSpacing: 6,
    textAlign: 'center',
  },
  inlineActions: { flexDirection: 'row', gap: HearthTheme.touch.gap, marginTop: HearthTheme.space.md },
  flexButton: { flex: 1 },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: HearthTheme.space.sm, marginTop: HearthTheme.space.xl },
  waitingText: {
    fontFamily: HearthTheme.type.bodyStrong,
    color: HearthTheme.color.inkMuted,
    fontSize: HearthTheme.type.caption,
  },
});
