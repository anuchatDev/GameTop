import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { PlayerView } from '../types';

/**
 * การ์ดคำบนหัวผู้เล่น — ตัวหนังสือหนาและใหญ่ อ่านได้จากระยะ 1-2 เมตร
 */
export function WordCard({
  player,
  color,
  isYou,
  onPress,
}: {
  player: PlayerView;
  color: string;
  isYou: boolean;
  onPress?: () => void;
}) {
  const out = !player.alive;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: out ? colors.disabled : color },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={styles.name} numberOfLines={1}>
        {player.name}
        {isYou ? ' (คุณ)' : ''}
      </Text>
      <View style={styles.wordBox}>
        <Text style={styles.word} adjustsFontSizeToFit numberOfLines={1}>
          {isYou ? '???' : player.word ?? '-'}
        </Text>
      </View>
      <Text style={styles.footer}>
        {out ? '💀 ตกรอบ' : player.kills > 0 ? `🎯 Kill ${player.kills}` : ' '}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 20,
    padding: 12,
    borderWidth: 3,
    borderColor: colors.text,
    gap: 6,
  },
  name: { color: '#fff', fontWeight: '800', fontSize: 16 },
  wordBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  word: { fontSize: 40, fontWeight: '900', color: colors.text },
  footer: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
