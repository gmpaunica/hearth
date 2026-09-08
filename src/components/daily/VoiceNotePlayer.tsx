import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { createSignedMediaUrl, markMediaReceived } from '@/daily/api';
import type { DailyMediaItem, DiaryVoice } from '@/daily/model';
import { useDailyMediaStore } from '@/daily/store';
import { useAuthStore } from '@/state/authStore';
import { HearthTheme } from '@/theme/hearth';

interface Props {
  item?: DailyMediaItem | DiaryVoice | null;
  localUri?: string | null;
  label: string;
  onPlaybackChange?: (playing: boolean) => void;
}

const clock = (seconds: number) => `0:${Math.max(0, Math.round(seconds)).toString().padStart(2, '0')}`;

export function VoiceNotePlayer({ item, localUri, label, onPlaybackChange }: Props) {
  const player = useAudioPlayer(localUri ? { uri: localUri } : null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const markReceived = useDailyMediaStore((state) => state.markReceived);
  const userId = useAuthStore((state) => state.userId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedPath, setLoadedPath] = useState<string | null>(localUri ?? null);

  useEffect(() => {
    onPlaybackChange?.(status.playing);
    return () => onPlaybackChange?.(false);
  }, [onPlaybackChange, status.playing]);

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    setError(null);
    try {
      if (!localUri && item && loadedPath !== item.storage_path) {
        setLoading(true);
        const url = await createSignedMediaUrl(item.storage_path);
        player.replace({ uri: url });
        setLoadedPath(item.storage_path);
      }
      if (status.didJustFinish) await player.seekTo(0);
      player.play();
      if (item && item.author_id !== userId && !item.receipt) {
        if ('medium' in item) void markReceived(item, 'voice_playback_started');
        else void markMediaReceived(item.id, 'voice_playback_started');
      }
    } catch {
      if (!localUri) setLoadedPath(null);
      setError('Couldn’t play this note. Try again when you’re ready.');
    } finally {
      setLoading(false);
    }
  };

  const duration = status.duration || ((item?.duration_ms ?? 0) / 1000);
  return (
    <View>
      <Pressable
        style={({ pressed }) => [styles.player, pressed && styles.pressed]}
        onPress={() => void toggle()}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={`${error ? 'Try again playing' : status.playing ? 'Pause' : 'Play'} ${label}`}
        accessibilityHint="Playback starts only when you choose this button"
        accessibilityState={{ busy: loading }}
      >
        <View style={styles.playDisc} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {loading ? (
            <View style={styles.loadingDots}><View style={styles.loadingDot} /><View style={styles.loadingDot} /><View style={styles.loadingDot} /></View>
          ) : status.playing ? (
            <View style={styles.pauseIcon}><View style={styles.pauseBar} /><View style={styles.pauseBar} /></View>
          ) : (
            <View style={styles.playTriangle} />
          )}
        </View>
        <View style={styles.track}>
          <View style={[styles.progress, {
            width: `${duration > 0 ? Math.min(100, (status.currentTime / duration) * 100) : 0}%`,
          }]} />
        </View>
        <Text style={styles.time}>{clock(status.playing ? status.currentTime : duration)}</Text>
      </Pressable>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  player: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10 },
  playDisc: {
    width: 45, height: 45, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    backgroundColor: HearthTheme.color.clayPressed,
  },
  playTriangle: { width: 0, height: 0, marginLeft: 3, borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 11, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: HearthTheme.color.onAccent },
  pauseIcon: { flexDirection: 'row', gap: 4 },
  pauseBar: { width: 4, height: 15, borderRadius: 2, backgroundColor: HearthTheme.color.onAccent },
  loadingDots: { flexDirection: 'row', gap: 3 },
  loadingDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: HearthTheme.color.onAccent },
  track: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: HearthTheme.color.coralSoft },
  progress: { height: '100%', borderRadius: 4, backgroundColor: HearthTheme.color.coral },
  time: { width: 38, color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.bodyStrong, fontSize: 11 },
  error: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.body, fontSize: 11, marginTop: 4 },
  pressed: { opacity: 0.72 },
});
