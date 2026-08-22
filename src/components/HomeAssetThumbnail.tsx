import { StyleSheet, View } from 'react-native';

import type { HomeAssetDefinition } from '@/home/types';

const COLORS = {
  cocoa: '#684739',
  cocoaDark: '#4a332b',
  clay: '#b9674d',
  clayLight: '#dc9277',
  cream: '#fff3d8',
  gold: '#e6b95e',
  sage: '#78926f',
  sageLight: '#a9bd8e',
  water: '#77b9c2',
  blush: '#e8a5aa',
};

function Furniture({ asset }: { asset: HomeAssetDefinition }) {
  const tall = ['storage', 'lighting'].includes(asset.category);
  const wide = Math.min(76, Math.max(42, asset.footprint.width * 22));
  return (
    <>
      <View style={[styles.shadow, { width: wide + 12 }]} />
      {tall ? (
        <>
          <View style={[styles.voxel, styles.tallBody, { width: wide }]} />
          <View style={[styles.voxel, styles.tallInset, { width: Math.max(24, wide - 14) }]} />
          <View style={[styles.voxel, styles.tallTop, { width: wide + 6 }]} />
        </>
      ) : (
        <>
          <View style={[styles.voxel, styles.furnitureBack, { width: wide }]} />
          <View style={[styles.voxel, styles.furnitureSeat, { width: wide + 8 }]} />
          <View style={[styles.voxel, styles.furnitureLeg, { left: 33 }]} />
          <View style={[styles.voxel, styles.furnitureLeg, { right: 33 }]} />
          {['seating', 'rest', 'bed'].includes(asset.category) && (
            <View style={[styles.voxel, styles.cushion]} />
          )}
        </>
      )}
    </>
  );
}

function Nature({ asset }: { asset: HomeAssetDefinition }) {
  const water = asset.category === 'water' || asset.id.includes('pond') || asset.id.includes('fountain');
  const tree = asset.category === 'tree' || asset.id.includes('tree') || asset.id === 'willow';
  if (water) {
    return (
      <>
        <View style={[styles.voxel, styles.pondStone]} />
        <View style={[styles.voxel, styles.pondWater]} />
        <View style={[styles.voxel, styles.pondGlint]} />
      </>
    );
  }
  if (tree) {
    return (
      <>
        <View style={[styles.voxel, styles.trunk]} />
        <View style={[styles.voxel, styles.canopy, styles.canopyLeft]} />
        <View style={[styles.voxel, styles.canopy, styles.canopyRight]} />
        <View style={[styles.voxel, styles.canopy, styles.canopyTop]} />
        <View style={[styles.voxel, styles.blossom]} />
      </>
    );
  }
  return (
    <>
      <View style={[styles.voxel, styles.planter]} />
      <View style={[styles.voxel, styles.stem]} />
      <View style={[styles.voxel, styles.leaf, { left: 42 }]} />
      <View style={[styles.voxel, styles.leaf, { right: 42 }]} />
      <View style={[styles.voxel, styles.flower]} />
    </>
  );
}

function Structure({ asset }: { asset: HomeAssetDefinition }) {
  const path = asset.category === 'path' || asset.id.includes('path') || asset.id.includes('tile');
  if (path) {
    return (
      <>
        <View style={[styles.voxel, styles.pathTile, { left: 26, top: 54 }]} />
        <View style={[styles.voxel, styles.pathTile, { left: 49, top: 43 }]} />
        <View style={[styles.voxel, styles.pathTile, { left: 72, top: 32 }]} />
      </>
    );
  }
  return (
    <>
      <View style={[styles.voxel, styles.structureBody]} />
      <View style={[styles.voxel, styles.structureRoof]} />
      <View style={[styles.voxel, styles.structureDoor]} />
      <View style={[styles.voxel, styles.structureGlow]} />
    </>
  );
}

export function HomeAssetThumbnail({ asset }: { asset: HomeAssetDefinition }) {
  const nature = asset.compatibleRooms.includes('garden')
    && ['tree', 'planting', 'plant', 'foliage', 'flower', 'water'].includes(asset.category)
    || asset.id.includes('pond');
  const structure = ['fireplace', 'portal', 'structure', 'path', 'border'].includes(asset.category)
    || asset.id.includes('path') || asset.id.includes('tile');
  return (
    <View
      style={styles.canvas}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${asset.id.replaceAll('-', ' ')} preview`}
    >
      <View style={styles.sky} />
      <View style={styles.ground} />
      {nature ? <Nature asset={asset} /> : structure ? <Structure asset={asset} /> : <Furniture asset={asset} />}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    height: 90,
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 16,
    backgroundColor: '#f7dfc8',
  },
  sky: { position: 'absolute', top: 0, right: 0, bottom: 25, left: 0, backgroundColor: '#f8e7d5' },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 30, backgroundColor: '#d8c69c' },
  voxel: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(74,51,43,0.14)' },
  shadow: { position: 'absolute', height: 9, borderRadius: 5, left: '50%', marginLeft: -38, bottom: 15, backgroundColor: 'rgba(74,51,43,0.13)', transform: [{ skewX: '-24deg' }] },
  tallBody: { height: 52, left: '50%', marginLeft: -30, bottom: 21, backgroundColor: COLORS.cocoa },
  tallInset: { height: 34, left: '50%', marginLeft: -23, bottom: 28, backgroundColor: COLORS.clayLight },
  tallTop: { height: 9, left: '50%', marginLeft: -33, bottom: 69, backgroundColor: COLORS.cocoaDark },
  furnitureBack: { height: 28, left: '50%', marginLeft: -28, bottom: 38, backgroundColor: COLORS.clay },
  furnitureSeat: { height: 16, left: '50%', marginLeft: -32, bottom: 24, backgroundColor: COLORS.clayLight },
  furnitureLeg: { width: 8, height: 14, bottom: 13, backgroundColor: COLORS.cocoaDark },
  cushion: { width: 28, height: 15, left: '50%', marginLeft: -14, bottom: 43, backgroundColor: COLORS.cream },
  planter: { width: 34, height: 22, left: '50%', marginLeft: -17, bottom: 17, backgroundColor: COLORS.clay },
  stem: { width: 8, height: 34, left: '50%', marginLeft: -4, bottom: 37, backgroundColor: COLORS.sage },
  leaf: { width: 22, height: 14, bottom: 43, backgroundColor: COLORS.sageLight },
  flower: { width: 20, height: 17, left: '50%', marginLeft: -10, bottom: 65, backgroundColor: COLORS.blush },
  trunk: { width: 16, height: 43, left: '50%', marginLeft: -8, bottom: 15, backgroundColor: COLORS.cocoa },
  canopy: { width: 42, height: 32, backgroundColor: COLORS.sage },
  canopyLeft: { left: 27, bottom: 42 },
  canopyRight: { right: 27, bottom: 42 },
  canopyTop: { left: '50%', marginLeft: -21, bottom: 60, backgroundColor: COLORS.sageLight },
  blossom: { width: 16, height: 13, right: 38, bottom: 62, backgroundColor: COLORS.blush },
  pondStone: { width: 94, height: 40, left: '50%', marginLeft: -47, bottom: 16, backgroundColor: '#b9a783', transform: [{ skewX: '-12deg' }] },
  pondWater: { width: 74, height: 25, left: '50%', marginLeft: -37, bottom: 23, backgroundColor: COLORS.water, transform: [{ skewX: '-12deg' }] },
  pondGlint: { width: 28, height: 5, left: 58, bottom: 34, backgroundColor: COLORS.cream },
  pathTile: { width: 30, height: 20, backgroundColor: '#c7ad83', transform: [{ skewX: '-22deg' }] },
  structureBody: { width: 72, height: 48, left: '50%', marginLeft: -36, bottom: 14, backgroundColor: COLORS.clay },
  structureRoof: { width: 88, height: 14, left: '50%', marginLeft: -44, bottom: 60, backgroundColor: COLORS.cocoaDark },
  structureDoor: { width: 24, height: 34, left: '50%', marginLeft: -12, bottom: 14, backgroundColor: COLORS.cocoa },
  structureGlow: { width: 12, height: 17, left: '50%', marginLeft: -6, bottom: 25, backgroundColor: COLORS.gold },
});
