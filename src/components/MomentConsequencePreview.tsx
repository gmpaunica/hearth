import { StyleSheet, Text, View } from 'react-native';

import { consequenceFor, type MomentConsequence, type MomentPropType } from '@/moments/consequenceCatalog';
import { editorial, momentsTypography } from '@/theme/hearth';
import { VoxelMosaic } from './MomentVignette';

function PixelHeart() {
  return (
    <View style={styles.heart}>
      <View style={[styles.heartLobe, styles.heartLeft]} />
      <View style={[styles.heartLobe, styles.heartRight]} />
      <View style={styles.heartPoint} />
    </View>
  );
}

function PostcardProp({ prop, actionId }: { prop: MomentPropType | null; actionId: string }) {
  if (prop === 'rose') {
    return <View style={styles.rose}><View style={styles.roseBloom} /><View style={styles.roseStem} /><View style={styles.roseLeaf} /></View>;
  }
  if (prop === 'tea_tray') {
    return <View style={styles.tray}><View style={[styles.mug, { left: 19 }]} /><View style={[styles.mug, { right: 19, backgroundColor: '#D7C0E1' }]} /></View>;
  }
  if (prop === 'tiny_drawing') {
    return <View style={styles.doodle}><View style={styles.doodleSun} /><View style={styles.doodleGrass} /><View style={styles.doodleHeart}><PixelHeart /></View></View>;
  }
  if (prop === 'silly_visitor') {
    return <View style={styles.duck}><View style={styles.duckHead} /><View style={styles.duckEye} /><View style={styles.duckBill} /><View style={styles.duckBody} /></View>;
  }
  if (prop === 'second_mug' || prop === 'waiting_mug') {
    return <View style={styles.mugs}><View style={styles.bigMug} /><View style={[styles.bigMug, styles.secondMug]} /></View>;
  }
  if (prop === 'paired_lanterns') {
    return <View style={styles.lanterns}><View style={styles.lantern} /><View style={[styles.lantern, { backgroundColor: '#F1A3A3' }]} /></View>;
  }
  if (prop === 'folded_blanket') {
    return <View style={styles.blanket}><View style={styles.blanketStripe} /></View>;
  }
  if (prop === 'heart_cushion' || prop === 'hug_token' || actionId === 'send_hug' || actionId === 'rest_hug') {
    return <PixelHeart />;
  }
  if (actionId === 'hear_them_out' || actionId === 'come_sit' || actionId === 'talk_by_fire' || actionId === 'listen_by_fire' || actionId === 'join_fireplace') {
    return <View style={styles.fireInvitation}><View style={styles.smallFlame} /><View style={styles.openNote}><View style={styles.noteLine} /><View style={[styles.noteLine, { width: 30 }]} /></View></View>;
  }
  if (actionId === 'not_now' || actionId === 'kindly_decline') {
    return <View style={styles.pauseToken}><Text style={styles.pauseText}>a gentle pause</Text></View>;
  }
  if (prop === 'garden_departure') {
    return <View style={styles.arch}><View style={styles.archOpening} /><View style={styles.footstep} /><View style={[styles.footstep, { left: 52, top: 56 }]} /></View>;
  }
  return <View style={styles.softGlow}><PixelHeart /></View>;
}

function previewDescription(consequence: MomentConsequence): string {
  if (consequence.id === 'hear_them_out') {
    return 'Join them by the fire. This says the apology reached you; it does not mean everything is resolved.';
  }
  return consequence.consequence;
}

export function MomentConsequencePreview({ actionId }: { actionId: string }) {
  const consequence = consequenceFor(actionId);
  if (!consequence) return null;
  const description = previewDescription(consequence);
  return (
    <View
      accessible
      accessibilityLabel={`${consequence.title}. Preview: ${consequence.accessibleDescription}`}
      style={styles.card}
    >
      <View style={styles.postcard}>
        <VoxelMosaic destination={consequence.destination} />
        <View style={styles.wash} />
        <View style={styles.propSticker}>
          <PostcardProp prop={consequence.prop} actionId={consequence.id} />
        </View>
        <View style={styles.tape} />
      </View>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 14, overflow: 'hidden', borderRadius: 22, borderWidth: 2, borderColor: '#E2B29A', backgroundColor: '#FFF8EE' },
  postcard: { height: 154, overflow: 'hidden', backgroundColor: editorial.paperTint },
  wash: { position: 'absolute', inset: 0, backgroundColor: 'rgba(66, 43, 33, 0.14)' },
  propSticker: { position: 'absolute', alignSelf: 'center', top: 30, width: 124, height: 96, alignItems: 'center', justifyContent: 'center', borderRadius: 25, borderWidth: 4, borderColor: '#FFF8EE', backgroundColor: '#FBE7D9', transform: [{ rotate: '-2deg' }], shadowColor: '#3E241A', shadowOpacity: 0.24, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  tape: { position: 'absolute', top: 16, alignSelf: 'center', width: 54, height: 14, backgroundColor: 'rgba(255, 233, 178, 0.82)', transform: [{ rotate: '3deg' }] },
  description: { color: editorial.ink, fontFamily: momentsTypography.body, fontSize: 13, lineHeight: 19, textAlign: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  heart: { width: 64, height: 55 },
  heartLobe: { position: 'absolute', top: 5, width: 34, height: 34, borderRadius: 17, backgroundColor: '#EC7182' },
  heartLeft: { left: 4 },
  heartRight: { right: 4 },
  heartPoint: { position: 'absolute', left: 17, top: 22, width: 34, height: 34, backgroundColor: '#EC7182', transform: [{ rotate: '45deg' }] },
  rose: { width: 70, height: 78, alignItems: 'center' },
  roseBloom: { width: 36, height: 34, borderRadius: 18, backgroundColor: '#E66D7D', zIndex: 2 },
  roseStem: { width: 6, height: 49, backgroundColor: '#66805B', marginTop: -3, transform: [{ rotate: '8deg' }] },
  roseLeaf: { position: 'absolute', left: 34, top: 48, width: 22, height: 12, borderRadius: 12, backgroundColor: '#7F9A6E', transform: [{ rotate: '-25deg' }] },
  tray: { width: 94, height: 48, borderRadius: 12, backgroundColor: '#9B623B', borderBottomWidth: 7, borderColor: '#714129' },
  mug: { position: 'absolute', top: -16, width: 25, height: 32, borderRadius: 7, backgroundColor: '#FFF0D3', borderWidth: 3, borderColor: '#7A4B35' },
  doodle: { width: 76, height: 70, backgroundColor: '#FFF7DD', borderWidth: 4, borderColor: '#966A4E' },
  doodleSun: { position: 'absolute', top: 8, right: 9, width: 14, height: 14, borderRadius: 7, backgroundColor: '#F5C45D' },
  doodleGrass: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 18, backgroundColor: '#8FB176' },
  doodleHeart: { transform: [{ scale: 0.28 }], position: 'absolute', left: -3, top: 12 },
  duck: { width: 80, height: 72 },
  duckHead: { position: 'absolute', left: 37, top: 4, width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3C75B' },
  duckEye: { position: 'absolute', left: 56, top: 13, width: 5, height: 5, borderRadius: 3, backgroundColor: '#36231D', zIndex: 3 },
  duckBill: { position: 'absolute', right: 0, top: 20, width: 18, height: 8, borderRadius: 5, backgroundColor: '#E8793D', zIndex: 2 },
  duckBody: { position: 'absolute', left: 10, bottom: 4, width: 54, height: 38, borderRadius: 24, backgroundColor: '#F3C75B' },
  mugs: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  bigMug: { width: 36, height: 45, borderRadius: 8, borderWidth: 4, borderColor: '#7A4B35', backgroundColor: '#FFF0D3' },
  secondMug: { backgroundColor: '#D7C0E1' },
  lanterns: { flexDirection: 'row', gap: 16 },
  lantern: { width: 34, height: 58, borderRadius: 12, borderWidth: 4, borderColor: '#70483B', backgroundColor: '#FFC66D' },
  blanket: { width: 92, height: 58, borderRadius: 11, backgroundColor: '#D9C99D', borderWidth: 4, borderColor: '#80644C' },
  blanketStripe: { position: 'absolute', left: 0, right: 0, top: 21, height: 10, backgroundColor: '#E99791' },
  fireInvitation: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  smallFlame: { width: 38, height: 58, borderTopLeftRadius: 25, borderTopRightRadius: 4, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, backgroundColor: '#F08A42', transform: [{ rotate: '8deg' }] },
  openNote: { width: 58, height: 48, padding: 9, backgroundColor: '#FFF4DC', borderWidth: 3, borderColor: '#8E5D45', transform: [{ rotate: '4deg' }] },
  noteLine: { height: 4, width: 37, backgroundColor: '#C78570', marginBottom: 7 },
  pauseToken: { paddingHorizontal: 13, paddingVertical: 12, borderRadius: 18, borderWidth: 3, borderColor: '#AE806D', backgroundColor: '#FFF7E8' },
  pauseText: { color: editorial.ink, fontFamily: momentsTypography.bodyBold, fontSize: 13 },
  arch: { width: 78, height: 75, backgroundColor: '#8B5B3E', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 13 },
  archOpening: { flex: 1, borderTopLeftRadius: 25, borderTopRightRadius: 25, backgroundColor: '#84A970' },
  footstep: { position: 'absolute', left: 35, top: 44, width: 11, height: 17, borderRadius: 8, backgroundColor: '#F6E5C8', transform: [{ rotate: '-15deg' }] },
  softGlow: { width: 84, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 36, backgroundColor: '#FFDFA5' },
});
