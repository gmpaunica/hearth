import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { createSignedMediaUrl } from '@/daily/api';
import type { DailyMediaItem, GreenhousePhoto } from '@/daily/model';
import { useDailyMediaStore } from '@/daily/store';
import { editorial, momentsTypography } from '@/theme/hearth';

interface Props {
  item?: DailyMediaItem | GreenhousePhoto | null;
  localUri?: string | null;
  markViewed?: boolean;
  accessibilityLabel: string;
}

export function PrivatePhoto({ item, localUri, markViewed = false, accessibilityLabel }: Props) {
  const [signed, setSigned] = useState<{ path: string; uri: string | null; error: boolean } | null>(null);
  const markReceived = useDailyMediaStore((state) => state.markReceived);

  useEffect(() => {
    let current = true;
    if (!localUri && item) {
      void createSignedMediaUrl(item.storage_path)
        .then((uri) => { if (current) setSigned({ path: item.storage_path, uri, error: false }); })
        .catch(() => { if (current) setSigned({ path: item.storage_path, uri: null, error: true }); });
    }
    return () => { current = false; };
  }, [item, localUri]);

  const uri = localUri ?? (item && signed?.path === item.storage_path ? signed.uri : null);
  const error = !localUri && !!item && signed?.path === item.storage_path && signed.error;
  if (error) return <View style={styles.placeholder}><Text style={styles.error}>Couldn’t open this private photo.</Text></View>;
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
  photo: { width: '100%', aspectRatio: 4 / 5, borderRadius: 19, backgroundColor: editorial.paperTint },
  placeholder: { width: '100%', aspectRatio: 4 / 5, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: editorial.paperTint },
  loading: { color: editorial.inkSoft, fontFamily: momentsTypography.body, fontSize: 12 },
  error: { color: editorial.danger, fontFamily: momentsTypography.bodyBold, fontSize: 12, textAlign: 'center', padding: 20 },
});
