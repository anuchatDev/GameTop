import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../api/client';
import { Button, Card, ErrorText, Input, Muted, Screen } from '../components/ui';
import { colors } from '../theme';
import { AuthSession } from '../types';

export function HomeScreen({
  auth,
  onEnterRoom,
  onOpenProfile,
  onOpenRandom,
  onOpenCategories,
  onOpenAdmin,
  onOpenTimer,
  onLogout,
}: {
  auth: AuthSession;
  onEnterRoom: (code: string) => void;
  onOpenProfile: () => void;
  onOpenRandom: () => void;
  onOpenCategories: () => void;
  onOpenAdmin: () => void;
  onOpenTimer: () => void;
  onLogout: () => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(kind: 'create' | 'join') {
    setBusy(kind);
    setError(null);
    try {
      const room = kind === 'create' ? await api.createRoom(auth) : await api.joinRoom(auth, code);
      onEnterRoom(room.code);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <View style={styles.topBar}>
        <Text style={styles.hello}>สวัสดี, {auth.user.username} 👋</Text>
        <Button title="ออกจากระบบ" variant="ghost" onPress={onLogout} style={styles.smallButton} />
      </View>

      <View style={styles.hero}>
        <Text style={styles.logo}>🤐</Text>
        <Text style={styles.brand}>คำต้องห้าม</Text>
      </View>

      <Button title="สร้างห้องใหม่" onPress={() => handle('create')} loading={busy === 'create'} disabled={busy !== null} />

      <View style={styles.row}>
        <Input
          placeholder="รหัสห้อง"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
          style={{ flex: 1, letterSpacing: 4, fontWeight: '800' }}
        />
        <Button
          title="เข้าห้อง"
          variant="secondary"
          onPress={() => handle('join')}
          loading={busy === 'join'}
          disabled={busy !== null || code.trim().length < 4}
        />
      </View>

      <ErrorText message={error} />

      <View style={styles.row}>
        <Button title="🎲 สุ่มคำ" variant="secondary" onPress={onOpenRandom} style={{ flex: 1 }} />
        <Button title="📚 หมวดของฉัน" variant="secondary" onPress={onOpenCategories} style={{ flex: 1 }} />
      </View>
      <Button title="🏆 โปรไฟล์ & คะแนนสะสม" variant="success" onPress={onOpenProfile} />
      {auth.user.role === 'ADMIN' && <Button title="🛠️ ระบบผู้ดูแล (Admin)" variant="secondary" onPress={onOpenAdmin} />}
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  hello: { fontSize: 18, fontWeight: '800', color: colors.text, flexShrink: 1 },
  smallButton: { paddingVertical: 8, paddingHorizontal: 12 },
  hero: { alignItems: 'center', gap: 4, marginBottom: 8 },
  logo: { fontSize: 64 },
  brand: { fontSize: 40, fontWeight: '900', color: colors.primary },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  rulesTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 6 },
  rule: { fontSize: 15, color: colors.text, lineHeight: 24 },
});
