import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { createSignedMediaUrl, markMediaReceived } from '@/daily/api';
import type { DailyMediaItem, DiaryVoice } from '@/daily/model';
import { useDailyMediaStore } from '@/daily/store';
import { useAuthStore } from '@/state/authStore';
import { editorial, momentsTypography } from '@/theme/hearth';

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
      setError('Couldn’t play this note.');
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
        accessibilityLabel={`${status.playing ? 'Pause' : 'Play'} ${label}`}
        accessibilityState={{ busy: loading }}
      >
        <View style={styles.playDisc}>
          <Text style={styles.playIcon}>{loading ? '…' : status.playing ? 'Ⅱ' : '▶'}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.progress, {
            width: `${duration > 0 ? Math.min(100, (status.currentTime / duration) * 100) : 0}%`,
          }]} />
        </View>
        <Text style={styles.time}>{clock(status.playing ? status.currentTime : duration)}</Text>
      </Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  player: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10 },
  playDisc: {
    width: 45, height: 45, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    backgroundColor: editorial.clay,
  },
  playIcon: { color: editorial.onAccent, fontFamily: momentsTypography.bodyBold, fontSize: 15, marginLeft: 1 },
  track: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: editorial.claySoft },
  progress: { height: '100%', borderRadius: 4, backgroundColor: editorial.rose },
  time: { width: 38, color: editorial.inkSoft, fontFamily: momentsTypography.bodyBold, fontSize: 11 },
  error: { color: editorial.danger, fontFamily: momentsTypography.body, fontSize: 11, marginTop: 4 },
  pressed: { opacity: 0.72 },
});
