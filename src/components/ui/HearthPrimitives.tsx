import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { forwardRef, type ReactNode, useEffect, useRef } from 'react';

import { HearthTheme } from '@/theme/hearth';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

const HEARTH_PIXELS = [
  '   DD    ',
  '   DD    ',
  ' DDDDDDD ',
  'CCCCCCCCC',
  'CCCIIICCC',
  'CCIIIIICC',
  'CCIIYIICC',
  'CCIIIYICC',
  'CCCCCCCCC',
] as const;

const HEARTH_PIXEL_COLORS = {
  C: HearthTheme.color.clay,
  D: HearthTheme.color.clayPressed,
  I: HearthTheme.color.ink,
  Y: HearthTheme.color.gold,
} as const;

export function HearthScreen({ children }: { children: ReactNode }) {
  const { height } = useWindowDimensions();
  return (
    <SafeAreaView style={styles.safeArea} accessibilityViewIsModal>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.cover}>
          <View style={styles.pageShadow}>
            <View style={styles.page}>
              <Text pointerEvents="none" style={styles.wordmark}>HEARTH</Text>
              <View pointerEvents="none" style={styles.binding}>
                {Array.from({ length: 7 }, (_, index) => (
                  <View key={index} style={styles.bindingStitch} />
                ))}
              </View>
              <ScrollView
                contentContainerStyle={[
                  styles.pageContent,
                  height < 720 && styles.pageContentCompact,
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function StoryHearthMark() {
  return (
    <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {HEARTH_PIXELS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.pixelRow}>
          {[...row].map((pixel, columnIndex) => (
            <View
              key={columnIndex}
              style={[
                styles.hearthPixel,
                pixel !== ' ' && {
                  backgroundColor: HEARTH_PIXEL_COLORS[
                    pixel as keyof typeof HEARTH_PIXEL_COLORS
                  ],
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export function StoryProgress({ current, total }: { current: number; total: number }) {
  return (
    <View
      style={styles.progressWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: current }}
    >
      <Text style={styles.progressText}>Step {current} of {total}</Text>
      <View style={styles.progressTrack}>
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={[styles.progressSegment, index < current && styles.progressSegmentActive]}
          />
        ))}
      </View>
    </View>
  );
}

export function StoryHeading({
  children,
  focusKey,
}: {
  children: ReactNode;
  focusKey?: string;
}) {
  const headingRef = useRef<Text>(null);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const task = setTimeout(() => {
      const handle = findNodeHandle(headingRef.current);
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    }, HearthTheme.motion.quick);
    return () => clearTimeout(task);
  }, [focusKey]);

  return (
    <Text ref={headingRef} accessibilityRole="header" style={styles.heading}>
      {children}
    </Text>
  );
}

export function StoryBody({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function HearthButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  accessibilityHint?: string;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
      style={({ pressed }) => [
        styles.button,
        styles[`${variant}Button`],
        pressed && styles.buttonPressed,
        (disabled || busy) && styles.buttonDisabled,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator
          color={variant === 'primary' ? HearthTheme.color.onAccent : HearthTheme.color.clay}
        />
      ) : (
        <Text style={[styles.buttonLabel, styles[`${variant}Label`]]}>{label}</Text>
      )}
    </Pressable>
  );
}

export const HearthTextField = forwardRef<TextInput, TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
}>(({ label, hint, error, style, ...props }, ref) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      ref={ref}
      {...props}
      placeholderTextColor={HearthTheme.color.inkFaint}
      style={[styles.field, error && styles.fieldError, style]}
    />
    {!!error && <Text accessibilityRole="alert" style={styles.fieldErrorText}>{error}</Text>}
    {!error && !!hint && <Text style={styles.fieldHint}>{hint}</Text>}
  </View>
));
HearthTextField.displayName = 'HearthTextField';

export function HearthNotice({
  message,
  tone = 'neutral',
}: {
  message: string;
  tone?: 'neutral' | 'success' | 'error';
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.notice,
        tone === 'success' && styles.noticeSuccess,
        tone === 'error' && styles.noticeError,
      ]}
    >
      <Text style={[styles.noticeText, tone === 'error' && styles.noticeTextError]}>
        {message}
      </Text>
    </View>
  );
}

export function StoryActions({ children }: { children: ReactNode }) {
  return <View style={styles.actions}>{children}</View>;
}

const styles = StyleSheet.create({
  safeArea: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: HearthTheme.color.cover,
  },
  keyboard: { flex: 1 },
  cover: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: HearthTheme.color.cover,
  },
  pageShadow: {
    flex: 1,
    shadowColor: HearthTheme.shadow.color,
    shadowOpacity: HearthTheme.shadow.opacity,
    shadowRadius: HearthTheme.shadow.radius,
    shadowOffset: HearthTheme.shadow.offset,
    elevation: HearthTheme.shadow.elevation,
  },
  page: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: HearthTheme.radius.page,
    borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong,
    backgroundColor: HearthTheme.color.parchment,
  },
  wordmark: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    zIndex: 1,
    fontFamily: HearthTheme.type.bodyStrong,
    color: HearthTheme.color.ink,
    fontSize: 13,
    letterSpacing: 5,
  },
  binding: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 18,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: HearthTheme.color.coral,
    zIndex: 2,
  },
  bindingStitch: {
    width: 6,
    height: 22,
    borderRadius: HearthTheme.radius.pill,
    backgroundColor: HearthTheme.color.parchmentWarm,
    opacity: 0.82,
  },
  pageContent: {
    flexGrow: 1,
    paddingLeft: 42,
    paddingRight: HearthTheme.space.page,
    paddingTop: HearthTheme.space.xl,
    paddingBottom: HearthTheme.space.xl,
  },
  pageContentCompact: { paddingTop: HearthTheme.space.lg, paddingBottom: HearthTheme.space.lg },
  mark: {
    width: 63,
    height: 63,
    marginBottom: HearthTheme.space.xl,
    shadowColor: HearthTheme.color.clayPressed,
    shadowOpacity: 0.22,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
  },
  pixelRow: { flexDirection: 'row', height: 7 },
  hearthPixel: { width: 7, height: 7 },
  progressWrap: { marginBottom: HearthTheme.space.xxl, gap: HearthTheme.space.sm },
  progressText: {
    fontFamily: HearthTheme.type.bodyStrong,
    color: HearthTheme.color.inkMuted,
    fontSize: HearthTheme.type.caption,
    lineHeight: HearthTheme.type.captionLine,
  },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: HearthTheme.radius.pill,
    backgroundColor: HearthTheme.color.twilightSoft,
  },
  progressSegmentActive: { backgroundColor: HearthTheme.color.coral },
  heading: {
    maxWidth: 330,
    fontFamily: HearthTheme.type.display,
    color: HearthTheme.color.ink,
    fontSize: HearthTheme.type.displayLarge,
    lineHeight: HearthTheme.type.displayLine,
    marginBottom: HearthTheme.space.md,
  },
  body: {
    maxWidth: 350,
    fontFamily: HearthTheme.type.body,
    color: HearthTheme.color.inkMuted,
    fontSize: HearthTheme.type.bodySize,
    lineHeight: HearthTheme.type.bodyLine,
  },
  actions: { marginTop: 'auto', paddingTop: HearthTheme.space.xxl, gap: HearthTheme.touch.gap },
  button: {
    minHeight: HearthTheme.touch.minimum,
    borderRadius: HearthTheme.radius.md,
    borderWidth: 1,
    paddingHorizontal: HearthTheme.space.lg,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  primaryButton: {
    backgroundColor: HearthTheme.color.clayPressed,
    borderColor: HearthTheme.color.ink,
    shadowColor: HearthTheme.color.clayPressed,
    shadowOpacity: 0.24,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  secondaryButton: { backgroundColor: HearthTheme.color.sageSoft, borderColor: HearthTheme.color.sage },
  quietButton: { backgroundColor: 'transparent', borderColor: 'transparent' },
  dangerButton: { backgroundColor: HearthTheme.color.dangerSoft, borderColor: HearthTheme.color.danger },
  buttonPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  buttonDisabled: { opacity: 0.46 },
  buttonLabel: {
    fontFamily: HearthTheme.type.bodyStrong,
    fontSize: HearthTheme.type.label,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryLabel: { color: HearthTheme.color.onAccent },
  secondaryLabel: { color: HearthTheme.color.ink },
  quietLabel: { color: HearthTheme.color.clayPressed },
  dangerLabel: { color: HearthTheme.color.danger },
  fieldWrap: { marginTop: HearthTheme.space.xl, gap: 7 },
  fieldLabel: {
    fontFamily: HearthTheme.type.bodyStrong,
    color: HearthTheme.color.ink,
    fontSize: HearthTheme.type.label,
  },
  field: {
    minHeight: 54,
    borderRadius: HearthTheme.radius.md,
    borderWidth: 1,
    borderColor: HearthTheme.color.lineStrong,
    backgroundColor: HearthTheme.color.parchmentRaised,
    paddingHorizontal: HearthTheme.space.lg,
    paddingVertical: 12,
    fontFamily: HearthTheme.type.body,
    color: HearthTheme.color.ink,
    fontSize: HearthTheme.type.bodySize,
  },
  fieldError: { borderColor: HearthTheme.color.danger },
  fieldHint: {
    fontFamily: HearthTheme.type.body,
    color: HearthTheme.color.inkMuted,
    fontSize: HearthTheme.type.caption,
    lineHeight: HearthTheme.type.captionLine,
  },
  fieldErrorText: {
    fontFamily: HearthTheme.type.bodyStrong,
    color: HearthTheme.color.danger,
    fontSize: HearthTheme.type.caption,
    lineHeight: HearthTheme.type.captionLine,
  },
  notice: {
    marginTop: HearthTheme.space.lg,
    borderRadius: HearthTheme.radius.md,
    borderWidth: 1,
    borderColor: HearthTheme.color.line,
    backgroundColor: HearthTheme.color.twilightSoft,
    padding: HearthTheme.space.md,
  },
  noticeSuccess: { backgroundColor: HearthTheme.color.successSoft, borderColor: HearthTheme.color.sage },
  noticeError: { backgroundColor: HearthTheme.color.dangerSoft, borderColor: HearthTheme.color.danger },
  noticeText: {
    fontFamily: HearthTheme.type.bodyStrong,
    color: HearthTheme.color.ink,
    fontSize: HearthTheme.type.caption,
    lineHeight: HearthTheme.type.captionLine,
  },
  noticeTextError: { color: HearthTheme.color.danger },
});
