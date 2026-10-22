import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, textOn } from '../theme';
import { useResponsive } from '../responsive';
import { PlayerView } from '../types';

/**
 * การ์ดคำบนหัวผู้เล่น — ตัวหนังสือหนาและใหญ่ อ่านได้จากระยะ 1-2 เมตร
 */
export function WordCard({
  player,
  color,
  isYou,
  onPress,
  width,
}: {
  player: PlayerView;
  color: string;
  isYou: boolean;
  onPress?: () => void;
  /** ความกว้างช่องในกริด (คำนวณจากขนาดจอ) */
  width: number;
}) {
  const out = !player.alive;
  const bg = out ? colors.disabled : color;
  const ink = textOn(bg);
  const { fs } = useResponsive();
  const word = isYou ? '???' : player.word ?? '-';
  // เว็บไม่รองรับ adjustsFontSizeToFit — ย่อตัวอักษรตามความยาวคำแทน กันคำยาวล้นการ์ด
  const wordSize = fs(word.length > 10 ? 26 : word.length > 6 ? 32 : 40);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${player.name}${isYou ? ' (คุณ) คำของคุณถูกซ่อน' : ` คำว่า ${player.word ?? ''}`}${out ? ' ตกรอบแล้ว' : ''}${onPress ? ' — แตะเมื่อพูดคำต้องห้าม' : ''}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: bg, width },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.name, { color: ink }]} numberOfLines={1}>
        {player.name}
        {isYou ? ' (คุณ)' : ''}
      </Text>
      <View style={styles.wordBox}>
        <Text style={[styles.word, { fontSize: wordSize }]} adjustsFontSizeToFit numberOfLines={2}>
          {word}
        </Text>
      </View>
      <Text style={[styles.footer, { color: ink }]}>
        {out ? '💀 ตกรอบ' : player.kills > 0 ? `🎯 Kill ${player.kills}` : ' '}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 12,
    borderWidth: 3,
    borderColor: colors.text,
    gap: 6,
  },
  name: { fontWeight: '800', fontSize: 16 },
  wordBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  word: { fontWeight: '900', color: colors.text, textAlign: 'center' },
  footer: { fontWeight: '700', fontSize: 14 },
});
