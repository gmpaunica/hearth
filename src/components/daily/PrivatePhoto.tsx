import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { createSignedMediaUrl } from '@/daily/api';
import type { DailyMediaItem, GreenhousePhoto } from '@/daily/model';
import { useDailyMediaStore } from '@/daily/store';
import { HearthTheme } from '@/theme/hearth';

interface Props {
  item?: DailyMediaItem | GreenhousePhoto | null;
  localUri?: string | null;
  markViewed?: boolean;
  accessibilityLabel: string;
}

export function PrivatePhoto({ item, localUri, markViewed = false, accessibilityLabel }: Props) {
  const [signed, setSigned] = useState<{ path: string; uri: string | null; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const markReceived = useDailyMediaStore((state) => state.markReceived);

  useEffect(() => {
    let current = true;
    if (!localUri && item) {
      void createSignedMediaUrl(item.storage_path)
        .then((uri) => { if (current) setSigned({ path: item.storage_path, uri, error: false }); })
        .catch(() => { if (current) setSigned({ path: item.storage_path, uri: null, error: true }); });
    }
    return () => { current = false; };
  }, [attempt, item, localUri]);

  const uri = localUri ?? (item && signed?.path === item.storage_path ? signed.uri : null);
  const error = !localUri && !!item && signed?.path === item.storage_path && signed.error;
  if (error) return <View style={styles.placeholder}>
    <Text accessibilityRole="alert" style={styles.error}>Couldn’t open this private photo.</Text>
    <Pressable
      style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
      onPress={() => { setSigned(null); setAttempt((value) => value + 1); }}
      accessibilityRole="button"
      accessibilityLabel="Try opening private photo again"
    >
      <Text style={styles.retryText}>Try again</Text>
    </Pressable>
  </View>;
  if (!uri) return <View style={styles.placeholder}><Text style={styles.loading}>Opening photo…</Text></View>;
  return (
    <Image
      source={{ uri }}
      style={styles.photo}
      contentFit="cover"
      transition={120}
      accessibilityLabel={accessibilityLabel}
      onLoad={() => {
        if (markViewed && item && 'receipt' in item) {
          void markReceived(item, 'photo_viewed');
        }
      }}
      onError={() => { if (item) setSigned({ path: item.storage_path, uri: null, error: true }); }}
    />
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 5, borderRadius: 19, backgroundColor: HearthTheme.color.parchmentWarm },
  placeholder: { width: '100%', aspectRatio: 4 / 5, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: HearthTheme.color.parchmentWarm },
  loading: { color: HearthTheme.color.inkMuted, fontFamily: HearthTheme.type.body, fontSize: 12 },
  error: { color: HearthTheme.color.danger, fontFamily: HearthTheme.type.bodyStrong, fontSize: 12, textAlign: 'center', padding: 20 },
  retry: { minHeight: HearthTheme.touch.minimum, minWidth: 120, alignItems: 'center', justifyContent: 'center', borderRadius: HearthTheme.radius.md, borderWidth: 1, borderColor: HearthTheme.color.lineStrong, backgroundColor: HearthTheme.color.parchmentRaised },
  retryText: { color: HearthTheme.color.ink, fontFamily: HearthTheme.type.bodyStrong, fontSize: 13 },
  pressed: { opacity: 0.72 },
});
