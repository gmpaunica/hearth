import * as ScreenCapture from 'expo-screen-capture';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, TextInput, View } from 'react-native';

import { useAuthStore } from '@/state/authStore';
import { usePrivacyStore } from '@/state/privacyStore';
import { HearthTheme } from '@/theme/hearth';
import {
  HearthButton,
  HearthNotice,
  HearthScreen,
  HearthTextField,
  StoryActions,
  StoryBody,
  StoryHeading,
  StoryHearthMark,
} from './ui/HearthPrimitives';

const LOCK_AFTER_MS = 30_000;
const CAPTURE_KEY = 'hearth-paired-home';

/** Protects recent-app previews for paired homes and gates the UI after rest. */
export function AppPrivacyGate() {
  const privacyPreview = __DEV__ && Platform.OS === 'web' && typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('hearthPrivacyPreview')
    : null;
  const previewLocked = privacyPreview === 'lock' || privacyPreview === 'forgot';
  const paired = useAuthStore((state) => state.phase === 'paired');
  const recoveryState = useAuthStore((state) => state.recoveryState);
  const recoveryEmail = useAuthStore((state) => state.recoveryEmail);
  const authBusy = useAuthStore((state) => state.busy);
  const authError = useAuthStore((state) => state.error);
  const requestAccountRecovery = useAuthStore((state) => state.requestAccountRecovery);
  const completeAccountRecovery = useAuthStore((state) => state.completeAccountRecovery);
  const clearAuthError = useAuthStore((state) => state.clearError);
  const hydrated = usePrivacyStore((state) => state.hydrated);
  const hydratedForPaired = usePrivacyStore((state) => state.hydratedForPaired);
  const locked = usePrivacyStore((state) => state.locked);
  const preferences = usePrivacyStore((state) => state.preferences);
  const error = usePrivacyStore((state) => state.error);
  const hydrate = usePrivacyStore((state) => state.hydrate);
  const lock = usePrivacyStore((state) => state.lock);
  const unlockWithDevice = usePrivacyStore((state) => state.unlockWithDevice);
  const unlockWithPin = usePrivacyStore((state) => state.unlockWithPin);
  const setLockMode = usePrivacyStore((state) => state.setLockMode);
  const deviceAuthenticationAvailable = usePrivacyStore((state) => state.deviceAuthenticationAvailable);
  const clearError = usePrivacyStore((state) => state.clearError);
  const backgroundedAt = useRef<number | null>(null);
  const pinRef = useRef<TextInput>(null);
  const [pin, setPin] = useState('');
  const [recovering, setRecovering] = useState(privacyPreview === 'forgot');
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState('');
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);

  useEffect(() => {
    void hydrate(paired);
  }, [hydrate, paired]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (paired) {
      void ScreenCapture.preventScreenCaptureAsync(CAPTURE_KEY);
      return () => { void ScreenCapture.allowScreenCaptureAsync(CAPTURE_KEY); };
    }
    void ScreenCapture.allowScreenCaptureAsync(CAPTURE_KEY);
  }, [paired]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAt.current ??= Date.now();
        return;
      }
      if (nextState === 'active') {
        const elapsed = backgroundedAt.current == null ? 0 : Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (paired && elapsed >= LOCK_AFTER_MS) lock();
      }
    });
    return () => subscription.remove();
  }, [lock, paired]);

  useEffect(() => {
    if (locked && preferences.appLockMode === 'device') void unlockWithDevice();
  }, [locked, preferences.appLockMode, unlockWithDevice]);

  if (!previewLocked && (!paired || (hydrated && hydratedForPaired === true && !locked))) return null;

  if (!previewLocked && paired && hydratedForPaired !== true) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <HearthScreen>
          <StoryHearthMark />
          <StoryHeading focusKey="privacy-loading">Tucking your home away…</StoryHeading>
          <StoryBody>Checking this phone’s private access settings.</StoryBody>
        </HearthScreen>
      </View>
    );
  }

  const effectiveMode = previewLocked ? 'device' : preferences.appLockMode;
  const hasPin = previewLocked || !!preferences.pinDigest;
  const effectiveRecoveryEmail = privacyPreview === 'forgot' ? 'alex@example.com' : recoveryEmail;
  const canRecoverPin = !previewLocked && recoveryState === 'recoverable' && !!effectiveRecoveryEmail;

  const cancelRecovery = () => {
    setRecovering(false);
    setRecoverySent(false);
    setRecoveryToken('');
    setRecoveryNotice(null);
    clearAuthError();
  };

  const finishRecovery = async () => {
    if (!effectiveRecoveryEmail) return;
    const recovered = await completeAccountRecovery(effectiveRecoveryEmail, recoveryToken);
    if (!recovered) return;
    await setLockMode('off');
    setRecoveryNotice('Access restored. App lock is off until you choose a new lock in Settings.');
  };
  return (
    <View style={StyleSheet.absoluteFill}>
      <HearthScreen>
        <StoryHearthMark />
        <StoryHeading focusKey="app-lock">Your home is tucked away.</StoryHeading>
        <StoryBody>Unlock this phone to return to your private Hearth.</StoryBody>
        {!recovering && hasPin && (
          <HearthTextField
            ref={pinRef}
            label="Six-digit PIN"
            value={pin}
            onChangeText={(value) => {
              setPin(value.replace(/\D/g, '').slice(0, 6));
              if (error) clearError();
            }}
            placeholder="Enter 6 digits"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            autoComplete="off"
            style={styles.pin}
            onSubmitEditing={() => {
              if (pin.length === 6) void unlockWithPin(pin).then((ok) => ok && setPin(''));
            }}
          />
        )}
        {!recovering && !!error && <HearthNotice tone="error" message={error} />}
        {recovering ? (
          <>
            <StoryBody>
              {recoverySent
                ? `Enter the code sent to ${maskEmail(effectiveRecoveryEmail ?? '')}.`
                : `We can verify ${maskEmail(effectiveRecoveryEmail ?? '')} before turning this phone’s app lock off.`}
            </StoryBody>
            {recoverySent && !recoveryNotice && (
              <HearthTextField
                label="Recovery code"
                value={recoveryToken}
                onChangeText={(value) => {
                  setRecoveryToken(value.replace(/\D/g, '').slice(0, 6));
                  clearAuthError();
                }}
                placeholder="Enter 6 digits"
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                style={styles.pin}
              />
            )}
            {!!authError && <HearthNotice tone="error" message={authError.message} />}
            {!!recoveryNotice && <HearthNotice tone="success" message={recoveryNotice} />}
            {!recoveryNotice && (
              <StoryActions>
                <HearthButton
                  label={recoverySent ? 'Verify and unlock' : 'Send recovery code'}
                  disabled={authBusy || (recoverySent && recoveryToken.length !== 6)}
                  onPress={() => {
                    if (!effectiveRecoveryEmail) return;
                    if (recoverySent) void finishRecovery();
                    else void requestAccountRecovery(effectiveRecoveryEmail).then((ok) => ok && setRecoverySent(true));
                  }}
                />
                <HearthButton label="Cancel" variant="secondary" disabled={authBusy} onPress={cancelRecovery} />
              </StoryActions>
            )}
          </>
        ) : (
        <StoryActions>
          {(effectiveMode === 'device' || deviceAuthenticationAvailable) && (
            <HearthButton label="Use device unlock" onPress={() => void unlockWithDevice()} />
          )}
          {hasPin && (
            <HearthButton
              label="Use local PIN"
              variant={effectiveMode === 'device' ? 'secondary' : 'primary'}
              disabled={pin.length !== 6}
              onPress={() => void unlockWithPin(pin).then((ok) => ok && setPin(''))}
            />
          )}
          {canRecoverPin && (
            <HearthButton
              label="Forgot PIN? Recover access"
              variant="secondary"
              onPress={() => {
                clearError();
                clearAuthError();
                setRecovering(true);
              }}
            />
          )}
        </StoryActions>
        )}
      </HearthScreen>
    </View>
  );
}

function maskEmail(email: string): string {
  const [name = '', domain = ''] = email.split('@');
  if (!domain) return 'your verified email';
  const visible = name.slice(0, 1);
  return `${visible}${'•'.repeat(Math.max(2, Math.min(5, name.length - 1)))}@${domain}`;
}

const styles = StyleSheet.create({
  pin: {
    fontFamily: HearthTheme.type.bodyStrong,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
});
