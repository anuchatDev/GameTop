import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Muted, Title } from '../../components/ui';
import { didWin, outcomeInfo, roleInfo } from '../../insider/roles';
import { colors } from '../../theme';
import { InProps } from './InsiderScreen';

/** สรุปผล: ฝั่งที่ชนะ, คำปริศนา, ใครคือ Insider, คะแนนโหวต */
export function InResult({ room, isHost, busy, actions, onLeave }: InProps) {
  const result = room.result!;
  const info = outcomeInfo[result.outcome];
  const nameOf = (id: string | null) => room.players.find((p) => p.id === id)?.name ?? '?';
  const won = didWin(result.outcome, room.me.role);

  return (
    <>
      <Title>🏁 สรุปผล</Title>
      <View style={[styles.banner, { backgroundColor: info.bg }]}>
        <Text style={styles.bannerText}>{info.title}</Text>
        <Text style={styles.bannerSub}>คำปริศนาคือ "{result.word}"</Text>
        <Text style={styles.bannerSub}>🕵️ Insider คือ {nameOf(result.insiderId)}</Text>
        <Text style={styles.bannerSub}>{won ? '🎉 คุณชนะ!' : '😢 คุณแพ้'}</Text>
      </View>

      {room.players.map((p) => {
        const role = p.role ? roleInfo[p.role] : null;
        return (
          <Card key={p.id} style={{ gap: 2 }}>
            <Text style={styles.name}>
              {p.name}
              {p.id === room.guesserId ? '  🎯' : ''}
            </Text>
            {role && (
              <Text style={[styles.role, { color: role.color }]}>
                {role.emoji} {role.name}
              </Text>
            )}
            {result.outcome !== 'ALL_LOSE' && !p.master && (
              <Muted style={{ fontSize: 13 }}>
                โหวต: {p.vote ? nameOf(p.vote) : 'ไม่ได้โหวต'} · ได้ {result.voteCounts[p.id] ?? 0} เสียง
              </Muted>
            )}
          </Card>
        );
      })}

      {isHost ? (
        <Button title="🔄 เล่นอีกตา" variant="success" loading={busy} onPress={actions.again} />
      ) : (
        <Muted style={{ textAlign: 'center' }}>รอเจ้าของห้องเริ่มตาใหม่...</Muted>
      )}
      <Button title="ออกจากห้อง" variant="ghost" onPress={onLeave} />
    </>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 20, padding: 18, alignItems: 'center', gap: 6, borderWidth: 3, borderColor: colors.text },
  bannerText: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center' },
  bannerSub: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },
  name: { fontSize: 18, fontWeight: '900', color: colors.text },
  role: { fontSize: 16, fontWeight: '800' },
});
