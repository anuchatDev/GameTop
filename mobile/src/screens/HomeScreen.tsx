import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../api/client';
import { Button, Card, ErrorText, Input, Muted, Screen } from '../components/ui';
import { colors } from '../theme';
import { Session } from '../types';

export function HomeScreen({ onJoined, onOpenTimer }: { onJoined: (s: Session) => void; onOpenTimer: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();

  async function handle(kind: 'create' | 'join') {
    if (!trimmedName) {
      setError('กรอกชื่อก่อนนะ');
      return;
    }
    setBusy(kind);
    setError(null);
    try {
      const res = kind === 'create' ? await api.createRoom(trimmedName) : await api.joinRoom(code, trimmedName);
      onJoined(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.logo}>🤐</Text>
        <Text style={styles.brand}>คำต้องห้าม</Text>
        <Muted>เกมปาร์ตี้ บลัฟ หลอกล่อ ให้เพื่อนหลุดปาก!</Muted>
      </View>

      <Input placeholder="ชื่อของคุณ" value={name} onChangeText={setName} maxLength={20} />
      <Button title="สร้างห้องใหม่" onPress={() => handle('create')} loading={busy === 'create'} disabled={busy !== null} />

      <View style={styles.row}>
        <Input
          placeholder="รหัสห้อง"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          maxLength={4}
          style={{ flex: 1, letterSpacing: 4, fontWeight: '800' }}
        />
        <Button
          title="เข้าห้อง"
          variant="secondary"
          onPress={() => handle('join')}
          loading={busy === 'join'}
          disabled={busy !== null || code.trim().length !== 4}
        />
      </View>

      <ErrorText message={error} />

      <Button title="⏳ ใช้เป็นนาฬิกาจับเวลาอย่างเดียว" variant="ghost" onPress={onOpenTimer} />

      <Card>
        <Text style={styles.rulesTitle}>กติกาใน 1 นาที</Text>
        <Text style={styles.rule}>• ทุกคนได้คำบนหัว เห็นของคนอื่น แต่ไม่เห็นของตัวเอง</Text>
        <Text style={styles.rule}>• พูดคำบนหัวตัวเอง = ตกรอบทันที 💀</Text>
        <Text style={styles.rule}>• หลอกให้คนอื่นพูดได้ = Kill Score +1 🎯</Text>
        <Text style={styles.rule}>• รอดครบ 5 นาที = 0.5 คะแนน</Text>
        <Text style={styles.rule}>• รอด + ทายคำบนหัวตัวเองถูก = 1 คะแนน 🏆</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4, marginBottom: 8 },
  logo: { fontSize: 72 },
  brand: { fontSize: 40, fontWeight: '900', color: colors.primary },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  rulesTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 6 },
  rule: { fontSize: 15, color: colors.text, lineHeight: 24 },
});
