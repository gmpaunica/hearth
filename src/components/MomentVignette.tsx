import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MomentDestination } from '@/lib/db';
import { momentsTypography } from '@/theme/hearth';

type Run = readonly [start: number, length: number, color: string];
type Mosaic = { rows: Run[][]; colors: Record<string, string>; background: string };
const row = (...runs: Run[]) => runs;

/** 40×18 horizontal color runs keep each banner richly pixel-built while
 * mounting only the visible shapes rather than 720 individual React views. */
export const MOMENT_MOSAICS: Record<MomentDestination, Mosaic> = {
  fireplace: {
    background: '#D7B58F',
    colors: { brick: '#A64F38', dark: '#6A352B', mortar: '#D19A76', cocoa: '#442820', stone: '#E3C9A2', flame: '#F47A32', gold: '#FFC55C', cream: '#FFF0C7', chair: '#87503A', sage: '#74825C' },
    rows: [
      row([0, 40, 'mortar']), row([0, 40, 'mortar']),
      row([4, 3, 'sage'], [7, 2, 'cream'], [14, 12, 'brick'], [33, 3, 'cream']),
      row([3, 5, 'dark'], [13, 14, 'brick'], [32, 5, 'dark']),
      row([12, 16, 'brick']), row([11, 18, 'dark']),
      row([9, 22, 'cocoa']), row([8, 24, 'stone']),
      row([10, 4, 'brick'], [14, 12, 'cocoa'], [26, 4, 'brick']),
      row([9, 5, 'brick'], [15, 10, 'cocoa'], [26, 5, 'brick']),
      row([5, 5, 'chair'], [10, 4, 'brick'], [17, 2, 'gold'], [21, 2, 'flame'], [26, 4, 'brick'], [31, 5, 'chair']),
      row([4, 7, 'chair'], [10, 4, 'brick'], [16, 3, 'flame'], [19, 3, 'cream'], [22, 3, 'flame'], [26, 4, 'brick'], [30, 7, 'chair']),
      row([4, 7, 'dark'], [9, 6, 'stone'], [16, 9, 'gold'], [25, 6, 'stone'], [30, 7, 'dark']),
      row([5, 5, 'chair'], [7, 4, 'cocoa'], [14, 13, 'cocoa'], [29, 4, 'cocoa'], [31, 5, 'chair']),
      row([6, 4, 'cocoa'], [13, 15, 'stone'], [31, 3, 'dark']),
      row([2, 7, 'dark'], [3, 5, 'chair'], [12, 17, 'cocoa'], [31, 7, 'dark']),
      row([1, 8, 'cocoa'], [11, 19, 'dark'], [32, 7, 'cocoa']),
      row([0, 40, 'dark']),
    ],
  },
  garden: {
    background: '#BFD39C',
    colors: { sky: '#DCE5B8', hedge: '#607C50', leaf: '#78965B', deep: '#456548', bloom: '#E77E88', gold: '#F2C55D', wood: '#7E4D31', path: '#D9C39B', pond: '#6EA6A1', water: '#98C9BB', koi: '#F28A46' },
    rows: [
      row([0, 40, 'sky']), row([0, 40, 'sky']),
      row([2, 6, 'leaf'], [12, 4, 'hedge'], [23, 7, 'leaf'], [34, 4, 'hedge']),
      row([0, 9, 'hedge'], [10, 8, 'leaf'], [21, 12, 'hedge'], [34, 6, 'leaf']),
      row([0, 40, 'deep']), row([0, 40, 'hedge']),
      row([2, 2, 'bloom'], [7, 2, 'gold'], [11, 9, 'leaf'], [27, 2, 'bloom'], [34, 2, 'gold']),
      row([0, 8, 'leaf'], [10, 11, 'hedge'], [25, 15, 'leaf']),
      row([3, 12, 'wood'], [6, 6, 'path'], [24, 14, 'pond']),
      row([4, 10, 'wood'], [6, 8, 'path'], [23, 15, 'water']),
      row([5, 2, 'wood'], [12, 2, 'wood'], [8, 9, 'path'], [24, 4, 'pond'], [29, 3, 'koi'], [32, 5, 'pond']),
      row([5, 2, 'wood'], [12, 2, 'wood'], [10, 10, 'path'], [23, 15, 'pond']),
      row([12, 10, 'path'], [25, 4, 'water'], [31, 2, 'koi'], [33, 4, 'water']),
      row([14, 10, 'path'], [24, 14, 'deep']),
      row([2, 2, 'bloom'], [8, 2, 'gold'], [16, 10, 'path'], [30, 2, 'bloom']),
      row([0, 10, 'leaf'], [18, 10, 'path'], [31, 9, 'hedge']),
      row([0, 13, 'deep'], [20, 10, 'path'], [34, 6, 'deep']),
      row([0, 40, 'hedge']),
    ],
  },
  sofa: {
    background: '#E7BEA2',
    colors: { wall: '#F2D3BB', frame: '#6D4432', lamp: '#F3C86E', stem: '#704832', sofa: '#CE6B59', deep: '#93493F', blush: '#EFA09A', cream: '#F4DEB5', rug: '#C99E78', tea: '#8D5938' },
    rows: [
      row([0, 40, 'wall']), row([0, 40, 'wall']),
      row([5, 8, 'frame'], [28, 7, 'lamp']), row([6, 6, 'cream'], [27, 9, 'lamp']),
      row([5, 8, 'frame'], [31, 2, 'stem']), row([31, 2, 'stem']),
      row([7, 26, 'deep'], [31, 2, 'stem']), row([5, 30, 'sofa'], [30, 4, 'lamp']),
      row([4, 32, 'sofa'], [8, 7, 'cream'], [17, 6, 'blush'], [25, 7, 'cream']),
      row([3, 34, 'sofa'], [9, 5, 'deep'], [18, 5, 'blush'], [26, 5, 'deep']),
      row([3, 34, 'sofa']), row([2, 36, 'deep']),
      row([4, 5, 'deep'], [31, 5, 'deep'], [15, 10, 'rug']),
      row([5, 3, 'frame'], [32, 3, 'frame'], [10, 20, 'rug']),
      row([8, 24, 'rug'], [27, 3, 'tea']), row([7, 26, 'rug'], [26, 5, 'tea']),
      row([5, 30, 'rug']), row([0, 40, 'frame']),
    ],
  },
  table: {
    background: '#D9C5AA',
    colors: { wall: '#E9D8BF', window: '#C8DCE0', light: '#FFF2C9', wood: '#825337', dark: '#51372A', top: '#A66B45', mugA: '#F2DFC0', mugB: '#C9B9D6', flower: '#D97875', leaf: '#71885D', floor: '#B99470' },
    rows: [
      row([0, 40, 'wall']), row([23, 14, 'dark']),
      row([24, 12, 'window']), row([24, 5, 'light'], [30, 6, 'window']),
      row([24, 12, 'window']), row([24, 12, 'light']),
      row([7, 5, 'dark'], [28, 2, 'flower'], [31, 2, 'flower']),
      row([6, 7, 'wood'], [29, 3, 'leaf']),
      row([5, 9, 'wood'], [15, 4, 'mugA'], [22, 4, 'mugB'], [29, 3, 'leaf']),
      row([4, 32, 'top']), row([6, 28, 'wood']),
      row([7, 4, 'dark'], [29, 4, 'dark']),
      row([7, 4, 'wood'], [29, 4, 'wood']),
      row([5, 7, 'dark'], [28, 7, 'dark']),
      row([4, 9, 'wood'], [27, 9, 'wood']),
      row([9, 3, 'wood'], [19, 3, 'wood'], [29, 3, 'wood']),
      row([0, 40, 'floor']), row([0, 40, 'dark']),
    ],
  },
  rest: {
    background: '#CFC5B1',
    colors: { wall: '#DDD4C2', window: '#70818C', moon: '#F6EBC2', shelf: '#725343', book: '#B86F5C', sage: '#7E8C69', bed: '#B99E82', quilt: '#D8C696', patch: '#E9DDB8', lamp: '#E7B868', dark: '#4A3931' },
    rows: [
      row([0, 40, 'wall']), row([0, 40, 'wall']),
      row([4, 11, 'window'], [27, 9, 'shelf']),
      row([5, 9, 'window'], [8, 3, 'moon'], [27, 3, 'book'], [31, 2, 'sage'], [34, 2, 'book']),
      row([5, 9, 'window'], [27, 9, 'shelf']),
      row([4, 11, 'dark'], [29, 5, 'lamp']), row([31, 2, 'dark']),
      row([9, 25, 'dark'], [31, 2, 'dark']), row([7, 29, 'bed'], [29, 6, 'lamp']),
      row([6, 31, 'quilt'], [10, 5, 'patch'], [18, 6, 'sage'], [27, 6, 'patch']),
      row([5, 32, 'quilt'], [11, 5, 'book'], [19, 5, 'patch'], [28, 5, 'sage']),
      row([5, 32, 'quilt']), row([5, 32, 'bed']),
      row([7, 3, 'dark'], [32, 3, 'dark']), row([6, 4, 'dark'], [31, 4, 'dark']),
      row([3, 7, 'shelf'], [13, 4, 'book'], [18, 3, 'sage'], [23, 4, 'book']),
      row([2, 8, 'dark'], [12, 17, 'shelf']), row([0, 40, 'dark']),
    ],
  },
  romantic: {
    background: '#725469',
    colors: { night: '#40384F', wall: '#806076', moon: '#FFF0B5', window: '#52627A', bed: '#D38C91', deep: '#9C5D70', linen: '#F0D3C5', wood: '#51372F', lantern: '#FFC66D', heart: '#EF8A9B', rug: '#A77A88' },
    rows: [
      row([0, 40, 'night']), row([0, 40, 'wall']),
      row([4, 10, 'window'], [8, 3, 'moon'], [29, 3, 'lantern']),
      row([4, 10, 'window'], [28, 5, 'lantern']), row([4, 10, 'window'], [29, 3, 'wood']),
      row([4, 10, 'night'], [7, 2, 'heart'], [10, 2, 'heart']),
      row([3, 12, 'wood'], [5, 4, 'heart'], [9, 4, 'heart']),
      row([2, 8, 'wood'], [30, 8, 'wood']),
      row([2, 8, 'lantern'], [12, 16, 'deep'], [30, 8, 'lantern']),
      row([4, 4, 'wood'], [10, 20, 'bed'], [32, 4, 'wood']),
      row([9, 22, 'bed'], [13, 6, 'linen'], [21, 6, 'linen']),
      row([8, 24, 'linen'], [14, 4, 'heart'], [22, 4, 'heart']),
      row([8, 24, 'linen']), row([7, 26, 'bed']),
      row([7, 26, 'deep']), row([10, 20, 'rug']),
      row([7, 26, 'rug']), row([0, 40, 'night']),
    ],
  },
};

export function VoxelMosaic({ destination }: { destination: MomentDestination }) {
  const mosaic = MOMENT_MOSAICS[destination];
  return (
    <View accessible accessibilityLabel={`${destination} detailed pixel mosaic`} style={[styles.mosaic, { backgroundColor: mosaic.background }]}>
      {mosaic.rows.map((runs, rowIndex) => (
        <View key={`${destination}-${rowIndex}`} style={styles.pixelRow}>
          {runs.map(([start, length, color], runIndex) => (
            <View key={runIndex} style={{ position: 'absolute', top: 0, bottom: 0, left: `${start * 2.5}%`, width: `${length * 2.5}%`, backgroundColor: mosaic.colors[color] }} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function MomentVignette({ destination }: { destination: MomentDestination }) {
  return <View style={styles.frame}><VoxelMosaic destination={destination} /></View>;
}

export function MomentFeelingBanner({ destination, title, location, onPress }: {
  destination: MomentDestination;
  title: string;
  location: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${location}.`} onPress={onPress} style={({ pressed }) => [styles.banner, pressed && styles.pressed]}>
      <VoxelMosaic destination={destination} />
      <View style={styles.lowerScrim} />
      <View style={styles.bannerCopy}>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={styles.bannerLocation}>{location}</Text>
      </View>
    </Pressable>
  );
}

const WHITE_SHADOW = { textShadowColor: '#2A1712', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 } as const;
const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 40 / 18, overflow: 'hidden', borderRadius: 8 },
  mosaic: { position: 'absolute', inset: 0, overflow: 'hidden' },
  pixelRow: { flex: 1 },
  banner: { height: 118, marginBottom: 11, overflow: 'hidden', justifyContent: 'flex-end', borderRadius: 20, borderWidth: 2, borderColor: '#E2B29A' },
  lowerScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 55, backgroundColor: 'rgba(49, 27, 21, 0.86)' },
  bannerCopy: { paddingHorizontal: 12, paddingVertical: 8 },
  bannerTitle: { color: '#FFFFFF', fontFamily: momentsTypography.heading, fontSize: 17, lineHeight: 20, ...WHITE_SHADOW },
  bannerLocation: { color: '#FFFFFF', fontFamily: momentsTypography.bodyBold, fontSize: 10, marginTop: 2, ...WHITE_SHADOW },
  pressed: { opacity: 0.78 },
});
