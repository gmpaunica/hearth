import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  HearthButton,
  HearthNotice,
  HearthScreen,
  StoryActions,
  StoryBody,
  StoryHeading,
  StoryHearthMark,
} from '@/components/ui/HearthPrimitives';
import { HearthTheme } from '@/theme/hearth';

export function AppLoadingScreen() {
  return (
    <HearthScreen>
      <View style={styles.loading} accessibilityLabel="Hearth is loading">
        <StoryHearthMark />
        <ActivityIndicator color={HearthTheme.color.clay} size="large" />
        <Text style={styles.loadingText}>Lighting the hearth…</Text>
      </View>
    </HearthScreen>
  );
}

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) console.error('[hearth:render]', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <HearthScreen>
        <StoryHearthMark />
        <StoryHeading focusKey="unexpected-error">Hearth needs a fresh start.</StoryHeading>
        <StoryBody>
          Something stopped this page from opening. Your shared home has not
          been changed.
        </StoryBody>
        <HearthNotice tone="error" message="Try opening the page again. If it returns, fully close and reopen Hearth." />
        <StoryActions>
          <HearthButton label="Try opening again" onPress={() => this.setState({ failed: false })} />
        </StoryActions>
      </HearthScreen>
    );
  }
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    gap: HearthTheme.space.lg,
  },
  loadingText: {
    fontFamily: HearthTheme.type.bodyStrong,
    color: HearthTheme.color.ink,
    fontSize: HearthTheme.type.bodySize,
  },
});
