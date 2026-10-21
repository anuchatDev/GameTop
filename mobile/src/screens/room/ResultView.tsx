import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../../api/client';
import { Button, Card, Muted, Title } from '../../components/ui';
import { colors, formatScore } from '../../theme';
import { PlayerView } from '../../types';
import { RoomViewProps } from '../RoomScreen';

export function ResultView({ room, isHost, busy, run, onLeave }: RoomViewProps) {
  const nameOf = (id: string | null) => room.players.find((p) => p.id === id)?.name;
  const leaderboard = [...room.players].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <>
      <Title>🏁 สรุปรอบที่ {room.roundNumber}</Title>

      {room.players.map((p) => (
        <Card key={p.id} style={styles.result}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.name}>{p.name}</Text>
            <Text style={styles.word}>คำ: {p.word}</Text>
            <Text style={styles.detail}>{describe(p, nameOf)}</Text>
          </View>
          <Text style={styles.points}>+{formatScore(p.roundScore)}</Text>
        </Card>
      ))}

      <Text style={styles.section}>🏆 คะแนนรวม</Text>
      {leaderboard.map((p, i) => (
        <View key={p.id} style={styles.row}>
          <Text style={styles.rank}>
            {['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} {p.name}
          </Text>
          <Text style={styles.total}>{formatScore(p.totalScore)}</Text>
        </View>
      ))}

      {isHost ? (
        <Button title="เล่นรอบต่อไป" variant="success" loading={busy} onPress={() => run(api.startRound)} />
      ) : (
        <Muted style={{ textAlign: 'center' }}>รอเจ้าของห้องเริ่มรอบใหม่...</Muted>
      )}
      <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />
    </>
  );
}

function describe(p: PlayerView, nameOf: (id: string | null) => string | undefined): string {
  const parts: string[] = [];
  if (!p.alive) {
    const killer = nameOf(p.eliminatedById);
    parts.push(killer ? `💀 โดน ${killer} หลอก` : '💀 หลุดปากเอง');
  } else if (p.guessCorrect) {
    parts.push(`✅ รอด + ทายถูก`);
  } else {
    parts.push(p.guess ? `🛡️ รอด (ทายว่า "${p.guess}")` : '🛡️ รอด (ไม่ได้ทาย)');
  }
  if (p.kills > 0) parts.push(`🎯 Kill ${p.kills}`);
  return parts.join('  ·  ');
}

const styles = StyleSheet.create({
  result: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 18, fontWeight: '900', color: colors.text },
  word: { fontSize: 16, fontWeight: '700', color: colors.primary },
  detail: { fontSize: 14, color: colors.muted },
  points: { fontSize: 28, fontWeight: '900', color: colors.success },
  section: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rank: { fontSize: 18, fontWeight: '700', color: colors.text },
  total: { fontSize: 18, fontWeight: '900', color: colors.text },
});
