import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useAuthStore } from '@/state/authStore';
import { usePrivacyStore } from '@/state/privacyStore';
import { HearthTheme } from '@/theme/hearth';

type Setup = 'idle' | 'email' | 'email-code' | 'device-pin' | 'local-pin';

export function PrivacyControls() {
  const recoveryState = useAuthStore((state) => state.recoveryState);
  const recoveryEmail = useAuthStore((state) => state.recoveryEmail);
  const busy = useAuthStore((state) => state.busy);
  const authError = useAuthStore((state) => state.error);
  const clearAuthError = useAuthStore((state) => state.clearError);
  const linkRecoveryEmail = useAuthStore((state) => state.linkRecoveryEmail);
  const verifyRecoveryEmail = useAuthStore((state) => state.verifyRecoveryEmail);
  const resendRecoveryEmail = useAuthStore((state) => state.resendRecoveryEmail);

  const preferences = usePrivacyStore((state) => state.preferences);
  const deviceAvailable = usePrivacyStore((state) => state.deviceAuthenticationAvailable);
  const privacyError = usePrivacyStore((state) => state.error);
  const setLockMode = usePrivacyStore((state) => state.setLockMode);
  const setDeviceLock = usePrivacyStore((state) => state.setDeviceLock);
  const setPin = usePrivacyStore((state) => state.setPin);
  const setNotificationPrivacy = usePrivacyStore((state) => state.setNotificationPrivacy);
  const clearPrivacyError = usePrivacyStore((state) => state.clearError);

  const [setup, setSetup] = useState<Setup>('idle');
  const [email, setEmail] = useState(recoveryEmail ?? '');
  const [code, setCode] = useState('');
  const [pin, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [notice, setNotice] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const localPinHasEscape = recoveryState === 'recoverable' || deviceAvailable;

  const resetSetup = () => {
    setSetup('idle');
    setCode('');
    setPinValue('');
    setConfirmPin('');
    setNotice(null);
    clearAuthError();
    clearPrivacyError();
  };

  const beginSetup = (next: Setup) => {
    setSetup(next);
    setNotice(null);
    clearAuthError();
    clearPrivacyError();
  };

  const saveLock = async () => {
    if (pin !== confirmPin) {
      setNotice({ message: 'Those PINs do not match yet.', tone: 'error' });
      return;
    }
    const ok = setup === 'device-pin' ? await setDeviceLock(pin) : await setPin(pin);
    if (ok) {
      resetSetup();
      setNotice({
        message: setup === 'device-pin' ? 'Device unlock and fallback PIN are ready.' : 'Your local PIN is ready.',
        tone: 'success',
      });
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.block}>
        <Text style={styles.label}>Account recovery</Text>
        <Text style={styles.hint}>
          {recoveryState === 'recoverable'
            ? `Verified for ${recoveryEmail}. Your home can be recovered after reinstalling.`
            : recoveryState === 'pending'
              ? `Waiting for the six-digit code sent to ${recoveryEmail ?? email}.`
              : 'Optionally verify an email so reinstalling does not cost you your home.'}
        </Text>
        {recoveryState !== 'recoverable' && setup === 'idle' && (
          <SmallButton quiet label={recoveryState === 'pending' ? 'Enter verification code' : 'Add recovery email'} onPress={() => beginSetup(recoveryState === 'pending' ? 'email-code' : 'email')} />
        )}
        {(setup === 'email' || setup === 'email-code') && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(value) => { setEmail(value); setNotice(null); clearAuthError(); }}
              placeholder="you@example.com"
              placeholderTextColor={HearthTheme.color.inkFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!busy && setup === 'email'}
              accessibilityLabel="Recovery email"
            />
            {setup === 'email-code' && (
              <TextInput
                style={[styles.input, styles.pinInput]}
                value={code}
                onChangeText={(value) => { setCode(value.replace(/\D/g, '').slice(0, 6)); setNotice(null); clearAuthError(); }}
                placeholder="123456"
                placeholderTextColor={HearthTheme.color.inkFaint}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
                editable={!busy}
                accessibilityLabel="Email verification code"
              />
            )}
            {!!authError && <Text accessibilityRole="alert" style={styles.error}>{authError.message}</Text>}
            <View style={styles.buttonRow}>
              <SmallButton label="Cancel" quiet disabled={busy} onPress={resetSetup} />
              <SmallButton
                label={setup === 'email' ? 'Send code' : 'Verify email'}
                disabled={busy || (setup === 'email' ? !email.includes('@') : code.length !== 6)}
                onPress={() => {
                  if (setup === 'email') void linkRecoveryEmail(email).then((ok) => ok && beginSetup('email-code'));
                  else void verifyRecoveryEmail(email, code).then((ok) => {
                    if (ok) { resetSetup(); setNotice({ message: 'Recovery email verified.', tone: 'success' }); }
                  });
                }}
              />
            </View>
            {setup === 'email-code' && (
              <SmallButton quiet label="Send a new code" disabled={busy} onPress={() => void resendRecoveryEmail(email).then((ok) => ok && setNotice({ message: 'A new code is on its way.', tone: 'success' }))} />
            )}
          </View>
        )}
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>App lock</Text>
        <Text style={styles.hint}>
          {preferences.appLockMode === 'device'
            ? 'Device unlock is on, with a six-digit local PIN fallback.'
            : preferences.appLockMode === 'pin'
              ? 'A six-digit local PIN protects Hearth after 30 seconds away.'
              : 'Lock Hearth on cold launch and after about 30 seconds away.'}
        </Text>
        {setup === 'idle' && (
          <View style={styles.choiceRow}>
            {preferences.appLockMode === 'off' ? (
              <>
                <SmallButton label="Use device unlock" quiet disabled={!deviceAvailable} onPress={() => beginSetup('device-pin')} />
                <SmallButton label="Use local PIN" quiet disabled={!localPinHasEscape} onPress={() => beginSetup('local-pin')} />
              </>
            ) : (
              <SmallButton label="Turn app lock off" quiet onPress={() => void setLockMode('off').then(() => setNotice({ message: 'App lock is off.', tone: 'success' }))} />
            )}
          </View>
        )}
        {(setup === 'device-pin' || setup === 'local-pin') && (
          <View style={styles.form}>
            <Text style={styles.formHint}>{setup === 'device-pin' ? 'Choose a PIN for fallback.' : 'Choose a local PIN.'}</Text>
            <TextInput secureTextEntry keyboardType="number-pad" maxLength={6} autoComplete="off" value={pin}
              onChangeText={(value) => { setPinValue(value.replace(/\D/g, '').slice(0, 6)); setNotice(null); clearPrivacyError(); }}
              placeholder="Six digits" placeholderTextColor={HearthTheme.color.inkFaint} style={[styles.input, styles.pinInput]} accessibilityLabel="New six-digit PIN" />
            <TextInput secureTextEntry keyboardType="number-pad" maxLength={6} autoComplete="off" value={confirmPin}
              onChangeText={(value) => { setConfirmPin(value.replace(/\D/g, '').slice(0, 6)); setNotice(null); clearPrivacyError(); }}
              placeholder="Repeat PIN" placeholderTextColor={HearthTheme.color.inkFaint} style={[styles.input, styles.pinInput]} accessibilityLabel="Repeat six-digit PIN" />
            {!!privacyError && <Text accessibilityRole="alert" style={styles.error}>{privacyError}</Text>}
            <View style={styles.buttonRow}>
              <SmallButton label="Cancel" quiet onPress={resetSetup} />
              <SmallButton label="Save lock" disabled={pin.length !== 6 || confirmPin.length !== 6} onPress={() => void saveLock()} />
            </View>
          </View>
        )}
        {setup === 'idle' && preferences.appLockMode === 'off' && !localPinHasEscape && (
          <Text style={styles.hint}>Verify a recovery email before choosing a PIN-only lock, so a forgotten PIN cannot strand your home.</Text>
        )}
      </View>

      <View style={[styles.block, styles.switchRow]}>
        <View style={styles.switchCopy}>
          <Text style={styles.label}>Gentle notification detail</Text>
          <Text style={styles.hint}>Off keeps every alert fully generic. On may name the feature, never its content.</Text>
        </View>
        <View style={styles.switchTarget}>
          <Switch
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            value={preferences.notificationPrivacy === 'gentle'}
            onValueChange={(enabled) => void setNotificationPrivacy(enabled ? 'gentle' : 'generic')}
            trackColor={{ true: HearthTheme.color.clayPressed, false: HearthTheme.color.twilightSoft }}
            thumbColor={HearthTheme.color.onAccent}
            accessibilityLabel="Gentle notification detail"
          />
        </View>
      </View>

      {!!notice && <Text accessibilityRole={notice.tone === 'error' ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[styles.notice, notice.tone === 'error' && styles.noticeError]}>{notice.message}</Text>}
    </View>
  );
}

function SmallButton({ label, onPress, quiet = false, disabled = false }: { label: string; onPress: () => void; quiet?: boolean; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.button, quiet && styles.buttonQuiet, pressed && styles.pressed, disabled && styles.disabled]}>
      <Text style={[styles.buttonText, quiet && styles.buttonTextQuiet]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  block: { gap: 7 },
  label: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 15 },
  hint: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 12, lineHeight: 17 },
  form: { gap: 8, marginTop: 4 },
  formHint: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12 },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: HearthTheme.color.lineStrong, backgroundColor: HearthTheme.color.parchmentRaised, paddingHorizontal: 13, color: HearthTheme.color.ink, fontFamily: HearthTheme.type.body, fontSize: 15 },
  pinInput: { textAlign: 'center', letterSpacing: 4, fontFamily: HearthTheme.type.bodyStrong },
  button: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: HearthTheme.color.ink, backgroundColor: HearthTheme.color.clayPressed, paddingHorizontal: 12 },
  buttonQuiet: { backgroundColor: HearthTheme.color.parchmentWarm, borderColor: HearthTheme.color.lineStrong },
  buttonText: { color: HearthTheme.color.onAccent, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, textAlign: 'center' },
  buttonTextQuiet: { color: HearthTheme.color.clayPressed },
  buttonRow: { flexDirection: 'row', gap: 8 },
  choiceRow: { gap: 7 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchCopy: { flex: 1 },
  switchTarget: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  error: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 17 },
  notice: { color: HearthTheme.color.success, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, lineHeight: 17 },
  noticeError: { color: HearthTheme.color.danger },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.45 },
});
