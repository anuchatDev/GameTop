import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { PlayerView } from '../types';
import { Button } from './ui';

/**
 * ยืนยันว่ามีคนพูดคำต้องห้าม และเลือกว่าใครเป็นคนหลอกล่อ (ได้ Kill Score)
 */
export function KillModal({
  victim,
  players,
  busy,
  onConfirm,
  onClose,
}: {
  victim: PlayerView | null;
  players: PlayerView[];
  busy: boolean;
  onConfirm: (killerId: string | null) => void;
  onClose: () => void;
}) {
  const [killerId, setKillerId] = useState<string | null>(null);

  useEffect(() => setKillerId(null), [victim?.id]);

  const candidates = players.filter((p) => p.id !== victim?.id);

  return (
    <Modal visible={victim !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>😱 {victim?.name} พูดคำต้องห้าม!</Text>
          <Text style={styles.subtitle}>ใครเป็นคนหลอกล่อ?</Text>
          <View style={styles.options}>
            {candidates.map((p) => (
              <Option key={p.id} label={p.name} selected={killerId === p.id} onPress={() => setKillerId(p.id)} />
            ))}
            <Option label="ไม่มีใคร (พูดเอง)" selected={killerId === null} onPress={() => setKillerId(null)} />
          </View>
          <Button title="ยืนยัน ตกรอบ!" variant="danger" loading={busy} onPress={() => onConfirm(killerId)} />
          <Button title="ยกเลิก" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.option, selected && styles.optionSelected]}>
      <Text style={[styles.optionText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.bg, borderRadius: 24, padding: 20, gap: 12, borderWidth: 3, borderColor: colors.text },
  title: { fontSize: 22, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.muted, textAlign: 'center' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.card,
  },
  optionSelected: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  optionText: { fontSize: 16, fontWeight: '700', color: colors.text },
});
